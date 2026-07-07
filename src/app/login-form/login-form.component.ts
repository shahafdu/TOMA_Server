import { Component, OnInit} from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, FormControl } from '@angular/forms';

import { AuthService } from '../services/index';


@Component({
  selector: 'coma-login-form',
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.css']
})

export class LoginFormComponent implements OnInit {

  errorMessage: string = '';
  form1: FormGroup;
  username: FormControl;
  password: FormControl;

  constructor(private router: Router, private authServ: AuthService) {
    this.username = new FormControl('');
    this.password = new FormControl('');
    this.form1 = new FormGroup({
      username: this.username,
      password: this.password
    });
  }

  ngOnInit() {
    if (this.authServ.isLoggedIn()) {
      this.router.navigate(['main']);  // maybe nevigate to the last visited page?
    }
  }

  async submitForm() {
    this.authServ.logIn(this.username.value, this.password.value).subscribe(isAutorized => {
      if (isAutorized.isAuth) {
        this.errorMessage = '';
        this.router.navigate(['main']);
      } else {
        this.errorMessage = isAutorized.msg;
      }
    });
  }
}
