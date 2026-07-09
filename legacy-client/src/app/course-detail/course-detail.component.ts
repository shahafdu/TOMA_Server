import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { Subscription } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import * as moment from 'moment';

import { CourseService, ConfirmationDialogService, EmployeeService, NotificationService, NotifMsg, AuthService } from '../services';
import { ICourse, IUser, CourseDate } from '../models';


const session_key = (session: CourseDate) => session.dateTimeStart.toISOString() + session.dateTimeEnd.toISOString()

@Component({
  selector: 'coma-course-detail',
  templateUrl: './course-detail.component.html',
  styleUrls: ['./course-detail.component.css']
})
export class CourseDetailComponent implements OnInit, OnDestroy {
  course: ICourse = new ICourse();
  passedEvents: { [index: string]: number[] } = {};
  private yearChangedSub: Subscription = new Subscription;
  public isCreator: boolean = false;
  notif: NotifMsg = {
    type: 'user-error',
    msg: '',
    timeout: 0,
  };


  constructor(
    private authServ: AuthService, private route: ActivatedRoute, private courseServ: CourseService, private router: Router,
    private confirmServ: ConfirmationDialogService, private empServ: EmployeeService, private notifServ: NotificationService,
    public sanitizer: DomSanitizer) { }

  ngOnInit() {
    this.route.params.forEach((params: Params) => {
      const courseName: string = this.courseServ.url2Name(params['name']);
      this.courseServ.getCourse(courseName).subscribe(course => {
        this.course = course;
        this.isCreator = this.course.creator == this.authServ.currentUser.fullName

        this.passedEvents = {};
        this.course.schedule.forEach((session: CourseDate) => {
          this.passedEvents[session_key(session)] = [];
        });
        this.courseServ.getCourseAttendance(this.course.name).subscribe(attendances => {
          this.isCreator = this.course.creator == this.authServ.currentUser.fullName
          attendances.forEach(attendance => {
            if (this.passedEvents[session_key(attendance)] === undefined) {
              console.log("Not valid", attendance)
              return
            }
            const user_id = attendance.ID
            this.passedEvents[session_key(attendance)].push(user_id);
          });
        });
      });
    });
    this.yearChangedSub = this.empServ.yearChangedObs.subscribe(() => {
      this.router.navigate(['courses']);
    });
  }

  ngOnDestroy() {
    if (this.yearChangedSub) {
      this.yearChangedSub.unsubscribe();
    }
  }

  goToEdit() {
    this.router.navigate(['edit', this.route.snapshot.paramMap.get('name')]);
  }

  goToNext() {
    let nextCourseInd = this.courseServ.yearlyCourseList.map(course => course.name).indexOf(this.course.name) + 1;
    if (nextCourseInd === this.courseServ.yearlyCourseList.length) {
      nextCourseInd = 0;
    }
    this.router.navigate(['courses', this.courseServ.name2Url(this.courseServ.yearlyCourseList[nextCourseInd].name)]);
  }

  duplicate() {
    this.router.navigate([
      'edit',
      this.route.snapshot.paramMap.get('name'),
      'duplicate'
    ]);
  }

  delCourse() {
    this.confirmServ
      .confirm(
        'You are about to delete a course!',
        'This cannot be un-done, and all the data will be lost forever. Are you sure?',
        'Yes, delete forever',
        'No way!'
      )
      .then(confirmed => {
        if (confirmed) {
          let canDel = true;
          Object.entries(this.passedEvents).forEach(([key, _value]) => {
            if (this.passedEvents[key].length > 0) {
              this.notif.type = 'user-error';
              // tslint:disable-next-line:quotemark
              this.notif.msg = "Course has some attendees so it can't be removed. Remove all of them and try again";
              this.notifServ.notify(this.notif);
              canDel = false;
              return;
            }
          });
          if (canDel) {
            this.courseServ.removeCourse(this.course.name).subscribe(() => {
              this.courseServ.init();
              this.empServ.init();
              this.router.navigate(['courses']);
            });
          }
        }
      })
      .catch(() => {
        return;
      });
  }

