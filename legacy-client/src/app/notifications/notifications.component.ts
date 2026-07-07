import { Component, OnInit, NgZone } from '@angular/core';
import { NotificationService, NotifMsg } from '../services';

@Component({
  selector: 'coma-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit {
  notifications: { notification: string, msg: string | null, isError: boolean, timeOut: number }[] = [];
  message: string = '';
  errorMsg: string = 'Something went wrong... \nClick here to copy error and send to support team';
  isError: boolean = false;
  timer: any;

  constructor(private notifServ: NotificationService, public zone: NgZone) { }

  ngOnInit() {
    this.notifications = [];
    this.notifServ.notification$.subscribe((notif: NotifMsg | null) => {
      if (notif) {
        this.addNotif(notif);
      }
    });
  }

  addNotif(notif: NotifMsg) {
    this.zone.run(() => {
      if (notif) {
        const newNotif = {
          notification: notif.type === 'dev-error' ? this.errorMsg : notif.msg,
          msg: notif.type === 'dev-error' ? notif.msg : null,
          isError: (notif.type !== 'notification'),
          timeOut: notif.timeout
        };
        this.notifications.push(newNotif);
        if (!this.timer) {
          this.timer = setInterval(this.removeNotif.bind(this), 1000);
        }
      }
    });
  }

  removeNotif() {
    this.notifications.forEach(notif => notif.timeOut -= 1000);
    this.notifications = this.notifications.filter(notif => notif.timeOut !== 0);
    if (this.notifications.length === 0) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  sendMail(notif: { notification: string, msg: string | null, isError: boolean, timeOut: number }) {
    const ind = this.notifications.indexOf(notif);
    this.notifications.splice(ind, 1);
    if (!notif.msg) { return; }
    const email = 'errors@example.com';
    const subject = 'Error from COMA';
    const emailBody = notif.msg;
    const newWin = window.open('mailto:' + email + '?subject=' + subject + '&body=' + emailBody);
    if (!!newWin) {
      newWin.focus();
      newWin.onblur = () => newWin.close();
    }
  }

}
