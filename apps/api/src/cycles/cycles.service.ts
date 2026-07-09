import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CourseBid, CourseSession, CycleBoard, TrainingCycle } from '@toma/shared';
import { CoursesRepository } from '../courses/courses.repository.js';
import { EmployeesRepository } from '../employees/employees.repository.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CyclesRepository } from './cycles.repository.js';

export interface Caller {
  userId: string;
  role: string;
}

@Injectable()
export class CyclesService {
  constructor(
    private readonly repo: CyclesRepository,
    private readonly courses: CoursesRepository,
    private readonly employees: EmployeesRepository,
    private readonly notifications: NotificationsService,
  ) {}

  list(): Promise<TrainingCycle[]> {
    return this.repo.list();
  }

  /** The bidding/registration board for a cycle (current cycle if none given), scoped to caller. */
  async board(cycleId: number | null, caller: Caller): Promise<CycleBoard | null> {
    const cycle = cycleId ? await this.repo.findById(cycleId) : await this.repo.current();
    if (!cycle) return null;
    const courses = await this.repo.boardCourses(cycle.id, caller.userId);
    return { cycle, courses };
  }

  bidsForCourse(courseId: number): Promise<CourseBid[]> {
    return this.repo.bidsForCourse(courseId);
  }

  createCycle(year: number, quarter: number): Promise<TrainingCycle> {
    return this.repo.create(year, quarter);
  }

  /** #1 — HR opens bidding: attach candidates, set the deadline, mail every manager. */
  async openBidding(
    cycleId: number,
    biddingClosesAt: string,
    courseIds: number[],
  ): Promise<TrainingCycle> {
    const cycle = await this.assertCycle(cycleId);
    await this.repo.attachCourses(cycleId, courseIds, 'bidding');
    await this.repo.setBiddingDeadline(cycleId, biddingClosesAt);
    await this.repo.setStatus(cycleId, 'bidding');

    const managers = await this.employees.managerIds();
    const when = formatDeadline(biddingClosesAt);
    await this.notifications.queueMany(managers, {
      event: 'bidding_opened',
      subject: `Bidding open for ${quarterLabel(cycle)}`,
      body: `HR has opened bidding for ${quarterLabel(cycle)} with ${courseIds.length} candidate courses. Submit how many of your team you want on each course before ${when}. You can change your bids until then.`,
      cycleId,
    });
    return (await this.repo.findById(cycleId))!;
  }

  /** #1 — a manager sets/updates a bid; only while bidding is open and before the deadline. */
  async setBid(courseId: number, seats: number, caller: Caller): Promise<void> {
    const course = await this.courses.findById(courseId);
    if (!course || course.cycleId == null) {
      throw new NotFoundException({ error: 'Course is not part of a bidding cycle' });
    }
    const cycle = await this.assertCycle(course.cycleId);
    if (cycle.status !== 'bidding') {
      throw new BadRequestException({ error: 'Bidding is not open for this cycle' });
    }
    if (isPast(cycle.biddingClosesAt)) {
      throw new ForbiddenException({ error: 'The bidding deadline has passed' });
    }
    await this.repo.setBid(courseId, caller.userId, seats);
  }

  /** Reminder mail to managers as the bidding deadline approaches (#1, scheduled/on-demand). */
  async remindBidding(cycleId: number): Promise<{ notified: number }> {
    const cycle = await this.assertCycle(cycleId);
    const managers = await this.employees.managerIds();
    await this.notifications.queueMany(managers, {
      event: 'bidding_reminder',
      subject: `Reminder: bidding for ${quarterLabel(cycle)} closes soon`,
      body: `Bidding for ${quarterLabel(cycle)} closes ${formatDeadline(cycle.biddingClosesAt)}. Review and adjust your bids before then.`,
      cycleId,
    });
    return { notified: managers.length };
  }

  /** #2 — HR reviews bids and opens registration for the chosen courses, with a lock deadline. */
  async openRegistration(
    cycleId: number,
    registrationClosesAt: string,
    courseIds: number[],
  ): Promise<TrainingCycle> {
    const cycle = await this.assertCycle(cycleId);
    // Courses HR didn't pick fall out of the running.
    const candidates = await this.repo.courseIdsInCycle(cycleId, 'bidding');
    const dropped = candidates.filter((id) => !courseIds.includes(id));
    await this.repo.setCourseState(dropped, 'rejected', cycleId);
    await this.repo.setCourseState(courseIds, 'open', cycleId);
    await this.repo.setRegistrationDeadline(cycleId, registrationClosesAt);
    await this.repo.setStatus(cycleId, 'registration');

    const managers = await this.employees.managerIds();
    const when = formatDeadline(registrationClosesAt);
    await this.notifications.queueMany(managers, {
      event: 'registration_opened',
      subject: `Registration open for ${quarterLabel(cycle)}`,
      body: `Registration is open for ${courseIds.length} courses in ${quarterLabel(cycle)}. Register your team before ${when}; after that, registration locks and only HR can make changes.`,
      cycleId,
    });
    return (await this.repo.findById(cycleId))!;
  }

