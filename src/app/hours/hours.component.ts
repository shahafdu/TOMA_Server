import { Component, OnInit, OnDestroy } from '@angular/core';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { Constants } from '../common';

import { ICourse } from '../models';
import { CourseService, EmployeeService, NotifMsg, NotificationService, AuthService } from '../services';


@Component({
  selector: 'coma-hours',
  templateUrl: './hours.component.html',
  styleUrls: ['./hours.component.css']
})
export class HoursComponent implements OnInit, OnDestroy {
  courseList: ICourse[] = [];
  temp: ICourse[] = [];
  monthlyCurrentHours: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  /*new calc*/////////////////////////////////////////////////////// 
  monthlyHoursPredicted: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  monthlyHoursTentative: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  monthlyHoursprecise: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  empPerMonth: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  monthlyHourspreciseToPresent: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  monthlyHoursPredictedToPresent: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  monthlyHoursTentativeToPresent: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  yearly_prescise: number = 0;
  yearly_predict: number = 0;
  monthlyHoursPredictedAvarage: number = 0;
  monthlyHourspreciseAvarage: number = 0;
  iscurrentYear: boolean = false;
  yearly_prescise_includedCurMonth: number = 0;
  yearly_predict_includedCurMonth: number = 0;
  monthlyHoursPredictedAvarage_includedCurMonth: number = 0;
  monthlyHourspreciseAvarage_includedCurMonth: number = 0;
  quarterlyTotalHoursForTableDisplay: number[] = [0, 0, 0, 0];
  quarterlyAvgHoursForTableDisplay: number[] = [0, 0, 0, 0];
  /////////////////////////////
  yearlyTargetHours: number = 60;
  yearly_tentative: number = 0;
  monthly_tentative: number = 0;
  monthlyTargetHours: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  editable: boolean = false;
  isLimitedView: boolean = false;
  year: number = moment().year();
  limitYear =2022;

  totalHoursAtyear: number = 0;
  private courseListChangedSub: Subscription = new Subscription;
  private courseListBeforChangedSub: Subscription = new Subscription;
  private yearChangedSub: Subscription = new Subscription;
  private attendReqSub: Subscription[] = [];

