import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, Validators, ValidatorFn, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Observable, Subscription, of } from 'rxjs';
import { startWith, map, auditTime } from 'rxjs/operators';
import * as moment from 'moment';

import { IUser, ICourse, CourseDate } from '../models';
import { CourseService, ConfirmationDialogService, EmployeeService, NotifMsg, NotificationService, AuthService } from '../services';
import { ComponentCanDeactivate } from '../pending-changes.guard';
import { Constants } from '../common';

@Component({
  selector: 'coma-course-edit',
  templateUrl: './course-edit.component.html',
  styleUrls: ['./course-edit.component.css']
})
export class CourseEditComponent implements OnInit, OnDestroy, ComponentCanDeactivate {
  title: string = 'Create Course';
  editCourseForm: FormGroup;
  name: FormControl;
  lecturer: FormControl;
  date: FormControl;
  timeStart: FormControl;
  timeEnd: FormControl;
  syllabus: FormControl;
  notes: FormControl;
  textForMail: FormControl;
  totalHours: FormControl;
  participants: FormControl;
  price: FormControl;
  venue: FormControl;
  isIn: FormControl;
  isConference: FormControl;
  isMandatory: FormControl;
  courseType: FormControl;
  isTentative: boolean = false;
  participantList: IUser[] = [];
  newlyAddedParticipantIds: Set<number> = new Set();
  userList: IUser[] = [];
  dateTimeList: CourseDate[] = [];
  filteredUserList: Observable<IUser[]> = of([]);
  editedCourseName: string = '';
  timeStartParsed: any;
  timeEndParsed: any;
  year: number = 0;
  courseCurrYear: number = 0;
  canLeave: boolean = false;
  isEdit: boolean = false;
  isTentativeBase: boolean = false;
  editTentativeFrom: FormGroup;
  tentativeName: FormControl;
  participantsAmountEstimated: FormControl;
  tentativeDuration: FormControl;
  tentativeDate: FormControl;
  yearChangedSub: Subscription = new Subscription;
  valueChangedSub: Subscription = new Subscription;
  notif: NotifMsg = { type: 'user-error', msg: '', timeout: 0 };
  courseList: string[] = [];
  isEditableTentative: boolean = false;
  duplicateDate: boolean = false;
  duplicateIndex: number = -1;

  @HostListener('window:beforeunload', ['$event'])
  doSomething($event: any) {
    if (this.editCourseForm.dirty) {
      $event.returnValue = true;
    }
  }
  canDeactivate(): boolean {
    for (const [, val] of Object.entries(this.editCourseForm.controls)) {
      if (val.dirty) { val.markAsTouched(); }
    }
    localStorage.setItem('autoSave', '');
    return (!this.editCourseForm.dirty || this.canLeave);
  }

  // tslint:disable-next-line:max-line-length
  constructor(private courseServ: CourseService, private confirmServ: ConfirmationDialogService, private route: ActivatedRoute,
    private empServ: EmployeeService, private router: Router, private location: Location, private notifServ: NotificationService, private authServ: AuthService) {
    this.name = new FormControl('', [Validators.required, Validators.pattern('[^/?#%"\\\\]*#\\d+$'), Validators.maxLength(100), this.isUniqueValid()]);
    this.lecturer = new FormControl('', [Validators.required, Validators.pattern('[a-zA-Z\\s]*'), Validators.maxLength(45)]);
    this.date = new FormControl(moment(), [this.dateNotEmptyValid()]);
    this.timeStart = new FormControl('');
    this.timeEnd = new FormControl('');
    this.syllabus = new FormControl('', [Validators.required, Validators.maxLength(65535)]);
    this.notes = new FormControl('', [Validators.pattern('[^"]*'), Validators.maxLength(400)]);
    this.textForMail = new FormControl('', [Validators.maxLength(65535)]);
    this.totalHours = new FormControl('', [Validators.required, Validators.pattern('[0-9].*')]);
    this.participants = new FormControl('');
    this.price = new FormControl('', [Validators.required, Validators.pattern('[0-9].*')]);
    this.venue = new FormControl('', [Validators.pattern('[^"]*'), Validators.maxLength(45)]);
    this.isIn = new FormControl(true);
    this.isConference = new FormControl(false);
    this.isMandatory = new FormControl(false);
    this.courseType = new FormControl(0);
    this.tentativeName = new FormControl('', [Validators.required, Validators.pattern('[^/?#%"\\\\]*#\\d+$'), Validators.maxLength(100)]);
    this.participantsAmountEstimated = new FormControl('', [Validators.required, Validators.pattern('[0-9].*')]);
    this.tentativeDuration = new FormControl('', [Validators.required, Validators.pattern('[0-9].*')]);
    this.tentativeDate = new FormControl(moment());

    this.editCourseForm = new FormGroup({
      name: this.name,
      lecturer: this.lecturer,
      date: this.date,
      timeStart: this.timeStart,
      timeEnd: this.timeEnd,
      syllabus: this.syllabus,
      notes: this.notes,
      textForMail: this.textForMail,
      totalHours: this.totalHours,
      participants: this.participants,
      price: this.price,
      venue: this.venue,
      isIn: this.isIn,
      isConference: this.isConference,
      isMandatory: this.isMandatory,
      courseType: this.courseType
    });

    this.editTentativeFrom = new FormGroup({
      tentativeName: this.tentativeName,
      participantsAmountEstimated: this.participantsAmountEstimated,
      tentativeDuration: this.tentativeDuration,
      tentativeDate: this.tentativeDate,
      participants: this.participants
    });
  }

