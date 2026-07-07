import { IUser } from './index';

export class CourseDate {
  dateTimeStart: Date;
  dateTimeEnd: Date;

  constructor(start: Date = new Date(), end: Date = new Date()) {
    this.dateTimeStart = start;
    this.dateTimeEnd = end;
  }
}

export class ICourse {
  [index: string]: any;
  public name: string;
  public lecturer: string;
  public schedule: CourseDate[];
  public syllabus: string;
  public notes: string;
  public textForMail: string;
  public totalHours: number;
  public participants: IUser[];
  public price: number;
  public venue: string;
  public isIn: boolean;
  public isMandatory: boolean;
  public courseType: number;
  public isConference: boolean;
  public isAttended : boolean;
  public year : number;
  public yearInName : number;
  public creator : string;
  public isTentative : boolean;
  public participantsAmountEstimated : number;
  public participantsAmount : number;

  constructor(name: string = '', lecturer: string = '', schedule: CourseDate[] = [], syllabus: string = '',
              totalHours: number = 0, participants: IUser[] = [], price: number = 0, notes: string = '',
              textForMail: string = '', venue: string = '', isIn: boolean = true, isMandatory: boolean = true,
              courseType: number = 0, isConference: boolean = false,isAttended:boolean = false, year:number = 0,yearInName:number=0 ,creator:string = '',isTentative:boolean = false,participantsAmountEstimated:number = 0
              , participantsAmount:number = 0) {

    this.name = name;
    this.lecturer = lecturer;
    this.schedule = schedule;
    this.syllabus = syllabus;
    this.totalHours = totalHours;
    this.participants = participants;
    this.price = price;
    this.notes = notes;
    this.textForMail = textForMail;
    this.venue = venue;
    this.isIn = isIn;
    this.isMandatory = isMandatory;
    this.courseType = courseType;
    this.isConference = isConference;
    this.isAttended = isAttended;
    this.year = year;
    this.yearInName=yearInName;
    this.creator = creator;
    this.isTentative = isTentative;
    this.participantsAmountEstimated = participantsAmountEstimated;
    this.participantsAmount = participantsAmount;
  }
}
