import { Injectable } from '@angular/core';
import { Http, Headers, Response, RequestOptions } from '@angular/http';
import { map } from 'rxjs/operators';
import { Observable, Subject, of } from 'rxjs';
import * as moment from 'moment';

import { ICourse, IUser, CourseDate } from '../models/index';
import { EmployeeService } from './employee.service';
import { Constants } from '../common';
import { NotifMsg, NotificationService } from './notification.service';
import { AuthService } from './auth.service';
import { data_server } from 'src/urls';


@Injectable()
export class CourseService {
  private addCourseRequest = 'addCourse';
  private addUserToCourseRequest = 'addUserToCourse';
  private removeCourseRequest = 'removeCourse';
  private removeUserFromCourseRequest = 'removeUserFromCourse';
  private getAllCourseDataRequest = 'getAllCoursesData';
  private searchCoursesRequest = 'searchCourses';
  private getCourseRequest = 'getCourse';
  private getCourseExistsRequest = 'getCourseExists';
  private sendInvitesRequest = 'sendInvites';
  private updateYearlyBudgetRequest = 'updateYearlyBudget';
  private getYearlyBudgetRequest = 'getYearlyBudget';
  private updateYearlyTargetHoursRequest = 'updateYearlyTargetHours';
  private getYearlyTargetHoursRequest = 'getYearlyTargetHours';
  private getCourseAttendanceRequest = 'getCourseAttendance';
  private setUserAttendedRequest = 'setUserAttended';
  private removeUserAttendedRequest = 'removeUserAttended';
  private getAllCoursesWithAttendedRequest='getAllCoursesWithAttended';
  private getHoursPreciseRequest ='getHoursPrecise';
  private getHoursTentativeRequest ='getHoursTentative';
  private getHoursPredictedRequest ='getHoursPredicted';
  private getSumEmpPerMonthRequest ='getSumEmpPerMonth';
  private addTentativeCourseRequest = 'addTentativeCourse';
  private getAllCoursesNameRequest = 'getAllCoursesName';
  private getSumEmpPerMonthPerManagerRequest = 'getSumEmpPerMonthPerManager';
  private getPredictOldYearDataPerMonthRequest = 'getPredictOldYearDataPerMonth';
  private getPreciseOldYearDataPerMonthrRequest = 'getPreciseOldYearDataPerMonth';
  private getAmountEmployeesRequest = 'getAmountEmployees';

  private courseListChanged: Subject<ICourse[]> = new Subject<ICourse[]>();
  public courseListChangedEvent = this.courseListChanged.asObservable();
  public yearlyCourseList: ICourse[] = [];
  public openedCourseChanged: Subject<string> = new Subject<string>();
  private year: number = new Date().getFullYear();
  notif: NotifMsg = { type: 'user-error', msg: '', timeout: 0 };
  private _openCourse: string = '';
  set openCourse(courseName: string) {
    this._openCourse = courseName;
    this.openedCourseChanged.next(courseName);
  }
  get openCourse(): string {
    return this._openCourse;
  }
  private numServCalls: number = 0;

  constructor(private http: Http, private empServ: EmployeeService, private notifServ: NotificationService, private authServ: AuthService) {
    this.init();
  }

  init(): void {
    this.getAllCourses();
  }

  getAllCourses(): void {
    let CoursesWithAttended :string[]=[];
    this.getAllCoursesWithAttended().subscribe(courseList=>{
      courseList.forEach(courseName => {
        CoursesWithAttended.push(courseName);
      });
     
    this.getAllCoursesFromServer(CoursesWithAttended).subscribe(courseList => {
      courseList.forEach(course => {
        course.name = course.name.slice(0, -5);
      });
      this.yearlyCourseList = courseList;
      this.courseListChanged.next(this.yearlyCourseList);
    });
  });
  }

  getRequest(requestOperation: string): Observable<Response> {
    return this.http.get(data_server + '/' + requestOperation + '/' + this.year);
  }

  postRequest(body: string, requestOperation: string,year:number=0): Observable<Response> {
    return this.http.post(
      data_server + '/' + requestOperation + '/' +  (year===0 ? this.year:year),
      body,
      new RequestOptions({
        headers: new Headers({ 'Content-Type': 'application/json' })
      })
    );
  }

