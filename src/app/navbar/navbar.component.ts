import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService, CourseService, EmployeeService } from '../services';

@Component({
  selector: 'coma-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  public searchTerm: string = '';
  public foundCourses: string[] = [];
  public currentUser: any;
  public isExportneedToDisplay:boolean=false;
  public yearArray: number[] = Array.from(Array(30).keys()).map(year => year + 2018);

  private _year: number = +(new Date().getFullYear());
  public get year(): number {
    return this._year;
  }
  public set year(v: number) {
    this._year = v;
    this.courseServ.yearChanged(v);
  }



  constructor(private authServ: AuthService, private route: Router, public courseServ: CourseService,private empServ: EmployeeService ) { }

  ngOnInit() {
    //this.yearArray = Array.from(Array(30).keys()).map(year => year + 2018);
      this.currentUser = this.authServ.currentUser;
      if(this.currentUser && this.currentUser.userName){
      this.empServ.getUserByUserName(this.currentUser.userName).subscribe(userDetails => {  
      this.empServ.getManagerDirectEmployees(userDetails.ID).subscribe(empArray => {
        if (empArray && empArray.length > 0) {
          this.isExportneedToDisplay=true;
        }
      });
    });
    }
  }

  logOut(): void {
    this.authServ.logOut();
    this.route.navigate(['log_in']);
  }

  searchCourses(): void {
    this.courseServ.searchCourses(this.searchTerm).subscribe(foundCourses => {
      this.foundCourses = foundCourses;
      this.searchTerm = '';
    });
  }
  exportToEexcel():void{
    this.empServ.exportToExcel(this.authServ.currentUser.ID,this.year)
  }

}
