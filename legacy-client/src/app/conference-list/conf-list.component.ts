import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import * as moment from 'moment';

import { ICourse, IUser } from '../models/index';
import { CourseService, EmployeeService, NotifMsg, NotificationService, AuthService } from '../services';
import { Constants } from '../common';

enum TimeTypes {
  Past = 1,
  Now = 2,
  Future = 3,
}

@Component({
  selector: 'coma-conf-list',
  templateUrl: './conf-list.component.html',
  styleUrls: ['./conf-list.component.css']
})
export class ConfListComponent implements OnInit, OnDestroy {
  private _confList: ICourse[] = [];
  public get confList(): ICourse[] {
    return this._confList;
  }
  public set confList(v: ICourse[]) {
    this._confList = v.filter((course: ICourse) => {
      return (course.isConference);
    });
    if (v) {
      if (this.authServ.currentUser.authorizationId === Constants.authorizationLevel2Num.PM) {
        this.isPm = true;
        this.filterPmsCourses();
      } else {
        this.filterCourses();
      }
    }
  }
  visibleConfList: ICourse[] = [];
  private openUser: IUser = new IUser;
  _filterBy: string = '';
  get filterBy() {
    return this._filterBy;
  }
  set filterBy(val: string) {
    this._filterBy = val;
    this.filterCourses();
  }
  filterFields: any[] = [
    {disp: 'Course Name',
    prop: 'name'},
    {disp: 'Lecturer',
    prop: 'lecturer'},
    {disp: 'Past/Present/Future',
    prop: 'schedule'},
    {disp: 'Between Dates',
    prop: 'dates'},
    {disp: 'Location In/Out',
    prop: 'isIn'},
    {disp: 'Mandatory Yes/No',
    prop: 'isMandatory'},
    {disp: 'Course Type',
    prop: 'courseType'}];
  private _filterField: string = 'name';
  public get filterField(): string {
    return this._filterField;
  }
  public set filterField(v: string) {
    this._filterField = v;
    if (this.filterField === 'schedule') {
      this.filterBy = 'current';
    } else {
      this.filterBy = '';
    }
  }
  private _fromDate: Date = new Date;
  private _toDate: Date = new Date;
  public get fromDate(): Date {
    return this._fromDate;
  }
  public set fromDate(val: Date) {
    this._fromDate = val;
    this.filterCourses();
  }
  public get toDate(): Date {
    return this._toDate;
  }
  public set toDate(val: Date) {
    this._toDate = val;
    this.filterCourses();
  }
  public isPm: boolean = false;
  sortBy: string = 'name';
  sortAscend: boolean = true;
  notif: NotifMsg = { type: 'user-error', msg: '', timeout: 0 };


  private courseListChangedSub: Subscription = new Subscription;

  constructor(private courseServ: CourseService, private empServ: EmployeeService, private router: Router,
              private notifServ: NotificationService, private authServ: AuthService) { }

  ngOnInit() {
    this.confList = this.courseServ.yearlyCourseList;
    if (this.confList) {
      this.setColors();
    }
    this.courseListChangedSub = this.courseServ.courseListChangedEvent.subscribe((courseList: ICourse[]) => {
      this.confList = courseList;
      this.setColors();
    });
    this.empServ.openedUserChanged.subscribe((user: IUser) => {
      this.openUser = user;
      this.setColors();
    });
  }

  ngOnDestroy(): void {
    if (this.courseListChangedSub) {this.courseListChangedSub.unsubscribe(); }
    this.courseServ.setOpenedCourse('');
  }

  allowDrop(ev: DragEvent) {
    ev.preventDefault();
  }

  dropped(ev: {event: DragEvent, item: any}) {
    try {
      const data = ev.event.dataTransfer ? JSON.parse(ev.event.dataTransfer.getData('text')) : {};
      if (data['type'] && data['type'] === 'user') {
        const ID = data['ID'];
        let user: IUser;
        if (!ev.item.participants.map((partic: IUser) => partic.ID).includes(ID)) {
          this.empServ.getUser(ID).subscribe(userDetails => {
            user = userDetails;
            this.courseServ.addParticipant(ev.item.name, user).subscribe(isSucsess => {
              if (!isSucsess) {
                this.notif.type = 'user-error';
                this.notif.msg = 'Something went wrong, could not add user';
              } else {
                this.notif.type = 'notification';
                this.notif.msg = 'Added user to course';
              }
              this.notifServ.notify(this.notif);
            });
          });
        }
      }
    } catch (e) {
      return;
    }
  }

  goToDetails(courseName: string): void {
    courseName = this.courseServ.name2Url(courseName);
    this.router.navigate(['courses', courseName]);
  }

  removeUser(course: ICourse, user: IUser) {
    this.courseServ.getCourseAttendance(course.name).subscribe((attendList) => {
      if (attendList.map(item => item.ID).includes(user.ID)) {
        this.notif.type = 'user-error';
        // tslint:disable-next-line:quotemark
        this.notif.msg = "User is marked as 'attended' so he can't be removed. Change he's attendance and try again";
        this.notifServ.notify(this.notif);
      } else {
        this.courseServ.removeParticipant(course.name, user.ID).subscribe(isSucsess => {
          if (!isSucsess) {
            this.notif.type = 'user-error';
            this.notif.msg = 'Something went wrong, could not remove user';
          } else {
            this.notif.type = 'notification';
            this.notif.msg = 'Removed user from course';
          }
          this.notifServ.notify(this.notif);
        });
      }
    });
  }