  searchCourses(searchTerm: string): Observable<string[]> {
    return this.getRequest(this.searchCoursesRequest + '/' + searchTerm).pipe(map(res => {
      const resJson = res.json();
      const foundCourses: string[] = [];
      resJson.forEach((course: any) => foundCourses.push(course.CourseName.slice(0, -5)));
      return foundCourses;
    }));
  }

  getAllCoursesWithAttended(): Observable<string[]> {
    return this.getRequest(this.getAllCoursesWithAttendedRequest).pipe(map(res => {
      const resJson = res.json();
      const Courses: string[] = [];
      resJson.forEach((course: any) => Courses.push(course.CourseName));
      return Courses;
    }));
  }

  getAllCoursesNames(): Observable<string[]> {
    return this.getRequest(this.getAllCoursesNameRequest).pipe(map(res => {
      const resJson = res.json();
      const Courses: string[] = [];
      resJson.forEach((course: any) => Courses.push((course.CourseName).slice(0, -5).toLocaleLowerCase()));
      return Courses;
    }));
  }

  getCourse(name: string): Observable<ICourse> {
    return this.getRequest(this.getCourseRequest + '/' + this.name2Url(name)).pipe(map(res => {
      return this.courseTable2Obj(res.json(), name);
    }));
  }

  getYearlyBudget(): Observable<number> {
    return this.getRequest(this.getYearlyBudgetRequest).pipe(map(res => {
      return res.json().yearlyBudget;
    }));
  }

  updateYearlyBudget(budget: number): Observable<Response> {
    return this.postRequest(JSON.stringify({budget: budget}), this.updateYearlyBudgetRequest);
  }

  getYearlyTargetHours(): Observable<number> {
    return this.getRequest(this.getYearlyTargetHoursRequest).pipe(map(res => {
      return res.json().yearlyTargetHours;
    }));
  }

  getHoursPrecise(): Observable<any> {
    return this.getRequest(this.getHoursPreciseRequest).pipe(map(res => {
      return res.json();
    }));
  }

  getSumEmpPerMonthPerManager(ID:number): Observable<any> {
    return this.getRequest(this.getSumEmpPerMonthPerManagerRequest + '/' + ID).pipe(map(res => {
      return res.json();
    }));
  }

  getPredictOldYearDataPerMonth(ID:number,targetYear:number): Observable<any> {
    return this.getRequest(this.getPredictOldYearDataPerMonthRequest + '/' + ID +  '/' +targetYear).pipe(map(res => {
      return res.json();
    }));
  }

  getPreciseOldYearDataPerMonth(ID:number,targetYear:number): Observable<any> {
    return this.getRequest(this.getPreciseOldYearDataPerMonthrRequest + '/' + ID + '/' + targetYear).pipe(map(res => {
      return res.json();
    }));
  }

  getAmountEmployees(ID:number): Observable<any> {
    return this.getRequest(this.getAmountEmployeesRequest + '/' + ID ).pipe(map(res => {
      return res.json();
    }));
  }

  getHoursTentative(): Observable<any> {
    return this.getRequest(this.getHoursTentativeRequest).pipe(map(res => {
      return res.json();
    }));
  }

  getHoursPredicted(): Observable<any> {
    return this.getRequest(this.getHoursPredictedRequest).pipe(map(res => {
      return res.json();
    }));
  }

  getSumEmpPerMonth(): Observable<any> {
    return this.getRequest(this.getSumEmpPerMonthRequest).pipe(map(res => {
      return res.json();
    }));
  }
  
  updateYearlyTargetHours(hours: number): Observable<Response> {
    return this.postRequest(JSON.stringify({hours: hours}), this.updateYearlyTargetHoursRequest);
  }

  isCourseExists(name: string, startYear: number): Observable<boolean> {
    return this.getRequest(this.getCourseExistsRequest + '/' + this.name2Url(name) + '/' + startYear).pipe(map(res => {
      return (res.json().length > 0);
    }));
  }

