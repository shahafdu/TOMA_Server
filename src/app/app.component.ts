import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';

import { AuthService, VersionCheckService  } from './services';

@Component({
  selector: 'coma-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit {
  title = 'toma';
  loggedIn: boolean = false;

  constructor(private authServ: AuthService, private verServ: VersionCheckService) {}

  ngOnInit(): void {
    this.loggedIn = this.authServ.isLoggedIn();
    this.authServ.loggedIn.subscribe((isLoggedIn: boolean) => {
      this.loggedIn = isLoggedIn;
    });
    this.verServ.initVersionCheck(environment.versionCheckUrl);
  }
}
