import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Course,
  CourseAvailability,
  CourseRoster,
  EmployeeSummary,
  RegistrationResult,
  RegistrationSource,
  RegistrationStatus,
  RosterEntry,
} from '@toma/shared';
import {
  CourseAvailability as CourseAvailabilitySchema,
  CourseRoster as CourseRosterSchema,
} from '@toma/shared';
import { CoursesRepository } from '../courses/courses.repository.js';
import { EmployeesRepository } from '../employees/employees.repository.js';
import { RegistrationsRepository } from './registrations.repository.js';

/** Roles that register across the whole org (HR view); everyone else registers their own team. */
const ORG_ROLES = ['hr', 'admin', 'developer'];

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
  ) {}

  /** Register (or request) an employee, enforcing self-service policy, constraints and seats. */
  async register(
    courseId: number,
    employeeId: string,
    source: RegistrationSource,
    caller: Caller,
  ): Promise<RegistrationResult> {
    const course = await this.assertCourse(courseId);
    const employee = await this.assertEmployee(employeeId);

    // A person may only self-register themselves.
    if (source === 'self' && employeeId !== caller.userId) {
      throw new ForbiddenException({ error: 'You can only self-register yourself' });
    }

    // Self-registration is gated by the course policy (requirement #7).
    let status: RegistrationStatus = 'registered';
    if (source === 'self') {
      if (course.selfRegistration === 'none') {
        throw new ForbiddenException({ error: 'Self-registration is not open for this course' });
      }
      status = course.selfRegistration === 'approval_required' ? 'pending_approval' : 'registered';
    }

    // Team / personnel-type constraints (requirements #8/#9).
    const reason = constraintReason(course, employee);
    if (reason) throw new ForbiddenException({ error: reason });

    // Seat limits (requirement #8). Pending requests don't consume a confirmed seat.
    if (status === 'registered') {
      const availability = await this.availability(course);
      if (!availability.unlimited && (availability.seatsLeft ?? 0) <= 0) {
        throw new ConflictException({ error: 'Course is full' });
      }
      if (source === 'manager' && course.perManagerLimit != null) {
        const used = await this.managerSeatsUsed(courseId, caller.userId);
        if (used >= course.perManagerLimit) {
          throw new ForbiddenException({ error: 'Your seat allocation for this course is full' });
        }
      }
    }

    const requestedBy = source === 'self' ? employeeId : caller.userId;
    return this.repo.register(courseId, employeeId, source, status, requestedBy);
  }

  async precheck(courseId: number, employeeIds: string[]): Promise<RegistrationResult[]> {
    await this.assertCourse(courseId);
    return Promise.all(employeeIds.map((id) => this.repo.precheck(courseId, id)));
  }

  /** Seat availability for a course (null seat fields ⇒ unlimited / online). */
  async availability(course: Course, callerId?: string): Promise<CourseAvailability> {
    const { registered, pending } = await this.repo.statusCounts(course.id);
    const unlimited = course.capacity == null;
    const seatsLeft = unlimited ? null : Math.max(0, course.capacity! - registered);
    const myStatus = callerId ? await this.repo.statusOf(course.id, callerId) : null;
    return CourseAvailabilitySchema.parse({
      courseId: course.id,
      capacity: course.capacity,
      registered,
      pending,
      seatsLeft,
      unlimited,
      perManagerLimit: course.perManagerLimit,
      myStatus,
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
      if (status === 'registered' || status === 'pending_approval') {
        eligible = false;
        reason = status === 'registered' ? 'Already registered' : 'Awaiting approval';
      } else if (constraint) {
        eligible = false;
        reason = constraint;
      } else if (seatsFull) {
        eligible = false;
        reason = 'Course is full';
      } else if (managerFull) {
        eligible = false;
        reason = 'Your seat allocation is full';
      }
      return { employee, status, eligible, reason };
    });

    return CourseRosterSchema.parse({ availability, managerSeatsUsed, managerSeatsLeft, entries });
  }

  /** Approve / decline / cancel a pending or active registration (requirement #7). */
  async manage(
    courseId: number,
    employeeId: string,
    action: 'approve' | 'decline' | 'cancel',
    caller: Caller,
  ): Promise<{ status: RegistrationStatus }> {
    const course = await this.assertCourse(courseId);
    const current = await this.repo.statusOf(courseId, employeeId);
    if (!current) throw new NotFoundException({ error: 'No such registration' });

    if (action === 'approve') {
      const availability = await this.availability(course);
      if (!availability.unlimited && (availability.seatsLeft ?? 0) <= 0) {
        throw new ConflictException({ error: 'Course is full' });
      }
    }
    const next: RegistrationStatus =
      action === 'approve' ? 'registered' : action === 'decline' ? 'declined' : 'cancelled';
    await this.repo.updateStatus(
      courseId,
      employeeId,
      next,
      action === 'approve' ? caller.userId : null,
    );
    return { status: next };
  }

  private async managerSeatsUsed(courseId: number, managerId: string): Promise<number> {
    const [subtree, statusMap] = await Promise.all([
      this.employees.subtreeSummaries(managerId),
      this.repo.registrationsFor(courseId),
    ]);
    return subtree.filter((c) => statusMap.get(c.id) === 'registered').length;
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