  getCourseAttendance(name: string): Observable<any[]> {
    return this.getRequest(this.getCourseAttendanceRequest + '/' + this.name2Url(name)).pipe(map(res => {
      const resJson = res.json();
      const returnObjArray = resJson.map((item: any) => {
        const obj = {dateTimeStart: new Date(item.DateTimeStart), dateTimeEnd: new Date(item.DateTimeEnd), ID: item.ID};
        return obj;
      });
      return returnObjArray;
    }));
  }

  setUserAttended(user: IUser, courseName: string, dateTimeStart: Date, dateTimeEnd: Date,CourseYear:number,CourseYearInName:number): Observable<Response> {
    if(CourseYearInName!==0 && CourseYear!==CourseYearInName){
      return this.postRequest('', this.setUserAttendedRequest + '/' + user.ID + '/' + this.name2Url(courseName) +
      '/' +  dateTimeStart.toISOString() + '/' + dateTimeEnd.toISOString(),CourseYearInName);
    }
    else{
    return this.postRequest('', this.setUserAttendedRequest + '/' + user.ID + '/' + this.name2Url(courseName) +
                              '/' +  dateTimeStart.toISOString() + '/' + dateTimeEnd.toISOString());
    }
  }

  setUserDidNotAttend(user: IUser, courseName: string, dateTimeStart: Date, dateTimeEnd: Date,CourseYear:number,CourseYearInName:number): Observable<Response> {
    if(CourseYearInName!==0 && CourseYear!==CourseYearInName){
    return this.postRequest('', this.removeUserAttendedRequest + '/' + user.ID + '/' + this.name2Url(courseName) +
                              '/' +  dateTimeStart.toISOString() + '/' + dateTimeEnd.toISOString(),CourseYearInName);
    }
    else{
      return this.postRequest('', this.removeUserAttendedRequest + '/' + user.ID + '/' + this.name2Url(courseName) +
                              '/' +  dateTimeStart.toISOString() + '/' + dateTimeEnd.toISOString());
    }
  }

  addCourse(course: ICourse, exists: boolean, startYear: number, origYear?: number): Observable<Response> {
    if(course.isTentative){
      return this.postRequest(JSON.stringify(course),
      this.addTentativeCourseRequest + '/' + exists  + '/' + startYear + '/' + (origYear ? origYear : startYear));
    } else {
      return this.postRequest(JSON.stringify(course),
      this.addCourseRequest + '/' + exists + '/' + startYear + '/' + (origYear ? origYear : startYear));
    }
  }

  removeCourse(courseName: string): Observable<Response> {
    return this.postRequest(JSON.stringify({'courseName': courseName}), this.removeCourseRequest);
  }

  getAllCoursesFromServer(atendedCourseList:string[]=[]): Observable<ICourse[]> {
    return this.getRequest(this.getAllCourseDataRequest).pipe(map(res => {
      const courses: ICourse[] = [];
      const courseJson = res.json();
      let uniqueCourseNames: string[] = courseJson.map((course: any) => course.CourseName);
      uniqueCourseNames = Array.from(new Set(uniqueCourseNames));
      for (const courseName of uniqueCourseNames) {
        const newCourse: ICourse = this.courseTable2Obj(courseJson, courseName,atendedCourseList);
        courses.push(newCourse);
      }
      return courses;
    }));
  }

  sendInvites(courseName: string): Observable<Response> {
    const data = {
      courseName: courseName,
      fromUserID: this.authServ.currentUser.ID,
      fromFullName: this.authServ.currentUser.fullName
    };
    return this.postRequest(JSON.stringify(data), this.sendInvitesRequest);
  }

