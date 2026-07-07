import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

import { EmployeeService, CourseService, NotificationService, NotifMsg, AuthService } from '../services';
import { IUser } from '../models';
import { Constants } from '../common';


@Component({
  selector: 'coma-emp-list',
  templateUrl: './emp-list.component.html',
  styleUrls: ['./emp-list.component.css']
})
export class EmpListComponent implements OnInit, OnDestroy {
  @Input() smallDisp: boolean = false;
  public widthAdjust: number = 2;
  private yearlyHoursTarget: number = 0;
  public isPm: boolean = false;
  private _userList: IUser[] = [];
  public get userList(): IUser[] {
    return this._userList;
  }
  public set userList(v: IUser[]) {
    this._userList = v;
    if (v) {
      if (this.authServ.currentUser.authorizationId === Constants.authorizationLevel2Num.PM) {
        this.isPm = true;
        this.filterPmsUsers();
      } else {
        this.filterUsers();
      }
    }
  }
  visibleUserList: IUser[] = [];
  isFilter: boolean = true;
  private _filterBy: string = '';
  private _fromHours: number = 0;
  private _toHours: number = Number.MAX_SAFE_INTEGER;
  filterFields: any[] = [
    {
      disp: 'Employee Name',
      prop: 'fullName'
    },
    {
      disp: 'Manager Name',
      prop: 'managerFullName'
    },
    {
      disp: 'Education Hours',
      prop: 'hours'
    }];
  private _filterField: string = 'fullName';
  public get filterField(): string {
    return this._filterField;
  }
  public set filterField(v: string) {
    this._filterField = v;
    this.filterBy = '';
    this.fromHours = 0;
    this.toHours = Number.MAX_SAFE_INTEGER;
  }
  private _sortBy: string = 'fullName';
  public get sortBy(): string {
    return this._sortBy;
  }
  public set sortBy(v: string) {
    this._sortBy = v;
    this.sortUsers();
  }
  private _sortAscend: boolean = true;
  public get sortAscend(): boolean {
    return this._sortAscend;
  }
  public set sortAscend(v: boolean) {
    this._sortAscend = v;
    this.sortUsers();
  }
  openCourse: string = '';
  public get filterBy(): string {
    return this._filterBy;
  }
  public set filterBy(val: string) {
    this._filterBy = val;
    this.filterUsers();
  }
  public get fromHours(): number {
    return this._fromHours;
  }
  public set fromHours(val: number) {
    this._fromHours = val;
    this.filterUsers();
  }
  public get toHours(): number {
    return this._toHours;
  }
  public set toHours(val: number) {
    this._toHours = val;
    this.filterUsers();
  }
  private userListSetSub: Subscription = new Subscription;
  private userListChangedSub: Subscription = new Subscription;
  notif: NotifMsg = { type: 'user-error', msg: '', timeout: 0 };


  constructor(private empServ: EmployeeService, private courseServ: CourseService, private router: Router,
    private notifServ: NotificationService, private authServ: AuthService) { }

  ngOnInit() {
    this.userList = this.empServ.userList;
    if (this.userList) {
      this.courseServ.getYearlyTargetHours().subscribe(hours => {
        this.yearlyHoursTarget = Math.max(hours, 1);
        this.setColors();
      });
    }
    this.userListChangedSub = this.empServ.userListChangedEvent.subscribe((userList: IUser[]) => {
      this.userList = userList;
      this.courseServ.getYearlyTargetHours().subscribe(hours => {
        this.yearlyHoursTarget = Math.max(hours, 1);
        this.setColors();
      });
    });
    this.courseServ.openedCourseChanged.subscribe((courseName: string) => {
      this.openCourse = courseName;
      this.setColors();
    });
    if (this.smallDisp) { this.widthAdjust = 1; }
  }

