import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Http, Response } from '@angular/http';
import { IUser, ICourse } from '../models';
import { Constants } from '../common';
import { avatars_server, data_server } from 'src/urls';
import * as XLSX from 'xlsx';

@Injectable()
export class EmployeeService {  
  public allUserList: IUser[] = [];
  public userList: IUser[] = [];
  private userListChanged: Subject<IUser[]> = new Subject<IUser[]>();
  public userListChangedEvent = this.userListChanged.asObservable();
  public openedUserChanged: Subject<IUser> = new Subject<IUser>();
  public yearChangedObs: Subject<number> = new Subject<number>();
  private year: number =  new Date().getFullYear();

  private _openUser: IUser = new IUser;
  set openUser(v: IUser) {
    this._openUser = v;
    this.openedUserChanged.next(v);
  }
  get openUser(): IUser {
    return this._openUser;
  }

  constructor(private http: Http) {
    this.init();
  }

  init(): void {
    this.getAllUsers();
  }

  getNumOfSIRCUsers(): number {
    if (this.userList === undefined || this.userList === null)
      return 0;
    return this.userList.filter(u => this.is_active(u)).length;
  }

  getNumOfSIRCUsersPerMonth(month: number): number {
    if (this.userList === undefined || this.userList === null)
      return 0;
    return this.userList
        .filter(user => this.isUserInMonthForReport(user, month))
        .filter(user => this.is_active(user))
        .length;
  }

  isUserInMonthForReport(user: IUser, month: number): boolean {
    const start_relevant = !user.startDate || user.startDate.getMonth() < month
    const end_relevant = !user.endDate || user.endDate.getMonth() > month
    return start_relevant && end_relevant;
  }

  isIDRelevantForRprt(ID: number): boolean {
    const user = this.userList.find(u => u.ID == ID)
    if (user === undefined)
      return false
    return this.is_active(user);
  }

  is_active(user: IUser): boolean {
    if (!user.category)
      return false
    const category_norm = user.category.toLocaleLowerCase()
    return category_norm !== 'student' && category_norm !== 'contractor';
  }

  getAllUsers(): void {
    this.getAllUsersFromServer().subscribe(users => {
      this.allUserList = users;
      this.filterUserList();
      this.userList.sort((a, b) => (a.fullName > b.fullName) ? 1 : -1);
      this.userListChanged.next(this.userList);
    });
  }

  filterUserList(): void {
    this.userList = this.allUserList.filter(u => {
      const start_ok = !u.startDate || u.startDate!.getFullYear() <= this.year
      const end_ok = !u.endDate || u.endDate!.getFullYear() >= this.year
      return start_ok && end_ok
    })
  }

  getRequest(requestOperation: string): Observable<Response> {
    return this.http.get(`${data_server}/${requestOperation}/${this.year}`);
  }

  getAllUsersFromServer(): Observable<IUser[]> {
    return this.getRequest('getAllUsers').pipe(map(res => {
      const users_json = res.json();
      let user_ids: number[] = users_json.map((user: any) => user.sircID);
      const unique_ids = Array.from(new Set(user_ids));
      const users = unique_ids.map(id => this.userTable2Obj(users_json, id, false))
      return users;
    }));
  }

  getUser(ID: number): Observable<IUser> {
    return this.getRequest(`getUserDetails/${ID}`).pipe(map(res => {
      return this.userTable2Obj(res.json(), ID, true);
    }));
  }


  getUserCourses(ID: number): void {
    this.getRequest(`getAllUserCourses/${ID}`).subscribe(res => {
      const table = res.json();
      const user = this.userList.find(u => u.ID === ID)
      if (user === undefined)
        return
      table.forEach((tabelLine: any) => {
        if (!user.yearCourses ||
        (tabelLine.CourseName && user.allCourses.findIndex(courseName => courseName === tabelLine.CourseName) === -1)) {
          user.allCourses.push(tabelLine.CourseName);
          if (+tabelLine.CourseYear === this.year) {
            user.yearCourses.push(tabelLine.CourseName.slice(0, -5));
          }
        }
      });
    });
  }

  getAllEmployeesCourses(ID: number,targetYear:number): Observable<any> {
    return this.getRequest(`getEmployeesCourses/${ID}/${targetYear}`).pipe(map(res => {
      return res.json(); 
    }));
  }

