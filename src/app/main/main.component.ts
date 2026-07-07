import { Component, OnInit, OnDestroy } from '@angular/core';
// import { Router } from '@angular/router';
import { AuthService } from '../services';
import { Subscription } from 'rxjs';

import { Constants } from '../common/constants';

@Component({
  selector: 'coma-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit, OnDestroy {
  // private currentPathKey = 'currentPathKey';
  // private lastPath: string = '';
  private userLoadedSub: Subscription = new Subscription;


  constructor(
    // private router: Router,
    private authServ: AuthService
  ) { }

  ngOnInit() {
    if (this.authServ.currentUser.authorizationId === Constants.authorizationLevel2Num.PM) {
      console.log("redirecting to employees view directly")
      // this.router.navigate(['employees']);
    }
    this.userLoadedSub = this.authServ.userLoaded.subscribe(() => {
      if (this.authServ.currentUser.authorizationId === Constants.authorizationLevel2Num.PM) {
        console.log("redirecting to employees view after load")
        // this.router.navigate(['employees']);
      }
    });
    // this.lastPath = localStorage.getItem(this.currentPathKey);
    // if (this.lastPath.length && (this.lastPath.length > 0)) {
    //   this.router.navigate([this.lastPath]);
    // }
  }

  ngOnDestroy(): void {
    this.userLoadedSub.unsubscribe();
  }

}
