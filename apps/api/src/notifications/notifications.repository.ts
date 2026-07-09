import { Injectable } from '@nestjs/common';
import {
  type NotificationEvent,
  type NotificationMessage,
  NotificationMessage as NotificationMessageSchema,
} from '@toma/shared';
import type { RowDataPacket } from 'mysql2';
import { DbService } from '../db/db.service.js';

interface OutboxRow extends RowDataPacket {
  NotificationID: number;
  Event: string;
  RecipientSircID: number;
  Subject: string;
  Body: string;
  CourseID: number | null;
  CycleID: number | null;
  ScheduledFor: string;
  SentAt: string | null;
  ReadAt: string | null;
  CreatedAt: string;
}
interface CountRow extends RowDataPacket {
  c: number;
}

export interface QueueInput {
  event: NotificationEvent;
  recipientId: string;
  subject: string;
  body: string;
  courseId?: number | null;
  cycleId?: number | null;
  scheduledFor?: string | null;
}

/** The notification outbox — the in-app stand-in for on-prem Exchange mail. */
@Injectable()
export class NotificationsRepository {
  constructor(private readonly db: DbService) {}

  async queue(input: QueueInput): Promise<void> {
    await this.db.execute(
      `INSERT INTO coma.notification_outbox
         (Event, RecipientSircID, Subject, Body, CourseID, CycleID, ScheduledFor)
       VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
      [
        input.event,
        input.recipientId,
        input.subject,
        input.body,
        input.courseId ?? null,
        input.cycleId ?? null,
        input.scheduledFor ? isoToSql(input.scheduledFor) : null,
      ],
    );
  }

  async inbox(recipientId: string): Promise<NotificationMessage[]> {
    const rows = await this.db.query<OutboxRow>(
      `SELECT * FROM coma.notification_outbox
       WHERE RecipientSircID = ?
       ORDER BY COALESCE(SentAt, ScheduledFor) DESC, NotificationID DESC`,
      [recipientId],
    );
    return rows.map(mapMessage);
  }

  /** Unread among delivered messages (queued-but-unsent don't count as arrived yet). */
  async unreadCount(recipientId: string): Promise<number> {
    const rows = await this.db.query<CountRow>(
      `SELECT COUNT(*) AS c FROM coma.notification_outbox
       WHERE RecipientSircID = ? AND ReadAt IS NULL AND SentAt IS NOT NULL`,
      [recipientId],
    );
    return Number(rows[0]?.c ?? 0);
  }

  async markRead(id: number, recipientId: string): Promise<void> {
    await this.db.execute(
      'UPDATE coma.notification_outbox SET ReadAt = CURRENT_TIMESTAMP WHERE NotificationID = ? AND RecipientSircID = ?',
      [id, recipientId],
    );
  }

  async markAllRead(recipientId: string): Promise<void> {
    await this.db.execute(
      'UPDATE coma.notification_outbox SET ReadAt = CURRENT_TIMESTAMP WHERE RecipientSircID = ? AND ReadAt IS NULL',
      [recipientId],
    );
  }

  /** "Send" all due messages (a cron calls this in prod; here it just stamps SentAt). */
  async dispatchDue(): Promise<number> {
    const res = await this.db.execute(
      `UPDATE coma.notification_outbox
       SET SentAt = CURRENT_TIMESTAMP
       WHERE SentAt IS NULL AND ScheduledFor <= CURRENT_TIMESTAMP`,
    );
    return res.affectedRows;
  }
}

function toIso(value: string | null): string | null {
  if (!value) return null;
  return new Date(value.replace(' ', 'T') + 'Z').toISOString();
}

/** ISO 8601 → `YYYY-MM-DD HH:MM:SS` (UTC) for DATETIME columns. */
function isoToSql(iso: string): string {
  return new Date(iso).toISOString().slice(0, 19).replace('T', ' ');
}

function mapMessage(r: OutboxRow): NotificationMessage {
  return NotificationMessageSchema.parse({
    id: r.NotificationID,
    event: r.Event,
    recipientId: String(r.RecipientSircID),
    subject: r.Subject,
    body: r.Body,
    courseId: r.CourseID,
    cycleId: r.CycleID,
    scheduledFor: toIso(r.ScheduledFor),
    sentAt: toIso(r.SentAt),
    readAt: toIso(r.ReadAt),
    createdAt: toIso(r.CreatedAt),
  });
}