  exportToExcel(ID: number,targetYear:number):void {
    this.getAllEmployeesCourses(ID, targetYear).subscribe(userDetails => {
      let empCourses:any=JSON.parse(JSON.stringify(userDetails));
      const ws:XLSX.WorkSheet = XLSX.utils.json_to_sheet(empCourses[0]);
      let rows = XLSX.utils.decode_range(ws["!ref"]!).e.r;
      let columns = XLSX.utils.decode_range(ws["!ref"]!).e.c;
      XLSX.utils.sheet_add_aoa(ws, [['Total Hours']], {origin:{r:0,c:columns + 1}});
      for (let i=1; i<=rows; i++) {
        let firstCell = XLSX.utils.encode_cell({c:1, r:i});
        let lastCell = XLSX.utils.encode_cell({c:columns, r:i});
        XLSX.utils.sheet_add_aoa(ws, [[{ t:'n', f:"SUM(" + firstCell + ":" + lastCell + ")"}]], {origin:{r:i,c:columns + 1}});
      };
      let firstCell = XLSX.utils.encode_cell({c:columns+1, r:1});
      let lastCell = XLSX.utils.encode_cell({c:columns+1, r:rows});
      XLSX.utils.sheet_add_aoa(ws, [[{ t:'n', f:"SUM(" + firstCell + ":" + lastCell + ")/"+ (rows)}]], {origin:{r:rows+1,c:columns + 1}});
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, 'ExportedList_'+targetYear+'.xlsx');
    });
  }
   

  
  

  didUserAttendCourse(ID: number, courseName: string): Observable<boolean> {
    return this.getRequest(`getDidUserAttendCourse/${ID}/${this.name2Url(courseName)}`).pipe(map(res => {
      return res.json().length > 0;
    }));
  }

  getManagerDirectEmployees(ID: number): Observable<{ID: number,Category:string,fullName: string, hours: number}[]> {
    return this.getRequest(`getManagerDirectEmployees/${ID}`).pipe(map(res => {
      const users_json = res.json();
      users_json.forEach((user_json: any) => {
        user_json.fullName = user_json.firstName + ' ' + user_json.fastName;
        user_json.hours = user_json.EducationHours;
        delete user_json.firstName;
        delete user_json.lastName;
        delete user_json.EducationHours;
      });
      return users_json;
    }));
  }

  getAllManagersEmployeesOffline(ID: number): IUser[] {
    const self: IUser =  this.userList.filter(user => user.ID === ID)[0];
    const employees: IUser[] = [self];
    const direct_reports =  this.userList.filter(user => user.managerID === ID);
    direct_reports.forEach(employee => {
      if (employee.ID===ID)
        return
      const sub_reports = this.getAllManagersEmployeesOffline(employee.ID)
      employees.push(...sub_reports)
    });
    return employees;
  }


  getUserByUserName(userName: string): Observable<IUser> {
    return this.getRequest(`getUserByUserNameDetails/${userName}`).pipe(map(res => {
      return this.userTable2ObjByUserName(res.json(), userName);
    }));
  }

  getUserImageFullPath(userName: string): string {
    return `${avatars_server}${userName}.jpg`;
  }

  removeCourseFromUser(course: ICourse, ID: number): void {
    const userInd = this.userList.findIndex(user => user.ID === ID);
    if (userInd > -1) {
      let courseInd = this.userList[userInd].yearCourses.findIndex(courseName => courseName === course.name);
      if (courseInd > -1) {
        this.userList[userInd].hours -= course.totalHours;
        this.userList[userInd].yearCourses.splice(courseInd, 1);
      }
      const courseFullName = course.name + ' ' + this.year;
      courseInd = this.userList[userInd].allCourses.findIndex(courseName => courseName === courseFullName);
      if (courseInd > -1) {
        this.userList[userInd].allCourses.splice(courseInd, 1);
      }
    }
    this.userListChanged.next(this.userList);
  }

  addCourseToUser(course: ICourse, ID: number): void {
    const userInd = this.userList.findIndex(user => user.ID === ID);
    if (userInd > -1) {
      this.userList[userInd].yearCourses.push(course.name);
      this.userList[userInd].hours += course.totalHours;
      this.userList[userInd].allCourses.push(course.name + ' ' + this.year);
    }
    this.userListChanged.next(this.userList);
  }

  userTable2ObjByUserName(table: any, userName: string): IUser {
    const ind = table.findIndex((u: any) => u.userName === userName);
    if (ind === -1) {
      return new IUser;
    }
    return this.userTable2Obj(table, table[ind].sircID, false);
  }

  userTable2Obj(table: any, ID: number, addCourses: boolean): IUser {
    let user_json = table.find((item: any) => item.sircID === ID);
    if (user_json === undefined)
      return new IUser
    user_json.imageUrl = this.getUserImageFullPath(user_json.userName)
    const newUser = new IUser(
      user_json.sircID,
      user_json.firstName + ' ' + user_json.lastName,
      user_json.managerSircID,
      user_json.managerFirstName + ' ' + user_json.managerLastName,
      user_json.authorizationIdCOMA,
      user_json.email,
      user_json.EducationHours,
      user_json.imageUrl,
      user_json.category
    );

    const startDate = user_json.startDate2 || user_json.startDate
    let endDate = user_json.endDate
    if (user_json.startDate2) {
      endDate = user_json.endDate2
    }
    newUser.startDate = startDate ? new Date(startDate) : startDate;
    newUser.endDate = endDate ? new Date(endDate) : endDate;
    newUser.status = user_json.status;
    if (newUser.status !== "working" && newUser.status != undefined) {
      newUser.fullName += ' (' + newUser.status.toLocaleUpperCase() + ')';
    }
    if (addCourses) {
      table.forEach((tabelLine: any) => {
        if (tabelLine.sircID === ID) {
          if (!newUser.yearCourses ||
          (tabelLine.CourseName && newUser.allCourses.findIndex(courseName => courseName === tabelLine.CourseName) === -1)) {
            newUser.allCourses.push(tabelLine.CourseName);
            if (+tabelLine.CourseName.slice(-4) === this.year) {
              newUser.yearCourses.push(tabelLine.CourseName.slice(0, -5));
            }
          }
        }
      });
    }
    return newUser;
  }

  setOpenedUser(user: IUser): void {
    this.openUser = user;
    if (user.ID) {
      this.getUserCourses(user.ID);
    }
  }

  yearChanged(newYear: number) {
    this.year = +newYear;
    this.userList = [];
    this.getAllUsers();
    this.userListChanged.next(this.userList);
    this.yearChangedObs.next(this.year);
  }

  name2Url(name: string): string {
    let url: string = name.replace(/\s/g, '_');
    url = url.replace(Constants.courseSuffRegEx, (str: string) => str.replace('#', '&'));
    return url;
  }

  getAllCoursesAssigenEmplyees(courseName: string): Observable<any> {
    return this.getRequest(`getCourseAttendanceDetailes/${this.name2Url(courseName)}`).pipe(map(res => {
    return res.json(); 
  }));
}