  courseTable2Obj(table: any, courseName: string,attendedCoursesList:string[]=[]): ICourse {
    const indCheck = table.findIndex((item: any) => item.CourseName.includes(courseName));
    let check_year=0
    if (indCheck !== -1){
      let temp_check_year=table[indCheck].CourseName.slice( table[indCheck].CourseName.length-4, table[indCheck].CourseName.length)
      check_year=Number(temp_check_year)
    }
    const suffInd = courseName.match(Constants.courseSuffWithYearRegEx);
    if (!suffInd) 
    {
      if(check_year== this.year){
      courseName += ' ' + this.year; 
      }
      else{
        courseName += ' ' + check_year; 
      }
    }
    //const ind = table.findIndex((item: any) => item.CourseName.includes(courseName));
    var ind = table.findIndex((item: any) => item.CourseName === courseName);
    if (ind === -1) {return new ICourse; }
    const newCourse = new ICourse(
      table[ind].CourseName,
      table[ind].Lecturer,
      [],
      table[ind].Syllabus,
      table[ind].TotalHours,
      [],
      table[ind].Price,
      table[ind].Notes,
      table[ind].TextForMail,
      table[ind].Location,
      table[ind].IsIn,
      table[ind].IsMandatory,
      table[ind].CourseType,
      table[ind].IsConference,
      false,
      table[ind].Year,
      check_year,
      table[ind].Creator,
      table[ind].isTentative,
      table[ind].participantsAmountEstimated,
      table[ind].participantsAmount
      );
    const newParti: string[] = [];
    let allLocalUsers: boolean = true;
    if(attendedCoursesList!=undefined && attendedCoursesList.includes(newCourse.name)){ 
        newCourse.isAttended=true;
    }
    if (attendedCoursesList.length == 0) {
    table.forEach((tabelLine: any) => {
      if (tabelLine.CourseName === courseName) {
        if (!newCourse.participants ||
           (tabelLine.ID &&
            newCourse.participants.findIndex(user => user.ID === tabelLine.ID) === -1 &&
            newParti.findIndex(ID => ID === tabelLine.ID) === -1)) {
          let newUser: IUser;
          let isLocalUser: boolean = false;
          if (this.empServ.userList) {
            const userInd = this.empServ.userList.map(user => user.ID).indexOf(tabelLine.ID);
            if (userInd > -1) {
              newUser = this.empServ.userList[userInd];
              newCourse.participants.push(newUser);
              isLocalUser = true;
            }
          }
          if (!isLocalUser) {
            allLocalUsers = false;
            this.numServCalls++;
            this.empServ.getUser(tabelLine.ID).subscribe(userDetails => {
              newUser = userDetails;
              newCourse.participants.push(newUser);
              this.numServCalls--;
              if (this.numServCalls === 0) {
                this.courseListChanged.next(this.yearlyCourseList);
              }
            });
          }
          newParti.push(tabelLine.ID);
        }
        if (!newCourse.schedule ||
        (tabelLine.DateTimeStart &&
          newCourse.schedule.findIndex(dateTime => moment(dateTime.dateTimeStart).isSame(tabelLine.DateTimeStart)) === -1)) {
          const newDateTime: CourseDate = new CourseDate(new Date(tabelLine.DateTimeStart), new Date(tabelLine.DateTimeEnd));
          newCourse.schedule.push(newDateTime);
        }
      }
    });
    } else {
      if (!suffInd) {newCourse.name = newCourse.name.slice(0, -5); };
      let name = table[ind].CourseName;
      while (name == courseName) {
        if (!newCourse.schedule ||
            (table[ind].DateTimeStart &&
            newCourse.schedule.findIndex(dateTime => moment(dateTime.dateTimeStart).isSame(table[ind].DateTimeStart)) === -1)) {
              const newDateTime: CourseDate = new CourseDate(new Date(table[ind].DateTimeStart), new Date(table[ind].DateTimeEnd));
              newCourse.schedule.push(newDateTime);
        }
        ind++;
        if (ind == table.length) {
          break;
        }
        name = table[ind].CourseName;
      }
    }
    if (allLocalUsers) {
      this.courseListChanged.next(this.yearlyCourseList);
    }
    if (!suffInd) {newCourse.name = newCourse.name.slice(0, -5); }
    return newCourse;
  }
  
  getCourseParticipants(courseName: string): void {
    const ind = this.yearlyCourseList.findIndex((item: any) => item.name === courseName);
    this.getCourse(courseName).subscribe(courseDetails => {
      let course = courseDetails;
      this.yearlyCourseList[ind].participants = course.participants;
      this.courseListChanged.next(this.yearlyCourseList);   
    }); 
  }

