import { Component, OnInit, OnDestroy } from '@angular/core';
import * as moment from 'moment';
import { Subscription } from 'rxjs';

import { ICourse } from '../models';
import { CourseService, EmployeeService, NotifMsg, NotificationService } from '../services';


@Component({
  selector: 'coma-budget',
  templateUrl: './budget.component.html',
  styleUrls: ['./budget.component.css']
})
export class BudgetComponent implements OnInit, OnDestroy {
  courseList: ICourse[] = [];
  monthlyCost: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  yearlyBudget: number = 12000;
  monthlyBudget: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  avgMonthlyCost: number = 0;
  editable: boolean = false;
  year: number = moment().year();
  private courseListChangedSub: Subscription = new Subscription;
  private yearChangedSub: Subscription = new Subscription;

  public lineChartData: Array<any> = [
    {data: this.monthlyCost, label: 'Monthly Cost'},
    {data: this.monthlyBudget, label: 'Monthly Budget'},
  ];
  public lineChartLabels: Array<any> = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'Spetember',
                                        'October', 'November', 'December'];
  public lineChartOptions: any = {
    responsive: true
  };
  public lineChartLegend: boolean = true;
  public lineChartType: string = 'line';
  notif: NotifMsg = { type: 'notification', msg: '', timeout: 0 };

  constructor(private courseServ: CourseService, private empServ: EmployeeService, public notifServ: NotificationService) { }

  ngOnInit() {
    this.year = this.courseServ.getYear();
    this.courseList = this.courseServ.yearlyCourseList;
    this.courseServ.getYearlyBudget().subscribe(budget => {
      this.yearlyBudget = budget;
      if (this.courseList) {
        this.calcVals();
      }
    });
    if (this.courseList) {
      this.calcVals();
    }
    this.courseListChangedSub = this.courseServ.courseListChangedEvent.subscribe((courseList: ICourse[]) => {
      this.courseList = courseList;
      this.calcVals();
    });
    this.yearChangedSub = this.empServ.yearChangedObs.subscribe(() => {
      this.courseServ.getYearlyBudget().subscribe(budget => {
        this.year = this.courseServ.getYear();
        this.yearlyBudget = budget;
        this.calcVals();
      });
    });
  }

  calcVals() {
    this.monthlyCost = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.monthlyBudget = [];
    this.avgMonthlyCost = 0;
    for (const course of this.courseList) {
      const startDate = moment.min(course.schedule.map(item => moment(item.dateTimeStart)));
      this.monthlyCost[startDate.month()] += course.price;
    }
    for (let i = 0; i < 12; i++) {
      this.monthlyBudget.push(this.yearlyBudget / 12);
      this.avgMonthlyCost += this.monthlyCost[i];
    }
    this.avgMonthlyCost /= 12;
    const _lineChartData: Array<any> = new Array(2);
    _lineChartData[0] = {data: this.monthlyCost, label: 'Monthly Cost' };
    _lineChartData[1] = {data: this.monthlyBudget, label: 'Monthly Budget'};
    this.lineChartData = _lineChartData;
  }

  ngOnDestroy(): void {
    if (this.courseListChangedSub) {this.courseListChangedSub.unsubscribe(); }
    if (this.yearChangedSub) {this.yearChangedSub.unsubscribe(); }
  }

  saveBudget(): void {
    if (this.yearlyBudget && this.yearlyBudget > 0) {
      this.courseServ.updateYearlyBudget(this.yearlyBudget).subscribe(() => {
        this.notif.msg = 'Updated yearly budget for ' + this.year;
        this.notifServ.notify(this.notif);
        this.editable = !this.editable;
        this.calcVals();
      });
    }
  }

}