getAllCoursesAttendanceEmplyees(courseName: string): Observable<any> {
  return this.getRequest(`getCourseAttendancedList/${this.name2Url(courseName)}`).pipe(map(res => {
    return res.json();
  }));
}

  exportToExcelEmplyees(courseName: string):void {
    this.getAllCoursesAssigenEmplyees(courseName).subscribe(empArray => {
    let assignEmp:any=JSON.parse(JSON.stringify(empArray)); 
      const ws:XLSX.WorkSheet = XLSX.utils.json_to_sheet(assignEmp);
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, 'ExportedList.xlsx');
    });
  }

  exportCourseAttendance(course: ICourse): void {
    this.getAllCoursesAttendanceEmplyees(course.name).subscribe(empArray => {
      let test = empArray.forEach((elem: any) => {
        elem[' ']=''
        course.schedule.forEach(element => {
       
          elem[element.dateTimeStart.toLocaleDateString(['en-GB'], {
            year: 'numeric',
            day: '2-digit',
            month: '2-digit',
          })] = ''
        });

      });
      let assignEmp: any = JSON.parse(JSON.stringify(empArray));
      console.log(test)
      console.log(assignEmp)
      var tilte:any = {}
      tilte[course.name]=' '
      var ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet([tilte]);
      var hrAsked:any = {}
      hrAsked['Please return the form to HR at the end of the day']=''
      XLSX.utils.sheet_add_json(ws, [hrAsked], { origin: 'A3' });
      const wb: XLSX.WorkBook = XLSX.utils.book_new()
      XLSX.utils.sheet_add_json(ws, assignEmp, { origin: 'A5' });
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, 'AttendanceList.xlsx');
    });
  }
}