  setColors(): void {
    if (this.userList) {
      this.userList.forEach(user => {
        if (user === undefined)
          return
        user['style'] = {};
        if (this.isInCourse(user, this.openCourse)) {
          user['style']['outline'] = 'solid red';
        } else if (this.isInCourseFamily(user, this.openCourse)) {
          user['style']['outline'] = 'solid orange';
        } else {
          user['style']['outline'] = '';
        }
        if (user.hours >= this.yearlyHoursTarget) {
          user['style']['background-color'] = '#8bc58b';
        } else {
          user['style']['background-color'] = '';
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.userListSetSub) { this.userListSetSub.unsubscribe(); }
    if (this.userListChangedSub) { this.userListChangedSub.unsubscribe(); }
    this.empServ.setOpenedUser(new IUser);
  }

  filterPmsUsers() {
    const { ID } = this.authServ.currentUser
    // const ID = 548 // shiran kaufman
    // const ID = 34 // efrat turgeman
    // const ID = 405 // oren
    this._userList = this.empServ.getAllManagersEmployeesOffline(ID);
    this.filterUsers();
  }

  filterUsers() {
    if (this.filterBy === '' && this.filterField !== 'hours') {
      this.visibleUserList = this.userList.slice(0);
    } else {
      if (this.filterField === 'hours') {
        this.visibleUserList = this.userList.filter((user: IUser) => {
          if (typeof user[this.filterField] === 'undefined') { return false; }
          return (user[this.filterField] >= this._fromHours && user[this.filterField] <= this._toHours);
        });
      } else {
        this.visibleUserList = this.userList.filter((user: IUser) => {
          if (!user[this.filterField]) { return false; }
          return user[this.filterField].toLocaleLowerCase().indexOf(this.filterBy.toLocaleLowerCase()) > -1;
        });
      }
    }
    this.sortUsers();
  }

  sortUsers() {
    const val: number = this.sortAscend ? 1 : -1;
    this.visibleUserList.sort((a, b) => (a[this.sortBy] >= b[this.sortBy]) ? val : -val);
  }

  goToDetails(ID: number): void {
    this.router.navigate(['employees', ID]);
  }

  removeUser(user: IUser, courseName: string): void {
      this.courseServ.getCourseAttendance(courseName).subscribe((attendList) => {
        if (attendList.map(item => item.ID).includes(user.ID)) {
          this.notif.type = 'user-error';
          // tslint:disable-next-line:quotemark
          this.notif.msg = "User is marked as 'attended' so he can't be removed. Change he's attendance and try again";
          this.notifServ.notify(this.notif);
        } else {
          this.courseServ.removeParticipant(courseName, user.ID).subscribe(isSucsess => {
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

  drag(ev: any) {
    const data = {
      type: 'user',
      ID: ev.item.ID
    };
    ev.event.dataTransfer.setData('text', JSON.stringify(data));
  }

  isInCourse(user: IUser, courseName: string) {
    if (courseName === '') {
      return false;
    }
    return user.yearCourses.includes(courseName);
  }

  isInCourseFamily(user: IUser, courseName: string) {
    if (courseName === '') {
      return false;
    }
    const suffixInd = courseName.match(Constants.courseSuffRegEx) ? courseName.match(Constants.courseSuffRegEx)!.index : -1;

    return [...user.yearCourses, ...user.allCourses].map(course => course.slice(0, suffixInd)).includes(courseName.slice(0, suffixInd));
  }

  userOpened(user: IUser | ''): void {
    if (user !== '') {
      this.empServ.setOpenedUser(user);
      this.userList = this.empServ.userList;
      this.filterUsers();
    } else {
      this.empServ.setOpenedUser(new IUser);
    }
  }

  dropped(ev: {event: DragEvent, item: IUser}) {
    try {
      const data = ev.event.dataTransfer ? JSON.parse(ev.event.dataTransfer.getData('text')) : {};
      if (data['type'] && data['type'] === 'course') {
        const courseName = data['name'];
        if (!ev.item.yearCourses.includes(courseName)) {
          this.courseServ.addParticipant(courseName, ev.item).subscribe(isSucsess => {
            if (!isSucsess) {
              this.notif.type = 'user-error';
              this.notif.msg = 'Something went wrong, could not add user to course';
            } else {
              this.notif.type = 'notification';
              this.notif.msg = 'Added user to course';
            }
            this.notifServ.notify(this.notif);
          });
        }
      }
    } catch (e) {
      return;
    }
  }
}
