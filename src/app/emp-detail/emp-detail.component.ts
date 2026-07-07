import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { Subscription } from 'rxjs';
import * as moment from 'moment';

import { IUser, ICourse } from '../models';
import { EmployeeService, CourseService } from '../services';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'coma-emp-detail',
  templateUrl: './emp-detail.component.html',
  styleUrls: ['./emp-detail.component.css']
})
export class EmpDetailComponent implements OnInit, OnDestroy {
  user: IUser = new IUser;
  yearCourses: {[key: string]: ICourse[]} = {};
  courseListInit: {[key: string]: ICourse[]} = {
    'Technical': [],
    'Enrichment': [],
    'Conference': []
  };
  otherCourses: string[] = [];
  percent: number = 0;
  yearChangedSub: Subscription = new Subscription;
  teamAvgHours: number | null = null;
  teamArray: {ID: number, fullName: string, hours: number}[] = [];
  yearlyHoursTarget: number = 0;
  yearArray: string[] = Array.from(Array(30).keys()).map(year => String(year + 2018));
  year:string='all';
  constructor(private empServ: EmployeeService, private route: ActivatedRoute, private courseServ: CourseService,
    public sanitizer: DomSanitizer) {
      this.yearArray = ['all'].concat( this.yearArray) 
      this.year='all';
     }
   
    
  ngOnInit() {
    this.route.params.forEach((params: Params) => {
      this.teamAvgHours = null;
      this.teamArray = [];
      const ID: number = Number(params['ID']);
      if (ID) {
        this.courseServ.getYearlyTargetHours().subscribe(hours => {
          this.yearlyHoursTarget = Math.max(hours, 1);
          this.getUser(ID);
        });
        this.yearChangedSub = this.empServ.yearChangedObs.subscribe(() => {
          this.courseServ.getYearlyTargetHours().subscribe(hours => {
            this.yearlyHoursTarget = Math.max(hours, 1);
            this.getUser(ID);
          });
        });
      }
    });
  }

  ngOnDestroy() {
    if (this.yearChangedSub) {this.yearChangedSub.unsubscribe(); }
  }

  getUser(ID: number): void {
    this.empServ.getUser(ID).subscribe(userDetails => {
      this.user = userDetails;
      this.yearCourses = JSON.parse(JSON.stringify(this.courseListInit));
      for (const courseName of this.user.yearCourses) {
        this.courseServ.getCourse(courseName).subscribe(course => {
          this.pushToCorrectList(course);
        });
      }
      this.otherCourses = this.user.allCourses.filter(courseName => {
        return (+courseName.slice(-4) !== this.courseServ.getYear());
      });
      this.percent = Math.min(this.user.hours / this.yearlyHoursTarget, 1);
      this.empServ.getManagerDirectEmployees(ID).subscribe(empArray => {
        empArray = empArray.filter(emp=>emp.Category=='SIRC');
        if (empArray && empArray.length > 0) {
          this.teamAvgHours = empArray. map(emp => emp.hours).reduce((sum, hour) => sum + hour, 0) / (empArray.length);
          this.teamArray = empArray;
        }
      });
    });
  }

  pushToCorrectList(course: ICourse): void {
    let fieldName = 'Conference';
    if (!course.isConference) {
      if (course.courseType === 0) {
        fieldName = 'Technical';
      } else {
        fieldName = 'Enrichment';
      }
    }
    this.yearCourses[fieldName].push(course);
    if (this.isInPast(course)) {
      this.empServ.didUserAttendCourse(this.user.ID, course.name).subscribe(attended => {
        if (!attended) {
          this.yearCourses[fieldName][this.yearCourses[fieldName].indexOf(course)]['style'] = {'background-color' : 'red'};
        }
      });
    }
  }

  isInPast(course: ICourse): boolean {
    const now = moment();
    const maxDate = moment.max(course.schedule.map(item => moment(item.dateTimeStart)));
    return (maxDate.isBefore(now));
  }

  exportToExcel() {
    let yearToFiler:number = this.year=='all'?0:Number(this.year)
    this.empServ.exportToExcel(this.user.ID,yearToFiler);
  }

}
  

  