  addParticipant(courseName: string, user: IUser): Observable<boolean> {
    return this.postRequest(JSON.stringify({'courseName': courseName}), this.addUserToCourseRequest + '/' + user.ID).pipe(map(res => {
      const isSucsess = (res.text().toLocaleLowerCase() === 'added');
      if (isSucsess) {
        const courseInd = this.yearlyCourseList.findIndex(course => course.name === courseName);
        if (courseInd > -1) {
          this.yearlyCourseList[courseInd].participants.push(user);
          this.empServ.addCourseToUser(this.yearlyCourseList[courseInd], user.ID);
          this.checkDatesCollision(user.ID, this.yearlyCourseList[courseInd]);
        }
        this.courseListChanged.next(this.yearlyCourseList);
      }
      return isSucsess;
    }));
  }

  removeParticipant(courseName: string, ID: number): Observable<boolean> {
    return this.postRequest(JSON.stringify({'courseName': courseName}), this.removeUserFromCourseRequest + '/' + ID).pipe(map(res => {
      const isSucsess = (res.text().toLocaleLowerCase() === 'removed');
      if (isSucsess) {
        const courseInd = this.yearlyCourseList.findIndex(course => course.name === courseName);
        if (courseInd > -1) {
          const empInd = this.yearlyCourseList[courseInd].participants.findIndex(currUser => currUser.ID === ID);
          if (empInd > -1) {
            this.yearlyCourseList[courseInd].participants.splice(empInd, 1);
          }
          this.empServ.removeCourseFromUser(this.yearlyCourseList[courseInd], ID);
        }
        this.courseListChanged.next(this.yearlyCourseList);
      }
      return isSucsess;
    }));
  }

  getNewNumberForCourse(courseName: string): Observable<string> {
    const suffixInd = courseName.match(Constants.courseSuffRegEx)!.index;
    if (suffixInd === undefined) {
      return of('ERROR');
    }
    const courseFamily: string = courseName.slice(0, suffixInd);
    let lastNum = 0;
    return this.searchCourses(courseFamily).pipe(map(foundCourses => {
      foundCourses.forEach((currCourseName: string) => {
        if (currCourseName.indexOf(courseFamily) > -1) {
          const currNum: number = +currCourseName.slice(suffixInd + 1);
          lastNum = lastNum > currNum ? lastNum : currNum;
        }
      });
      lastNum++;
      return courseFamily + '#' + lastNum;
    }));
  }

  setOpenedCourse(courseName: string): void {
    if (courseName != '') {
      this.getCourseParticipants(courseName);
    }
    this.openCourse = courseName;
  }

  url2Name(url: string): string {
    let name: string = url.replace(/_/g, ' ');
    name = name.replace(Constants.courseSuffUrlRegEx, (str: string) => str.replace('&', '#'));
    return name;
  }

  name2Url(name: string): string {
    let url: string = name.replace(/\s/g, '_');
    url = url.replace(Constants.courseSuffRegEx, (str: string) => str.replace('#', '&'));
    return url;
  }

  yearChanged(newYear: number) {
    this.year = +newYear;
    this.empServ.yearChanged(this.year);
    this.getAllCourses();
  }

  getYear(): number {
    return this.year;
  }

  checkDatesCollision(ID: number, course: ICourse) {
    const courseDates: string[] = [];
    course.schedule.forEach(date => {
      courseDates.push(date.dateTimeStart.toLocaleDateString());
    });
    const otherCoursesDates: string[] = [];
    this.yearlyCourseList.forEach(yearlyCourse => {
      if (yearlyCourse !== course) {
        if (yearlyCourse.participants.map(partic => partic.ID).includes(ID)) {
          yearlyCourse.schedule.forEach(date => {
            otherCoursesDates.push(date.dateTimeStart.toLocaleDateString());
          });
        }
      }
    });
    const uniqueDates = Array.from(new Set(otherCoursesDates));
    const allCourseDates = otherCoursesDates.concat(courseDates);
    const uniqueAllDates = Array.from(new Set(allCourseDates));
    const uniqueCourseDates = Array.from(new Set(courseDates));
    if ((uniqueAllDates.length - uniqueDates.length) < (uniqueCourseDates.length)) {
      this.notif.type = 'user-error';
      this.notif.msg = 'User has other course on the same date!';
      this.notifServ.notify(this.notif);
    }
  }
}