  ngOnInit() {
    this.courseServ.getAllCoursesNames().subscribe(courseList => {
      this.courseList = courseList;
    });
    this.isEdit = false;
    this.participantList = [];
    this.dateTimeList = [];
    this.editedCourseName = this.route.snapshot.paramMap.get('name') || '';
    if (this.editedCourseName) {
      this.editedCourseName = this.courseServ.url2Name(this.editedCourseName);
      this.courseServ.getCourse(this.editedCourseName).subscribe(course => {
        if (course.isTentative) {
          this.isTentative = true;
          this.tentativeDuration.setValue(course.totalHours);
          this.participantsAmountEstimated.setValue(course.participantsAmountEstimated)
          this.tentativeName.setValue(this.editedCourseName);
          this.tentativeName.disable();
          if (course.schedule) {
            this.dateTimeList = course.schedule;
            this.tentativeDate.setValue(this.dateTimeList[0].dateTimeStart);
          }
          this.title = 'Edit Tentative Course';
          this.isEdit = true;
          this.isTentativeBase = true;
          this.isEditableTentative = this.authServ.currentUser.authorizationId === Constants.authorizationLevel2Num.All ||
            course.creator == this.authServ.currentUser.fullName;
          this.participantList = course.participants;

        }
        else {
          this.isTentative = false;
          this.lecturer.setValue(course.lecturer);
          this.syllabus.setValue(course.syllabus);
          this.notes.setValue(course.notes);
          this.textForMail.setValue(course.textForMail);
          this.textForMail.markAsPristine();
          this.totalHours.setValue(course.totalHours);
          this.price.setValue(course.price);
          this.venue.setValue(course.venue);
          this.isIn.setValue(course.isIn);
          this.isConference.setValue(course.isConference);
          this.isMandatory.setValue(course.isMandatory);
          this.courseType.setValue(course.courseType);
          if (course.schedule && course.schedule.length > 0) {
            this.dateTimeList = course.schedule;
            this.date.setValue(this.dateTimeList[0].dateTimeStart);
            this.calcDuration();
          }
          if (this.route.snapshot.paramMap.get('duplicate')) {
            this.courseServ.getNewNumberForCourse(this.editedCourseName).subscribe((newName: string) => {
              this.editedCourseName = newName;
              this.name.setValue(this.editedCourseName);
            });
          } else {
            this.participantList = course.participants;
            this.name.setValue(this.editedCourseName);
            this.name.disable();
            this.title = 'Edit Course';
            this.isEdit = true;
          }

        }

      });
    }
    const autoSaveData = JSON.parse(localStorage.getItem('autoSave') || 'null');
    if (autoSaveData) {
      setTimeout(() => {
        this.recover(autoSaveData);
      }, 500);
    }
    this.empServ.getAllUsersFromServer().subscribe(userList => {
      this.userList = userList;
      if (this.authServ.currentUser.authorizationId === Constants.authorizationLevel2Num.PM) {
        this.userList = this.empServ.getAllManagersEmployeesOffline(this.authServ.currentUser.ID);
      }
      this.filteredUserList = this.participants.valueChanges
        .pipe(
          startWith<string | IUser>(''),
          map(value => !!value ? (typeof value === 'string' ? value : value.fullName) : ''),
          map(filterString => this.filterAlreadyAssigned(filterString ? this.filterListByString(filterString) : this.userList.slice()))
        );
    });
    this.timeStartParsed = moment();
    this.timeEndParsed = moment();
    this.date.valueChanges.subscribe(() => {
      this.duplicateDate = false;
      this.duplicateIndex = -1;
    });
    this.timeStart.valueChanges.forEach(time => {
      this.duplicateDate = false;
      this.duplicateIndex = -1;
      this.timeStartParsed = moment(time, 'HH:mm');
    });
    this.timeEnd.valueChanges.forEach(time => {
      this.duplicateDate = false;
      this.duplicateIndex = -1;
      this.timeEndParsed = moment(time, 'HH:mm');
    });
    this.year = this.courseServ.getYear();
    this.courseCurrYear = this.year;
    this.yearChangedSub = this.empServ.yearChangedObs.subscribe((newYear: number) => {
      this.year = newYear;
    });
    this.valueChangedSub = this.editCourseForm.valueChanges.pipe(auditTime(2000)).subscribe(_formData => {
      this.autoSave();
    });
    this.isIn.valueChanges.forEach(isIn => {
      this.isConference.setValue(!isIn && this.isConference.value);
    });
  }

