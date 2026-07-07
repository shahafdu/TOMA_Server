import { ErrorHandler, Injectable, Injector } from '@angular/core';

import { NotificationService, NotifMsg } from './notification.service';

@Injectable()
export class ComaErrorHandlerService implements ErrorHandler {
  constructor(private injector: Injector) { }

  handleError(error: any) {
    const notificationService = this.injector.get(NotificationService);
    const notif: NotifMsg = { type: 'user-error', msg: '', timeout: 0 };

    if (typeof (error.status) !== 'undefined') {
      // Server error happened
      if (!navigator.onLine) {
        // No Internet connection
        notif.type = 'user-error';
        notif.msg = 'No Internet Connection';
      } else {
        // Http Error
        if (error.status === 0) {
          notif.type = 'user-error';
          notif.msg = 'Network Issues.\nCheck your connection and contact IT support.';
        } else if (error.status === 444) { // Timeout
          notif.type = 'user-error';
          notif.msg = 'Something went wrong.\n Please try again in a few seconds.';
        } else {
          notif.type = 'dev-error';
          notif.msg = error.url + '\n ' + error.status + '-' + error._body;
        }
      }
    } else {
      // Client Error Happend
      notif.type = 'dev-error';
      notif.msg = error;
      if (typeof (error.stack) !== 'undefined') {
        notif.msg += '\n ' + error.stack;
      }
    }
    // Log the error anyway
    console.error(error);
    return notificationService.notify(notif);
  }
}
