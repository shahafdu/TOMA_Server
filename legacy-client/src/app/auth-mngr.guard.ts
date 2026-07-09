import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot } from '@angular/router';

import { AuthService, EmployeeService } from './services';
import { Constants } from './common/constants';

@Injectable()
export class AuthMngrGuard implements CanActivate {

  constructor(private authServ: AuthService, private empServ: EmployeeService) { }

  canActivate(route: ActivatedRouteSnapshot): boolean {
    if (this.authServ.isLoggedIn() && this.authServ.currentUser.authorizationId === Constants.authorizationLevel2Num.All) {
      return true;
    } else {
      const ID: number = Number(route.params.ID);
      if (ID &&
         (ID === this.authServ.currentUser.ID ||
           this.empServ.getAllManagersEmployeesOffline(this.authServ.currentUser.ID).map(user => user.ID).includes(ID))) {
        return true;
      } else {
        return false;
      }
    }
  }
}