  ngOnDestroy(): void {
    if (this.yearChangedSub) { this.yearChangedSub.unsubscribe(); }
    if (this.valueChangedSub) { this.valueChangedSub.unsubscribe(); }
  }

  dateNotEmptyValid(): ValidatorFn {
    return (_control: AbstractControl): { [key: string]: any } | null => {
      return (!this.dateTimeList || this.dateTimeList.length === 0) ? { 'dateEmpty': { value: 'date is empty' } } : null;
    };
  }

  isUniqueValid(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      return (control.value === '' || control.value === null || (this.courseList &&
        !this.courseList.includes(control.value.toLocaleLowerCase())))
        ? null : { 'notUnique': { value: 'not unique' } };
    };
  }


  filterListByString(filterString: string): IUser[] {
    return this.userList.filter((user: IUser) => user.fullName.toLocaleLowerCase().indexOf(filterString.toLocaleLowerCase()) > -1);
  }

  onToggle(event: any) {
    //check if the course is already exist and if it does init the relvant fields
    if (this.isEdit && this.isTentative) {
      this.name.setValue(this.editedCourseName);
      this.name.disable();
      this.totalHours.setValue(this.tentativeDuration.value);
      this.dateTimeList = [];
    }
    this.isTentative = event.checked;

  }

  filterAlreadyAssigned(list: IUser[]): IUser[] {
    if (this.participantList.length !== 0) {
      return list.filter((user: IUser) => !this.participantList.map(partic => partic.ID).includes(user.ID));
    } else {
      return list;
    }
  }

  displayFn(user?: IUser): string | undefined {
    return user ? user.fullName : undefined;
  }

  addParticipant(): void {
    if (typeof this.participants.value === 'object') {
      this.participantList.push(this.participants.value);
      this.newlyAddedParticipantIds.add(this.participants.value.ID);
      const tmpCourse = { name: this.name.value, schedule: this.dateTimeList };
      this.courseServ.checkDatesCollision(this.participants.value.ID, <ICourse>tmpCourse);
      this.participants.reset();
      this.participants.setValue('');
      this.autoSave();
    }
  }

  addAllParticipants(): void {
    this.confirmServ.confirm('Add ALL employees?',
      'You are about to add ALL employees to this course. This is hard to undo...',
      'Yes, add', 'Wait, I need to think about it')
      .then((confirmed) => {
        if (confirmed) {
          const newParticipants = this.filterAlreadyAssigned(this.userList.filter(x => x.status == 'working'));
          this.participantList.push(...newParticipants);
          newParticipants.forEach(user => this.newlyAddedParticipantIds.add(user.ID));
          this.participants.reset();
          this.participants.setValue('');
        } else {
          return;
        }
      })
      .catch(() => { return; });
  }

  removeParticipantInInd(ind: number): void {
    const participantId = this.participantList[ind].ID;
    if (this.isEdit && !this.isTentative) {
      this.courseServ.getCourseAttendance(this.name.value).subscribe((attendList) => {
        if (attendList.map(item => item.ID).includes(participantId)) {
          this.notif.type = 'user-error';
          // tslint:disable-next-line:quotemark
          this.notif.msg = "User is marked as 'attended' so he can't be removed. Change he's attendance and try again";
          this.notifServ.notify(this.notif);
        } else {
          this.participantList.splice(ind, 1);
          this.newlyAddedParticipantIds.delete(participantId);
          this.autoSave();
        }
      });
    } else {
      this.participantList.splice(ind, 1);
      this.newlyAddedParticipantIds.delete(participantId);
      this.autoSave();
    }

  }

  onTentativeDateChange(event: any) {
    this.setDateToTentative(event.value);
    //this.autoSave();

  }

  setDateToTentative(data: any) {
    const newCourseDate = new CourseDate;
    let newDate = data;
    newDate.set('hour', 13);
    newCourseDate.dateTimeStart = newDate.toDate();
    newDate.set('hour', 14);
    newCourseDate.dateTimeEnd = newDate.toDate();
    this.dateTimeList.push(newCourseDate);
  }

  checkDateValidity(newCourseDate: CourseDate): boolean {
    let chosenDate = moment(this.date.value).format('DD/MM/YYYY');
    let chosendStart = moment(newCourseDate.dateTimeStart);
    let chosenEnd = moment(newCourseDate.dateTimeEnd);
    for (let i = 0; i < this.dateTimeList.length; i++) {
      let currentDate = moment(this.dateTimeList[i].dateTimeStart).format('DD/MM/YYYY');
      if (chosenDate == currentDate) {
        let currentStart = moment(this.dateTimeList[i].dateTimeStart);
        let currentEnd = moment(this.dateTimeList[i].dateTimeEnd);
        if ((chosendStart.isSameOrAfter(currentStart) && chosendStart.isSameOrBefore(currentEnd)) ||
          (chosenEnd.isSameOrAfter(currentStart) && chosenEnd.isSameOrBefore(currentEnd)) ||
          (currentStart.isSameOrAfter(chosendStart) && currentEnd.isSameOrBefore(chosenEnd))) {
          this.duplicateDate = true;
          this.duplicateIndex = i;
          return false;
        }
      }
    }
    return true;
  }

  addDateTime(): void {
    if (!this.date.hasError('matDatepickerParse') && this.date.value && this.timeStartParsed.isValid() && this.timeStart.value &&
      this.timeEndParsed.isValid() && this.timeEnd.value) {
      const newCourseDate = new CourseDate;
      let newDate = moment(this.date.value);
      newDate.hour(this.timeStartParsed.hour()).minute(this.timeStartParsed.minute()).second(0);
      newCourseDate.dateTimeStart = newDate.toDate();
      newDate = moment(this.date.value);
      newDate.hour(this.timeEndParsed.hour()).minute(this.timeEndParsed.minute()).second(0);
      newCourseDate.dateTimeEnd = newDate.toDate();
      if (this.checkDateValidity(newCourseDate)) {
        this.dateTimeList.push(newCourseDate);
        this.date.updateValueAndValidity();
        this.autoSave();
        this.calcDuration();
      }
    }
  }

  removeDateInInd(ind: number): void {
    const startDate: Date = this.dateTimeList[ind].dateTimeStart;
    if (moment().isAfter(startDate) && this.isEdit) {
      this.courseServ.getCourseAttendance(this.name.value).subscribe((attendList) => {
        if (attendList.map(item => item.dateTimeStart).findIndex(item => moment(item).isSame(startDate)) > -1) {
          this.notif.type = 'user-error';
          // tslint:disable-next-line:quotemark
          this.notif.msg = "People attended this date so it can't be removed. Remove all attendees and try again";
          this.notifServ.notify(this.notif);
        } else {
          this.dateTimeList.splice(ind, 1);
          if (ind == this.duplicateIndex) {
            this.duplicateIndex = -1;
            this.duplicateDate = false;
          }
          this.autoSave();
          this.calcDuration();
        }
      });
    } else {
      this.dateTimeList.splice(ind, 1);
      if (ind == this.duplicateIndex) {
        this.duplicateIndex = -1;
        this.duplicateDate = false;
      }
      this.autoSave();
      this.calcDuration();
    }
  }

  calcDuration(): void {
    let hours = 0;
    this.dateTimeList.forEach((dateTime: CourseDate) => {
      hours += moment(dateTime.dateTimeEnd).diff(dateTime.dateTimeStart, 'hours', true);
    });
    this.totalHours.setValue(hours);
  }

  saveCoursePressed(formValues: any): void {
    console.log(this.courseList);
    if (this.isTentative) {
      if (this.editTentativeFrom.invalid) {
        for (const [, val] of Object.entries(this.editTentativeFrom.controls)) {
          val.markAsTouched();
          val.markAsDirty();
        }
      } else {
        const startYear = moment(this.dateTimeList[this.dateTimeList.length - 1].dateTimeStart).year()
        this.courseServ.isCourseExists(formValues.tentativeName, this.courseCurrYear).subscribe(exists => {
          if (exists) {
            if (startYear !== this.courseCurrYear) {
              this.saveCourse(formValues, true, startYear, this.courseCurrYear);
            } else {
              this.saveCourse(formValues, true, startYear);
            }
          } else {
            this.courseServ.isCourseExists(formValues.tentativeName, startYear).subscribe(exists => {
              if (exists) {
                  this.saveCourse(formValues, true, startYear);
                } else {
                  this.saveCourse(formValues, false, startYear);
                }
            })
          }

        })
      }
    } else {
      if (this.editCourseForm.invalid) {
        for (const [, val] of Object.entries(this.editCourseForm.controls)) {
          val.markAsTouched();
          val.markAsDirty();
        }
      } else {
        const startYear = moment.min(this.dateTimeList.map(item => moment(item.dateTimeStart))).year();
        this.courseServ.isCourseExists(formValues.name, startYear).subscribe(exists => {
          if (exists) {
            if (this.courseCurrYear !== startYear) {
              this.confirmServ.confirm('Hold on just a second',
                'You are trying to move this course from ' + this.courseCurrYear + ' to ' + startYear +
                ' but this course already exist in ' + startYear + '. Sorry, This cannot be done...',
                'OK, Cancel the whole thing', 'Sorry, go back the the form')
                .then((confirmed) => {
                  if (confirmed) {
                    this.location.back();
                  } else {
                    return;
                  }
                })
                .catch(() => { return; });
            } else if (formValues.name !== this.editedCourseName) {
              this.confirmServ.confirm('Hold on just a second',
                'This course already exists in ' + startYear + '. Do you want to update it?',
                'Yes, Update', 'Sorry, No')
                .then((confirmed) => {
                  if (confirmed) {
                    this.saveCourse(formValues, true, startYear);
                  } else {
                    return;
                  }
                })
                .catch(() => { return; });
            } else {
              this.saveCourse(formValues, true, startYear);
            }
          } else if (this.isEdit && (this.courseCurrYear !== startYear)) {
            this.confirmServ.confirm('Changing Years?',
              'This course was originally in ' + this.courseCurrYear + ', but you moved it to ' + startYear + '. Are you sure?',
              'Yes, Do it', 'Sorry, No')
              .then((confirmed) => {
                if (confirmed) {
                  this.saveCourse(formValues, true, startYear, this.courseCurrYear);
                } else {
                  return;
                }
              })
              .catch(() => { return; });
          } else {
            this.saveCourse(formValues, false, startYear);
          }
        });
      }
    }
  }



  saveCourse(formValues: any, exists: boolean, startYear: number, origYear?: number): void {
    const newCourse = new ICourse();
    newCourse.isTentative = this.isTentative;
    if (newCourse.isTentative) {
      newCourse['name'] = formValues.tentativeName;
      newCourse['participantsAmountEstimated'] = formValues.participantsAmountEstimated;
      newCourse['totalHours'] = formValues.tentativeDuration;
      if (this.dateTimeList.length == 0) {
        this.setDateToTentative(this.tentativeDate.value);
      }
      else if(this.dateTimeList.length>1){
        let last=this.dateTimeList.pop();
        this.dateTimeList=[];
        if(last){
          this.dateTimeList.push(last)
        }
  
      }
    }
    else {
      Object.entries(newCourse).forEach(([key, _value]) => {
        if (formValues[key] != undefined) {
          newCourse[key] = formValues[key];
        }
      });
    }

    newCourse.schedule = [];
    newCourse.schedule = this.dateTimeList;
    newCourse['year'] = startYear;
    newCourse.participants = this.participantList;

    newCourse.creator = this.authServ.currentUser != undefined ? this.authServ.currentUser.fullName : '';
    this.courseServ.addCourse(newCourse, exists, startYear, origYear).subscribe(() => {
      this.courseServ.init();
      this.empServ.init();
      this.canLeave = true;
      this.newlyAddedParticipantIds.clear(); // Clear newly added participants after save
      this.notif.type = 'notification';
      if (this.isTentativeBase && !newCourse.isTentative) {
        this.notif.msg = 'Tentative Course update to regular course';
      }
      else {
        const courseTypeString = newCourse.isTentative ? 'Tentative Course' : 'Course';
        this.notif.msg = courseTypeString + (this.isEdit ? 'updated' : 'added') + ' successfully';
      }
      this.notifServ.notify(this.notif);
      if (startYear === this.year) {
        this.router.navigate(['courses', this.courseServ.name2Url(newCourse.name)]);
      } else {
        this.router.navigate(['main']);
      }
    });
  }

  cancel(): void {
    this.location.back();
  }

  autoSave() {
    const dataToSave: { [index: string]: any } = {};
    dataToSave['formData'] = this.editCourseForm.value;
    dataToSave['participantList'] = this.participantList;
    dataToSave['dateTimeList'] = this.dateTimeList;
    localStorage.setItem('autoSave', JSON.stringify(dataToSave));
  }

  recover(autoSaveData: any): void {
    this.confirmServ.confirm('Recover from auto-save?',
      'The data from your last session was auto-saved. Do you want to load it?',
      'Yes, Recover', 'No, Dismiss')
      .then((confirmed) => {
        if (confirmed) {
          Object.entries(autoSaveData.formData).forEach(([key, value]) => {
            if (key !== 'date' && key !== 'timeStart' && key !== 'timeEnd') {
              this.editCourseForm.controls[key].setValue(value);
            }
          });
          this.participantList = autoSaveData.participantList;
          this.dateTimeList = autoSaveData.dateTimeList;
          this.date.updateValueAndValidity();
        } else {
          localStorage.setItem('autoSave', '');
          return;
        }
      })
      .catch(() => {
        localStorage.setItem('autoSave', '');
        return;
      });
  }

  parseEmailsFromText(text: string): string[] {
    const emails: string[] = [];
    
    // Handle multiple formats:
    // 1. Simple emails: user@example.com
    // 2. Name with email: "User Name <user@example.com>"
    // 3. Multiple emails separated by semicolons, commas, or newlines
    
    // First, split by common separators
    const parts = text.split(/[;\n,]+/);
    
    for (const part of parts) {
      const trimmedPart = part.trim();
      if (!trimmedPart) continue;
      
      // Check if it contains < > format (Outlook style)
      const outlookMatch = trimmedPart.match(/<([^>]+)>/);
      if (outlookMatch) {
        const email = outlookMatch[1].trim();
        if (this.isValidEmail(email)) {
          emails.push(email);
        }
      } else {
        // Check if the entire part is an email
        if (this.isValidEmail(trimmedPart)) {
          emails.push(trimmedPart);
        }
      }
    }
    
    return emails;
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  findUsersByEmails(emails: string[]): {matched: IUser[], unmatched: string[]} {
    const matched: IUser[] = [];
    const unmatched: string[] = [];
    
    for (const email of emails) {
      const user = this.userList.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
      if (user) {
        // Check if user is not already in participant list
        const alreadyAdded = this.participantList.find(p => p.ID === user.ID);
        if (!alreadyAdded) {
          matched.push(user);
        }
      } else {
        unmatched.push(email);
      }
    }
    
    return { matched, unmatched };
  }

  addParticipantsFromEmails(emails: string[]): void {
    const result = this.findUsersByEmails(emails);
    
    if (result.matched.length > 0) {
      this.participantList.push(...result.matched);
      result.matched.forEach(user => this.newlyAddedParticipantIds.add(user.ID));
      this.autoSave();
      
      // Show success notification
      this.notif.type = 'notification';
      this.notif.msg = `Added ${result.matched.length} participant(s) successfully`;
      this.notifServ.notify(this.notif);
    }
    
    if (result.unmatched.length > 0) {
      // Show warning for unmatched emails
      this.notif.type = 'user-error';
      this.notif.msg = `Could not find users for: ${result.unmatched.join(', ')}`;
      this.notifServ.notify(this.notif);
    }
    
    if (result.matched.length === 0 && result.unmatched.length === 0) {
      this.notif.type = 'user-error';
      this.notif.msg = 'No valid emails found or all users already added';
      this.notifServ.notify(this.notif);
    }
  }

  onParticipantsInputPaste(event: ClipboardEvent): void {
    if (!event.clipboardData) return;
    
    const pastedText = event.clipboardData.getData('text');
    if (!pastedText) return;
    
    // Check if the pasted text contains emails
    const emails = this.parseEmailsFromText(pastedText);
    if (emails.length > 0) {
      event.preventDefault(); // Prevent default paste behavior
      this.addParticipantsFromEmails(emails);
      this.participants.setValue(''); // Clear the input
    }
  }

  isNewlyAddedParticipant(userId: number): boolean {
    return this.newlyAddedParticipantIds.has(userId);
  }
}
