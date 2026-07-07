export class IUser {
  [index: string]: any;
  public ID: number;
  public fullName: string;
  public managerID: number;
  public managerFullName: string;
  public password: string;
  public authorizationId: any;
  public email:any;
  public hours: number;
  public imageUrl: string;
  public category: string;
  public status: string;
  public startDate: Date | null;
  public endDate: Date | null;
  public allCourses: string[];
  public yearCourses: string[];


  constructor(ID: number = 0, fullName: string = '', managerID: number = 0, managerFullName: string = '',
              authorizationId: any = '',email = '', hours: number = 0, imageUrl: string = '', category: string = '',
              startDate: Date = new Date(), endDate: Date = new Date(), status = '', allCourses: string[] = [], yearCourses: string[] = []) {

    this.ID = ID;
    this.fullName = fullName;
    this.password = '';
    this.managerID = managerID;
    this.managerFullName = managerFullName;
    this.authorizationId = authorizationId;
    this.email = email;
    this.hours = hours;
    this.imageUrl = imageUrl;
    this.category = category;
    this.startDate = startDate;
    this.endDate = endDate;
    this.status = status;
    this.allCourses = allCourses;
    this.yearCourses = yearCourses;
  }
}
