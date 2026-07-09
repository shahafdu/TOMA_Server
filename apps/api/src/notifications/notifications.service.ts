import { Injectable } from '@nestjs/common';
import type { NotificationMessage } from '@toma/shared';
import { NotificationsRepository, type QueueInput } from './notifications.repository.js';

/**
 * Queues "automatic mail" as notification-outbox rows (Exchange wiring is deferred). Domain
 * services call {@link queue}/{@link queueMany}; a dispatcher marks due rows as sent.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly repo: NotificationsRepository) {}

  queue(input: QueueInput): Promise<void> {
    return this.repo.queue(input);
  }

  async queueMany(recipientIds: string[], input: Omit<QueueInput, 'recipientId'>): Promise<void> {
    const unique = [...new Set(recipientIds)].filter(Boolean);
    await Promise.all(unique.map((recipientId) => this.repo.queue({ ...input, recipientId })));
  }

  inbox(recipientId: string): Promise<NotificationMessage[]> {
    return this.repo.inbox(recipientId);
  }

  unreadCount(recipientId: string): Promise<number> {
    return this.repo.unreadCount(recipientId);
  }

  markRead(id: number, recipientId: string): Promise<void> {
    return this.repo.markRead(id, recipientId);
  }

  markAllRead(recipientId: string): Promise<void> {
    return this.repo.markAllRead(recipientId);
  }

  async dispatchDue(): Promise<{ dispatched: number }> {
    return { dispatched: await this.repo.dispatchDue() };
  }
}
