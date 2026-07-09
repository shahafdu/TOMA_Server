import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './services';

@Injectable()
export class AuthGuard implements CanActivate {

  constructor (private authServ: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.authServ.isLoggedIn()) {
      return true;
    } else {
      this.router.navigate(['log_in']);
      return false;
    }
  }
}