  sendInvites() {
    let mailingList = '';
    let exeptionList = '';
    for (const user of this.course.participants) {
      if (user.email == undefined || user.email == '') {
        exeptionList += user.fullName + ', ';
      }
      else {
        mailingList += user.fullName + ', ';
      }
    }
   
    mailingList = mailingList.slice(0, -2) + '.';
    if(exeptionList!= ''){
      exeptionList = exeptionList.slice(0, -2) + '.';
    }
    console.log('ml:',mailingList,'xl:',exeptionList)
    this.confirmServ
      .confirm(
        'You are about to send invitations to:',
        mailingList,
        'Yes, Send now',
        'No, wait',
        exeptionList!=''?'Please notice that for the follwing emplyees there is no email in the system:'+ exeptionList:''
      )
      .then(confirmed => {
        if (confirmed) {
          this.courseServ.sendInvites(this.course.name).subscribe(() => {
            this.notif.type = 'notification';
            this.notif.msg = 'Invitations sent!';
            this.notifServ.notify(this.notif);
          });
        }
      })
      .catch(() => {
        return;
      });
  }

  passed(dateTime: CourseDate): boolean {
    return moment(dateTime.dateTimeStart).isBefore(moment());
  }

  didAttend(user: IUser, dateTime: CourseDate): boolean {
    return user && this.passedEvents[session_key(dateTime)].includes(user.ID);
  }

  getAttendance(){
    if(this.course){
      this.empServ.exportCourseAttendance(this.course)
    }
  }

  setAttended(user: IUser, dateTime: CourseDate) {
    if (this.didAttend(user, dateTime)) {
      this.courseServ.setUserDidNotAttend(user, this.course.name, dateTime.dateTimeStart, dateTime.dateTimeEnd, this.course.year, this.course.yearInName).subscribe((res) => {
        const ind = this.passedEvents[session_key(dateTime)].indexOf(user.ID);
        if (ind > -1) {
          this.passedEvents[session_key(dateTime)].splice(ind, 1);
        }
        this.notif.type = 'notification';
        this.notif.msg = res.text();
        this.notifServ.notify(this.notif);
      });
    } else {
      this.courseServ.setUserAttended(user, this.course.name, dateTime.dateTimeStart, dateTime.dateTimeEnd, this.course.year, this.course.yearInName).subscribe((res) => {
        this.passedEvents[session_key(dateTime)].push(user.ID);
        this.notif.type = 'notification';
        this.notif.msg = res.text();
        this.notifServ.notify(this.notif);
      });
    }
  }

  setAttendanceAll(userList: IUser[], dateTime: CourseDate): void {
    let callsLeft = 0;
    if (this.didAttend(userList[0], dateTime)) {
      userList.forEach(user => {
        if (this.didAttend(user, dateTime)) {
          callsLeft++;
          this.courseServ.setUserDidNotAttend(user, this.course.name, dateTime.dateTimeStart, dateTime.dateTimeEnd, this.course.year, this.course.yearInName).subscribe((res) => {
            const ind = this.passedEvents[session_key(dateTime)].indexOf(user.ID);
            if (ind > -1) {
              this.passedEvents[session_key(dateTime)].splice(ind, 1);
            }
            callsLeft--;
            if (callsLeft === 0) {
              this.notif.type = 'notification';
              this.notif.msg = res.text();
              this.notifServ.notify(this.notif);
            }
          });
        }
      });
    } else {
      userList.forEach(user => {
        if (!this.didAttend(user, dateTime)) {
          callsLeft++;
          this.courseServ.setUserAttended(user, this.course.name, dateTime.dateTimeStart, dateTime.dateTimeEnd, this.course.year, this.course.yearInName).subscribe((res) => {
            this.passedEvents[session_key(dateTime)].push(user.ID);
            callsLeft--;
            if (callsLeft === 0) {
              this.notif.type = 'notification';
              this.notif.msg = res.text();
              this.notifServ.notify(this.notif);
            }
          });
        }
      });
    }
  }
}
