import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  Course,
  CourseAvailability,
  CourseRoster,
  EmployeeSummary,
  RegistrationResult,
  RegistrationSource,
  RegistrationStatus,
  RosterEntry,
  TrainingCycle,
} from '@toma/shared';
import {
  CourseAvailability as CourseAvailabilitySchema,
  CourseRoster as CourseRosterSchema,
} from '@toma/shared';
import { CoursesRepository } from '../courses/courses.repository.js';
import { CyclesRepository } from '../cycles/cycles.repository.js';
import { EmployeesRepository } from '../employees/employees.repository.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { RegistrationsRepository } from './registrations.repository.js';

/** Roles that register across the whole org (HR view); everyone else registers their own team. */
const ORG_ROLES = ['hr', 'admin', 'developer'];
/** States where registration is closed to everyone but HR. */
const LOCKED_STATES = new Set(['locked', 'confirmed', 'rejected']);

export interface Caller {
  userId: string;
  role: string;
}

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly repo: RegistrationsRepository,
    private readonly courses: CoursesRepository,
    private readonly employees: EmployeesRepository,
    private readonly cycles: CyclesRepository,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Register (or request/waitlist) an employee, enforcing self-service policy, constraints, the
   * registration lock, seat limits and the waitlist (requirements #3/#4/#5/#8/#9).
   */
  async register(
    courseId: number,
    employeeId: string,
    source: RegistrationSource,
    caller: Caller,
  ): Promise<RegistrationResult> {
    const course = await this.assertCourse(courseId);
    const employee = await this.assertEmployee(employeeId);
    const isHr = ORG_ROLES.includes(caller.role);

    if (source === 'self' && employeeId !== caller.userId) {
      throw new ForbiddenException({ error: 'You can only self-register yourself' });
    }
    // A manager may only act on their own org subtree.
    if (caller.role === 'manager' && !(await this.inSubtree(caller.userId, employeeId))) {
      throw new ForbiddenException({ error: 'That person is not in your team' });
    }

    // Team / personnel-type constraints (requirements #8/#9) — a property of the person, so
    // checked before the timing gate: an ineligible person gets the real reason either way.
    const reason = constraintReason(course, employee);
    if (reason) throw new ForbiddenException({ error: reason });

    // Registration lock (#3/#4): once locked / deadline passed, only HR may change registrations.
    const cycle = await this.cycleOf(course);
    if (!isHr && !canNonHrChange(course, cycle)) {
      throw new ForbiddenException({
        error: 'Registration is locked for this course — contact HR to make changes',
      });
    }

    // Self-registration is gated by the course policy (requirement #7).
    let status: RegistrationStatus = 'registered';
    if (source === 'self') {
      if (course.selfRegistration === 'none') {
        throw new ForbiddenException({ error: 'Self-registration is not open for this course' });
      }
      status = course.selfRegistration === 'approval_required' ? 'pending_approval' : 'registered';
    }

    // Seats & per-manager cap (#8). When over, a non-HR registration is waitlisted (#5) rather
    // than rejected; HR may overfill to cover a drop-out (#4).
    if (status === 'registered' && !isHr) {
      const availability = await this.availability(course);
      const seatsFull = !availability.unlimited && (availability.seatsLeft ?? 0) <= 0;
      let managerOver = false;
      if (source === 'manager' && course.perManagerLimit != null) {
        const used = await this.managerSeatsUsed(courseId, caller.userId);
        managerOver = used >= course.perManagerLimit;
      }
      if (seatsFull || managerOver) status = 'waitlisted';
    }

    const requestedBy = source === 'self' ? employeeId : caller.userId;
    return this.repo.register(courseId, employeeId, source, status, requestedBy);
  }

  async precheck(courseId: number, employeeIds: string[]): Promise<RegistrationResult[]> {
    await this.assertCourse(courseId);
    return Promise.all(employeeIds.map((id) => this.repo.precheck(courseId, id)));
  }

  /** Seat availability for a course (null seat fields ⇒ unlimited / online) plus lock state. */
  async availability(course: Course, callerId?: string): Promise<CourseAvailability> {
    const [{ registered, pending, waitlisted }, cycle] = await Promise.all([
      this.repo.statusCounts(course.id),
      this.cycleOf(course),
    ]);
    const unlimited = course.capacity == null;
    const seatsLeft = unlimited ? null : Math.max(0, course.capacity! - registered);
    const myStatus = callerId ? await this.repo.statusOf(course.id, callerId) : null;
    const locked = LOCKED_STATES.has(course.lifecycleState) || deadlinePassed(cycle);
    return CourseAvailabilitySchema.parse({
      courseId: course.id,
      capacity: course.capacity,
      registered,
      pending,
      waitlisted,
      seatsLeft,
      unlimited,
      perManagerLimit: course.perManagerLimit,
      myStatus,
      registrationClosesAt: cycle?.registrationClosesAt ?? null,
      locked,
    });
  }

  async availabilityById(courseId: number, callerId?: string): Promise<CourseAvailability> {
    return this.availability(await this.assertCourse(courseId), callerId);
  }

  /**
   * The registration roster for the caller's scope: their team (manager) or the whole org (HR),
   * each candidate annotated with current status and eligibility (requirements #7/#8/#9).
   */
  async roster(courseId: number, caller: Caller): Promise<CourseRoster> {
    const course = await this.assertCourse(courseId);
    const orgScope = ORG_ROLES.includes(caller.role);
    const candidates: EmployeeSummary[] = orgScope
      ? await this.employees.allWorkingSummaries()
      : await this.employees.subtreeSummaries(caller.userId);

    const [statusMap, availability] = await Promise.all([
      this.repo.registrationsFor(courseId),
      this.availability(course),
    ]);

    const managerSeatsUsed = orgScope
      ? 0
      : candidates.filter((c) => statusMap.get(c.id) === 'registered').length;
    const managerSeatsLeft =
      !orgScope && course.perManagerLimit != null
        ? Math.max(0, course.perManagerLimit - managerSeatsUsed)
        : null;

    const seatsFull = !availability.unlimited && (availability.seatsLeft ?? 0) <= 0;
    const managerFull = managerSeatsLeft != null && managerSeatsLeft <= 0;

    const entries: RosterEntry[] = candidates.map((employee) => {
      const status = statusMap.get(employee.id) ?? null;
      let eligible = true;
      let reason: string | null = null;
      const constraint = constraintReason(course, employee);
      if (status === 'registered' || status === 'pending_approval' || status === 'waitlisted') {
        eligible = false;
        reason =
          status === 'registered'
            ? 'Already registered'
            : status === 'waitlisted'
              ? 'On the waitlist'
              : 'Awaiting approval';
      } else if (availability.locked) {
        eligible = false;
        reason = 'Registration is locked';
      } else if (constraint) {
        eligible = false;
        reason = constraint;
      } else if (seatsFull) {
        eligible = true; // still registrable — will be waitlisted
        reason = 'Course full — will be waitlisted';
      } else if (managerFull) {
        eligible = true;
        reason = 'Over your allocation — will be waitlisted';
      }
      return { employee, status, eligible, reason };
    });

    return CourseRosterSchema.parse({ availability, managerSeatsUsed, managerSeatsLeft, entries });
  }

  /**
   * Approve / decline / cancel a registration (requirement #7). Cancelling a confirmed seat frees
   * it and promotes the earliest waitlisted person (#5). Non-HR are blocked once locked (#4).
   */
  async manage(
    courseId: number,
    employeeId: string,
    action: 'approve' | 'decline' | 'cancel',
    caller: Caller,
  ): Promise<{ status: RegistrationStatus }> {
    const course = await this.assertCourse(courseId);
    const current = await this.repo.statusOf(courseId, employeeId);
    if (!current) throw new NotFoundException({ error: 'No such registration' });

    const isHr = ORG_ROLES.includes(caller.role);
    if (caller.role === 'manager' && !(await this.inSubtree(caller.userId, employeeId))) {
      throw new ForbiddenException({ error: 'That person is not in your team' });
    }
    const cycle = await this.cycleOf(course);
    if (!isHr && !canNonHrChange(course, cycle)) {
      throw new ForbiddenException({
        error: 'Registration is locked for this course — contact HR to make changes',
      });
    }

    const next: RegistrationStatus =
      action === 'approve' ? 'registered' : action === 'decline' ? 'declined' : 'cancelled';
    await this.repo.updateStatus(
      courseId,
      employeeId,
      next,
      action === 'approve' ? caller.userId : null,
    );

    // Freeing a confirmed seat promotes the next waitlisted person (#5).
    if ((action === 'cancel' || action === 'decline') && current === 'registered') {
      await this.promoteWaitlist(course);
    }
    return { status: next };
  }

  /** If a seat is free, promote the earliest waitlisted person and notify them (#5). */
  private async promoteWaitlist(course: Course): Promise<void> {
    if (course.capacity == null) return;
    const { registered } = await this.repo.statusCounts(course.id);
    if (registered >= course.capacity) return;
    const next = await this.repo.earliestWaitlisted(course.id);
    if (!next) return;
    await this.repo.updateStatus(course.id, next, 'registered', null);
    await this.notifications.queue({
      event: 'waitlist_promoted',
      recipientId: next,
      subject: `A seat opened up: ${course.title}`,
      body: `A seat has opened on "${course.title}" and you have been moved off the waitlist — you are now registered.`,
      courseId: course.id,
    });
  }

  private async managerSeatsUsed(courseId: number, managerId: string): Promise<number> {
    const [subtree, statusMap] = await Promise.all([
      this.employees.subtreeSummaries(managerId),
      this.repo.registrationsFor(courseId),
    ]);
    return subtree.filter((c) => statusMap.get(c.id) === 'registered').length;
  }

  private async inSubtree(managerId: string, employeeId: string): Promise<boolean> {
    const subtree = await this.employees.subtreeSummaries(managerId);
    return subtree.some((e) => e.id === employeeId);
  }

  private cycleOf(course: Course): Promise<TrainingCycle | null> {
    return course.cycleId != null ? this.cycles.findById(course.cycleId) : Promise.resolve(null);
  }

  private async assertCourse(courseId: number): Promise<Course> {
    const course = await this.courses.findById(courseId);
    if (!course) throw new NotFoundException({ error: 'No such course' });
    return course;
  }

  private async assertEmployee(employeeId: string): Promise<EmployeeSummary> {
    const employee = await this.employees.findById(employeeId);
    if (!employee) throw new NotFoundException({ error: 'No such employee' });
    return {
      id: employee.id,
      fullName: employee.fullName,
      email: employee.email,
      department: employee.department,
      title: employee.title,
      managerId: employee.managerId,
      category: employee.category,
      status: employee.status,
    };
  }
}

function deadlinePassed(cycle: TrainingCycle | null): boolean {
  return (
    cycle?.registrationClosesAt != null &&
    new Date(cycle.registrationClosesAt).getTime() < Date.now()
  );
}

/** Whether a non-HR user may still change registrations on this course. */
function canNonHrChange(course: Course, cycle: TrainingCycle | null): boolean {
  if (course.cycleId == null) return true; // ad-hoc catalog course, no lifecycle gate
  if (course.lifecycleState !== 'open') return false; // not open (candidate/bidding/locked/…)
  return !deadlinePassed(cycle);
}

/** The first failing registration constraint for an employee, or null when eligible (#8/#9). */
function constraintReason(course: Course, employee: EmployeeSummary): string | null {
  if (
    course.restrictedTeams.length > 0 &&
    (employee.department == null || !course.restrictedTeams.includes(employee.department))
  ) {
    return 'Not in a team allowed to register for this course';
  }
  if (course.excludeSubcontractors && employee.category === 'subcontractor') {
    return 'Subcontractors are excluded from this course';
  }
  if (course.excludeStudents && employee.category === 'student') {
    return 'Students are excluded from this course';
  }
  return null;
}