  async remindRegistration(cycleId: number): Promise<{ notified: number }> {
    const cycle = await this.assertCycle(cycleId);
    const managers = await this.employees.managerIds();
    await this.notifications.queueMany(managers, {
      event: 'registration_reminder',
      subject: `Reminder: registration for ${quarterLabel(cycle)} closes soon`,
      body: `Registration for ${quarterLabel(cycle)} locks ${formatDeadline(cycle.registrationClosesAt)}. Finalise your team's registrations before then.`,
      cycleId,
    });
    return { notified: managers.length };
  }

  /** #4 — the registration lock: open courses become HR-only; managers are notified. */
  async lockRegistration(cycleId: number): Promise<TrainingCycle> {
    const cycle = await this.assertCycle(cycleId);
    const open = await this.repo.courseIdsInCycle(cycleId, 'open');
    await this.repo.setCourseState(open, 'locked', cycleId);
    await this.repo.setStatus(cycleId, 'locked');
    const managers = await this.employees.managerIds();
    await this.notifications.queueMany(managers, {
      event: 'registration_locked',
      subject: `Registration locked for ${quarterLabel(cycle)}`,
      body: `Registration for ${quarterLabel(cycle)} is now locked. Contact HR for any further changes.`,
      cycleId,
    });
    return (await this.repo.findById(cycleId))!;
  }

  /**
   * #6/#7/#8 — HR confirms or cancels a course based on participant numbers. On confirm, every
   * registered person + their manager gets a confirmation mail with the exact dates, and an
   * "upcoming course" reminder is scheduled a few days before the first session.
   */
  async decideCourse(
    courseId: number,
    decision: 'confirm' | 'cancel',
    _caller: Caller,
  ): Promise<{ state: string }> {
    const course = await this.courses.findById(courseId);
    if (!course) throw new NotFoundException({ error: 'No such course' });

    if (decision === 'cancel') {
      await this.repo.setCourseState([courseId], 'rejected', course.cycleId ?? undefined);
      await this.notifyParticipants(
        courseId,
        'course_cancelled',
        `Course cancelled: ${course.title}`,
        () =>
          `The course "${course.title}" has been cancelled by HR. You have been removed from it.`,
      );
      return { state: 'rejected' };
    }

    await this.repo.setCourseState([courseId], 'confirmed', course.cycleId ?? undefined);
    const sessions = await this.courses.sessions(courseId);
    const schedule = formatSessions(sessions);
    const firstStart = sessions[0]?.startsAt ?? null;

    // #7 — confirmation with exact dates/hours, to each registered person + their manager.
    await this.notifyParticipants(
      courseId,
      'registration_confirmed',
      `Confirmed: ${course.title}`,
      () =>
        `Your registration for "${course.title}" is confirmed.\n\nSchedule:\n${schedule}\n\n${locationLine(course)}`,
      { includeManagers: true },
    );

    // #8 — upcoming-course reminder, scheduled 3 days before the first session.
    if (firstStart) {
      const remindAt = new Date(new Date(firstStart).getTime() - 3 * 86400_000).toISOString();
      await this.notifyParticipants(
        courseId,
        'course_upcoming',
        `Upcoming: ${course.title}`,
        () =>
          `Reminder — "${course.title}" starts soon.\n\nSchedule:\n${schedule}\n\n${locationLine(course)}`,
        { includeManagers: true, scheduledFor: remindAt },
      );
    }
    return { state: 'confirmed' };
  }

  /** Fan a message out to a course's registered people (and optionally their managers). */
  private async notifyParticipants(
    courseId: number,
    event: Parameters<NotificationsService['queueMany']>[1]['event'],
    subject: string,
    body: () => string,
    opts: { includeManagers?: boolean; scheduledFor?: string } = {},
  ): Promise<void> {
    const registered = await this.repo.registeredIds(courseId);
    const recipients = [...registered];
    if (opts.includeManagers) {
      const managers = await Promise.all(registered.map((id) => this.employees.managerOf(id)));
      for (const m of managers) if (m) recipients.push(m);
    }
    await this.notifications.queueMany(recipients, {
      event,
      subject,
      body: body(),
      courseId,
      scheduledFor: opts.scheduledFor ?? null,
    });
  }

  private async assertCycle(cycleId: number): Promise<TrainingCycle> {
    const cycle = await this.repo.findById(cycleId);
    if (!cycle) throw new NotFoundException({ error: 'No such cycle' });
    return cycle;
  }
}

function quarterLabel(cycle: TrainingCycle): string {
  return `Q${cycle.quarter} ${cycle.year}`;
}

function isPast(iso: string | null): boolean {
  return iso != null && new Date(iso).getTime() < Date.now();
}

function formatDeadline(iso: string | null): string {
  if (!iso) return 'the deadline';
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSessions(sessions: CourseSession[]): string {
  if (sessions.length === 0) return 'Dates to be announced.';
  return sessions
    .map((s) => {
      const day = new Date(s.startsAt).toLocaleDateString(undefined, {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const t = (iso: string) =>
        new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `• ${day} ${t(s.startsAt)}–${t(s.endsAt)}`;
    })
    .join('\n');
}

function locationLine(course: {
  deliveryType: string;
  location: string | null;
  platformUrl: string | null;
}): string {
  if (course.deliveryType === 'online') return `Online: ${course.platformUrl ?? 'link to follow'}`;
  return `Location: ${course.location ?? 'to be announced'}`;
}
