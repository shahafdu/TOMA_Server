import { Injectable } from '@angular/core';

import { Observable, BehaviorSubject } from 'rxjs';

export interface NotifMsg {
  type: 'user-error' | 'dev-error' | 'notification';
  msg: string;
  timeout: number;
}
@Injectable()
export class NotificationService {

  private _notification: BehaviorSubject<NotifMsg | null> = new BehaviorSubject<NotifMsg | null>(null);
  readonly notification$: Observable<NotifMsg | null> = this._notification.asObservable();

  constructor() {}

  notify(notif: NotifMsg) {
    const timeout = notif.type === 'notification' ? 2000 : 7000;
    notif.timeout = timeout;
    this._notification.next(notif);
  }

}