  courseOpened(course: ICourse | ''): void {
    if (course !== '') {
      this.courseServ.setOpenedCourse(course.name);
    } else {
      this.courseServ.setOpenedCourse('');
    }
  }

  drag(ev: any) {
    const data = {
      type: 'course',
      name: ev.item.name
    };
    ev.event.dataTransfer.setData('text', JSON.stringify(data));
  }

  setColors(): void {
    if (this.confList) {
      this.confList.forEach(course => {
        course['style'] = {};
        if (this.containsUser(course, this.openUser)) {
          course['style']['outline'] = 'solid red';
        } else if (this.familyContainsUser(course, this.openUser)) {
          course['style']['outline'] = 'solid orange';
        } else {
          course['style']['outline'] = '';
        }
        course['style']['background-repeat'] = 'no-repeat';
        course['style']['background-position'] = 'right';
        course['style']['background-size'] = '30px 30px';
        switch (this.checkTime(course)) {
          case TimeTypes.Now: {
            course['style']['background-image'] = 'url(coma/assets/young_man.svg)';
            break;
          }
          case TimeTypes.Past: {
            course['style']['background-image'] = 'url(coma/assets/old_man.svg)';
            break;
          }
          case TimeTypes.Future: {
            course['style']['background-image'] = 'url(coma/assets/baby.svg)';
            break;
          }
        }

      });
    }
  }

  containsUser(course: ICourse, user: IUser) {
    if (!user.ID) {
      return false;
    }
    return user.yearCourses.includes(course.name);
  }

  familyContainsUser(course: ICourse, user: IUser) {
    if (!user) {
      return false;
    }
    const suffixInd = course.name.match(Constants.courseSuffRegEx) ? course.name.match(Constants.courseSuffRegEx)!.index : -1;
    return user.allCourses.map(courseName => courseName.slice(0, suffixInd)).includes(course.name.slice(0, suffixInd));
  }

  filterPmsCourses() {
    const pmEmps: number[] = this.empServ.getAllManagersEmployeesOffline(this.authServ.currentUser.ID).map(emp => emp.ID);
    this._confList = this.confList.filter((course: ICourse) => {
          return (this.checkTime(course) !== TimeTypes.Past || course.participants.map(emp => emp.ID).some(emp => pmEmps.includes(emp)));
    });
    this.filterCourses();
  }

  filterCourses(): void {
    if (this.filterBy === '' && this.filterField !== 'dates') {
      this.visibleConfList = this.confList.slice(0);
    } else {
      if (this.filterField === 'schedule') {
        this.visibleConfList = this.confList.filter((course: ICourse) => {
          switch (this.filterBy) {
            case 'current': {
              return (this.checkTime(course) === TimeTypes.Now);
            }
            case 'past': {
              return (this.checkTime(course) === TimeTypes.Past);
            }
            case 'future':
            default: {
              return (this.checkTime(course) === TimeTypes.Future);
            }
          }
        });
      } else if (this.filterField === 'dates') {
        this.visibleConfList = this.confList.filter((course: ICourse) => {
          const minDate = moment.min(course.schedule.map(item => moment(item.dateTimeStart)));
          const maxDate = moment.max(course.schedule.map(item => moment(item.dateTimeStart)));
          return (maxDate.isAfter(this.fromDate) && minDate.isBefore(this.toDate));
        });
      } else if (this.filterField === 'isIn') {
        this.visibleConfList = this.confList.filter((course: ICourse) => {
          return (!!course.isIn === !!(this.filterBy === 'true'));
        });
      } else if (this.filterField === 'isMandatory') {
        this.visibleConfList = this.confList.filter((course: ICourse) => {
          return (!!course.isMandatory === !!(this.filterBy === 'true'));
        });
      } else if (this.filterField === 'courseType') {
        this.visibleConfList = this.confList.filter((course: ICourse) => {
          return (course.courseType === +this.filterBy);
        });
      } else {
        this.visibleConfList = this.confList.filter((course: ICourse) => {
          if (!course[this.filterField]) { return false; }
          return course[this.filterField].toLocaleLowerCase().indexOf(this.filterBy.toLocaleLowerCase()) > -1;
        });
      }
    }
    this.sortCourses();
  }

  sortCourses(): void {
    const val: number = this.sortAscend ? 1 : -1;
    this.visibleConfList.sort((a, b) => (a[this.sortBy] >= b[this.sortBy]) ? val : -val);
  }

  checkTime(course: ICourse): TimeTypes {
    const now = moment();
    const minDate = moment.min(course.schedule.map(item => moment(item.dateTimeStart)));
    const maxDate = moment.max(course.schedule.map(item => moment(item.dateTimeStart)));
    if (minDate.isBefore(now) && maxDate.isAfter(now)) {return TimeTypes.Now; }
    if (maxDate.isBefore(now)) {return TimeTypes.Past; }
    return TimeTypes.Future;
  }
}