  public lineChartData: Array<any> = [
    { data: this.monthlyHoursPredictedToPresent, label: 'Monthly Actual Hours (predicted)', },
    { data: this.monthlyHourspreciseToPresent, label: 'Monthly Actual Hours (precise)' },
    { data: this.monthlyTargetHours, label: 'Monthly Target Hours' },
    { data: this.monthlyHoursTentativeToPresent, label: 'Monthly Predicted Hours Plan' }
  ];
  public lineChartLabels: Array<any> = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'Spetember',
    'October', 'November', 'December'];
  public lineChartOptions: any = {
    scales: {
      yAxes: [{
        ticks: {
          beginAtZero: true,
          stepValue: 10,
          steps: 20,
          max: 20,
        }
      }]
    },
    responsive: true,
    legend: {
      display: true,
      labels: {
        fontColor: '#FFFFFF'
      }
    }
  };
  public lineChartLegend: boolean = true;
  public lineChartType: string = 'line';
  public barChartColors: Array<any> = [
    {
      backgroundColor: 'rgba(255, 105, 180,0.2)',
      borderColor: 'rgba(255, 105, 180,1)',
      pointBackgroundColor: 'rgba(255, 105, 180,1)',
      pointBorderColor: '#FFFFFF',
      pointHoverBackgroundColor: 'rgba(255, 105, 180,1)',
      pointHoverBorderColor: 'rgba(255, 105, 180)'
    },
    {
      backgroundColor: 'rgba(0, 191, 255,0.2)',
      borderColor: 'rgba(0, 191, 255,1)',
      pointBackgroundColor: 'rgba(0, 191, 255,1)',
      pointBorderColor: '#FFFFFF',
      pointHoverBackgroundColor: 'rgba(0, 191, 255,1)',
      pointHoverBorderColor: 'rgba(0, 191, 255)'
    },
    {

      borderColor: 'rgba(255,255,0,1)',
      pointBackgroundColor: 'rgba(255,255,0,1)',
      pointBorderColor: '#FFFFFF',
      pointHoverBackgroundColor: 'rgba(255,255,0,1)',
      pointHoverBorderColor: 'rgba(255,255,0)',
      fill: false

    },
    {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderColor: 'rgba(255,255,255,1)',
      pointBackgroundColor: 'rgba(255,255,255,1)',
      pointBorderColor: '#FFFFFF',
      pointHoverBackgroundColor: 'rgba(255,255,255,1)',
      pointHoverBorderColor: 'rgba(255,255,255)',

    }
  ];
  notif: NotifMsg = { type: 'notification', msg: '', timeout: 0 };

  constructor(private courseServ: CourseService, private empServ: EmployeeService, public notifServ: NotificationService
    , private authServ: AuthService) { }

  ngOnInit() {
    this.updateIsLimtedView();
    this.year = this.courseServ.getYear();

    this.courseList = this.courseServ.yearlyCourseList;
    this.courseServ.getYearlyTargetHours().subscribe(hours => {
      this.yearlyTargetHours = hours;
      this.updateIsLimtedView();

      if (this.isLimitedView) {
        this.handleLimitedView()
      }
      else {
        this.getValPerMonth();
      }
    });

    this.yearChangedSub = this.empServ.yearChangedObs.subscribe(() => {

      this.courseServ.getYearlyTargetHours().subscribe(hours => {
        this.year = this.courseServ.getYear();
        this.updateIsLimtedView();
        this.yearlyTargetHours = hours;
        if (this.isLimitedView) {
          this.handleLimitedView()
        }
        else {
          this.getValPerMonth();
        }
      });
    });
  }
  /*main function that cacluate all the data that diplayed
    the change form the former version is that all the cacluation is done in the sql layer
 
  */
  handleLimitedView() {
    this.initDateSturcture()
    if (this.year<this.limitYear) {
      if (this.authServ.currentUser.ID) {
        this.courseServ.getPreciseOldYearDataPerMonth(this.authServ.currentUser.ID, this.year).subscribe(PreciseData => {
          this.courseServ.getPredictOldYearDataPerMonth(this.authServ.currentUser.ID, this.year).subscribe(pridctedData => {
            this.courseServ.getAmountEmployees(this.authServ.currentUser.ID).subscribe(amount => {
              console.log(amount, pridctedData, PreciseData)
              if (amount[0] && amount[0]['amount']) {
                 let sum:number=amount[0]['amount'];
                 let pridctedDataIndex = 0;
                 let PreciseDataIndex = 0;
                for (let index = 0; index < 12; index++) {
                  this.empPerMonth[index] = sum;
                  if(PreciseData && PreciseData[PreciseDataIndex]){
                     if(PreciseData[PreciseDataIndex].month==index+1){
                      this.monthlyHoursprecise[index] =PreciseData[PreciseDataIndex].hours;
                      PreciseDataIndex=PreciseDataIndex+1;
                     }
                     if(pridctedData[pridctedDataIndex].month==index+1){
                      this.monthlyHoursPredicted[index] =pridctedData[pridctedDataIndex].hours;
                      pridctedDataIndex=pridctedDataIndex+1;
                     }
                  }
                }
                this.setViewAndData();
              }

            });

          });

        });
      }
    }
    else{ if (this.authServ.currentUser.ID) {
      this.courseServ.getSumEmpPerMonthPerManager(this.authServ.currentUser.ID).subscribe(date => {
        if (date != undefined) {
          date.forEach((elem: any, index: number) => {
            if (elem.empCount > 0) {
              this.empPerMonth[index] = elem.empCount;
              this.monthlyHoursprecise[index] = elem.presiceHours;
              this.monthlyHoursPredicted[index] = elem.predictHours;
            }
          });
          this.setViewAndData();
        }
      });
    }
  }
  }

  updateIsLimtedView() {
    this.isLimitedView = this.authServ.currentUser.authorizationId != Constants.authorizationLevel2Num.All
  }

  getValPerMonth() {

    this.initDateSturcture()


    this.courseServ.getSumEmpPerMonth().subscribe(date => {
      if (date != undefined) {
        Object.keys(date[0]).forEach((elem: any, index: number) => {
          this.empPerMonth[index] = date[0][elem];
        });
      }
      /*must be placed in the former subscribe in order to be sure that will be dine only after 
      the first one is done
       */
      this.courseServ.getHoursPrecise().subscribe(date => {
        if (date != undefined) {
          date.forEach((elem: any) => {
            if (elem.MonthNum > 0) {
              this.monthlyHoursprecise[elem.MonthNum - 1] = elem.targetSum;
            }
          });
        }

        this.courseServ.getHoursPredicted().subscribe(date => {
          if (date != undefined) {
            date.forEach((elem: any) => {
              if (elem.MonthNum > 0) {
                this.monthlyHoursPredicted[elem.MonthNum - 1] = elem.targetSum;
              }
            });
          }
          this.courseServ.getHoursTentative().subscribe(date => {
            if (date != undefined) {
              date.forEach((elem: any) => {
                if (elem.MonthNum > 0) {
                  this.monthlyHoursTentative[elem.MonthNum - 1] = elem.hours;
                }
              });
            }
            this.setViewAndData();

          })
        })
      });
    })
  }

  setViewAndData() {
    let today = new Date();
    this.iscurrentYear = today.getFullYear() == this.year;
    if (!this.iscurrentYear) {
      this.calcDatePerInputMOnthAmount(12);
    }
    else {
      let curMonth: number = today.getMonth();
      if (curMonth > 0) {
        this.calcDatePerInputMOnthAmount(curMonth);
      }
      //here input per month data
      let division = today.getDate() / (new Date(today.getFullYear(), curMonth + 1, 0).getDate());
      this.monthlyHourspreciseToPresent[curMonth] = (this.empPerMonth[curMonth] > 0) ?
        (this.monthlyHoursprecise[curMonth] / this.empPerMonth[curMonth]) : 0;
      this.monthlyHoursPredictedToPresent[curMonth] = (this.empPerMonth[curMonth] > 0) ?
        this.monthlyHoursPredicted[curMonth] / this.empPerMonth[curMonth] : 0;
      this.quarterlyAvgHoursForTableDisplay[Math.floor(curMonth / 3)] += this.monthlyHourspreciseToPresent[curMonth];
      this.quarterlyTotalHoursForTableDisplay[Math.floor(curMonth / 3)] += this.monthlyHoursprecise[curMonth];
      this.yearly_prescise_includedCurMonth += (this.empPerMonth[curMonth] > 0) ?
        ((this.monthlyHoursprecise[curMonth] / this.empPerMonth[curMonth]) * division) : 0;
      this.yearly_predict_includedCurMonth += (this.empPerMonth[curMonth] > 0) ?
        ((this.monthlyHoursPredicted[curMonth] / this.empPerMonth[curMonth]) * division) : 0;
      this.monthlyHoursPredictedAvarage_includedCurMonth = this.yearly_predict_includedCurMonth / (curMonth + division);
      this.monthlyHourspreciseAvarage_includedCurMonth = this.yearly_prescise_includedCurMonth / (curMonth + division);
      //now calc predicted for all the year
      this.monthlyHoursPredictedToPresent = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      this.monthlyHoursPredictedAvarage = 0;
      this.yearly_predict = 0;
      let count: number = 0;
      for (let i = 0; i < 12; i++) {
        if (this.empPerMonth[i] > 0) {
          this.monthlyHoursPredictedToPresent[i] = this.empPerMonth[i] > 0 ? this.monthlyHoursPredicted[i] / this.empPerMonth[i] : 0;
          this.monthlyHoursTentativeToPresent[i] = this.empPerMonth[i] > 0 ? this.monthlyHoursTentative[i] / this.empPerMonth[i] : 0;
          this.yearly_tentative += this.monthlyHoursTentativeToPresent[i]
          this.yearly_predict += this.monthlyHoursPredictedToPresent[i]
          count += this.monthlyHoursPredicted[i] != 0 ? 1 : 0;
        }
      }
      this.monthly_tentative = this.yearly_tentative / 12;
      if (count > 0) {
        this.monthlyHoursPredictedAvarage = this.yearly_predict / count;
      }
    }

    for (let i = 0; i < 12; i++) {
      this.monthlyTargetHours[i] = (this.yearlyTargetHours / 12);
    }
    const _lineChartData: Array<any> = new Array(4);
    _lineChartData[0] = { data: this.monthlyHoursPredictedToPresent, label: 'Monthly Hours (predicted)' };
    _lineChartData[1] = { data: this.monthlyHourspreciseToPresent, label: 'Monthly Actual Hours (precise)' };
    _lineChartData[2] = { data: this.monthlyTargetHours, label: 'Monthly Targert Hours' };
    _lineChartData[3] = { data: this.monthlyHoursTentativeToPresent, label: 'Monthly Predicted Hours Plan' };
    this.lineChartData = _lineChartData;
  }



  calcDatePerInputMOnthAmount(numMonth: number = 12) {
    for (let i = 0; i < numMonth; i++) {
      if (this.empPerMonth[i] > 0) {
        this.monthlyHourspreciseToPresent[i] = this.empPerMonth[i] > 0 ? this.monthlyHoursprecise[i] / this.empPerMonth[i] : 0;
        this.monthlyHoursPredictedToPresent[i] = this.empPerMonth[i] > 0 ? this.monthlyHoursPredicted[i] / this.empPerMonth[i] : 0;
        this.monthlyHoursTentativeToPresent[i] = this.empPerMonth[i] > 0 ? this.monthlyHoursTentative[i] / this.empPerMonth[i] : 0;

        this.quarterlyAvgHoursForTableDisplay[Math.floor(i / 3)] += this.monthlyHourspreciseToPresent[i];
        this.quarterlyTotalHoursForTableDisplay[Math.floor(i / 3)] += this.monthlyHoursprecise[i];
        this.yearly_prescise_includedCurMonth += this.monthlyHourspreciseToPresent[i];
        this.yearly_predict_includedCurMonth += this.monthlyHoursPredictedToPresent[i];
        this.yearly_tentative += this.monthlyHoursTentativeToPresent[i]
        this.yearly_prescise += this.monthlyHourspreciseToPresent[i];
        this.yearly_predict += this.monthlyHoursPredictedToPresent[i];
      }
    }
    this.monthly_tentative = this.yearly_tentative / numMonth;
    this.monthlyHoursPredictedAvarage = this.yearly_predict / (numMonth);
    this.monthlyHourspreciseAvarage = this.yearly_prescise / (numMonth);
  }




  ngOnDestroy(): void {
    if (this.courseListChangedSub) { this.courseListChangedSub.unsubscribe(); }
    if (this.yearChangedSub) { this.yearChangedSub.unsubscribe(); }
    if (this.courseListBeforChangedSub) { this.courseListBeforChangedSub.unsubscribe(); }

    this.attendReqSub.forEach(sub => sub.unsubscribe());
  }





  saveBudget(): void {
    if (this.yearlyTargetHours && this.yearlyTargetHours > 0) {
      this.courseServ.updateYearlyTargetHours(this.yearlyTargetHours).subscribe(() => {
        this.notif.msg = 'Updated yearly target hours for ' + this.year;
        this.notifServ.notify(this.notif);
        this.editable = !this.editable;
        this.getValPerMonth();
      });
    }
  }

  initDateSturcture() {
    this.yearly_prescise = 0;
    this.yearly_predict = 0;
    this.empPerMonth = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.monthlyHourspreciseToPresent = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.monthlyHoursPredictedToPresent = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.monthlyHoursprecise = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.monthlyHoursPredicted = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.monthlyHoursPredictedAvarage = 0;
    this.monthlyHourspreciseAvarage = 0;
    this.iscurrentYear = false;
    this.quarterlyTotalHoursForTableDisplay = [0, 0, 0, 0];
    this.quarterlyAvgHoursForTableDisplay = [0, 0, 0, 0];
    this.yearly_prescise_includedCurMonth = 0;
    this.yearly_predict_includedCurMonth = 0;
    this.monthlyHoursTentativeToPresent = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.monthlyHoursTentative = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.year = this.courseServ.getYear();

  }
}



