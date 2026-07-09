import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedGuard } from '../auth/authenticated.guard.js';
import { CurrentUser, type CurrentUserInfo } from '../auth/current-user.decorator.js';
import { NotificationsService } from './notifications.service.js';

const DISPATCH_ROLES = ['hr', 'admin', 'developer'];

/** The notification inbox (outbox stand-in for Exchange mail) for the signed-in user. */
@Controller('notifications')
@UseGuards(AuthenticatedGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  inbox(@CurrentUser() user: CurrentUserInfo) {
    return this.notifications.inbox(user.userId);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: CurrentUserInfo) {
    return { count: await this.notifications.unreadCount(user.userId) };
  }

  @Post(':id/read')
  @HttpCode(204)
  async markRead(@CurrentUser() user: CurrentUserInfo, @Param('id') id: string) {
    await this.notifications.markRead(Number(id), user.userId);
  }

  @Post('read-all')
  @HttpCode(204)
  async markAllRead(@CurrentUser() user: CurrentUserInfo) {
    await this.notifications.markAllRead(user.userId);
  }

  /** Simulates the scheduled Exchange dispatch — HR/admin/dev may trigger it on demand. */
  @Post('dispatch')
  dispatch(@CurrentUser() user: CurrentUserInfo) {
    if (!DISPATCH_ROLES.includes(user.role)) {
      throw new ForbiddenException({ error: 'Not permitted for this role' });
    }
    return this.notifications.dispatchDue();
  }
}
