import { Injectable } from "@angular/core";
import { Subject, Observable } from "rxjs";
import { map } from "rxjs/operators";
import * as CryptoJS from "crypto-js";
import { Http, Response, Headers, RequestOptions } from "@angular/http";
import { EmployeeService } from "./employee.service";
import { Constants } from "../common/constants";
import { auth_server } from "src/urls";

@Injectable()
export class AuthService {
  loggedIn: Subject<boolean> = new Subject<boolean>();
  userLoaded: Subject<boolean> = new Subject<boolean>();
  currentUser = {
    userName: "",
    fullName: "",
    ID: 0,
    authorizationId: Constants.authorizationLevel2Num.None,
  };

  constructor(private http: Http, private empServ: EmployeeService) {
    this.currentUser.userName = localStorage.getItem("currentUserKey") || "";
    if (this.currentUser.userName) {
      this.empServ
        .getUserByUserName(this.currentUser.userName)
        .subscribe(userDetails => {
          this.currentUser.fullName = userDetails.fullName;
          this.currentUser.ID = userDetails.ID;
          this.currentUser.authorizationId = userDetails.authorizationId;
          this.userLoaded.next(true);
        });
    }
  }

  postRequest(body: string, requestOperation: string): Observable<Response> {
    return this.http.post(
      auth_server + "/" + requestOperation,
      body,
      new RequestOptions({
        headers: new Headers({ "Content-Type": "application/json" }),
      })
    );
  }

  isLoggedIn(): boolean {
    const loggedInState = localStorage.getItem("isLoggedInKey") === "true";
    this.loggedIn.next(loggedInState);
    return loggedInState;
  }

  logIn(
    userName: string,
    userPassword: string
  ): Observable<{ isAuth: boolean; msg: string }> {
    const authRes = {
      isAuth: false,
      msg: "",
    };
    localStorage.setItem("currentUserKey", userName);
    localStorage.setItem("isLoggedInKey", "false");

    const encryptedPasswod = CryptoJS.AES.encrypt(userPassword, "APP_ENCRYPTION_KEY");
    const json = JSON.stringify({
      username: userName,
      password: encryptedPasswod.toLocaleString(),
    });

    return this.postRequest(json, "authorizeUser").pipe(
      map((res) => {
        authRes.msg = res.text().slice(17);
        authRes.isAuth = res.text().toLocaleLowerCase() === "authorized!";
        localStorage.setItem(
          "isLoggedInKey",
          authRes.isAuth ? "true" : "false"
        );
        if (authRes.isAuth) {
          this.loggedIn.next(true);
          this.currentUser.userName = userName;
          this.empServ.getUserByUserName(userName).subscribe((userDetails) => {
            this.currentUser.fullName = userDetails.fullName;
            this.currentUser.ID = userDetails.ID;
            this.currentUser.authorizationId = userDetails.authorizationId;
            this.userLoaded.next(true);
          });
        }
        return authRes;
      })
    );
  }

  logOut(): void {
    localStorage.setItem("currentUserKey", "");
    localStorage.setItem("isLoggedInKey", "false");
    this.currentUser = {
      userName: "",
      fullName: "",
      ID: 0,
      authorizationId: Constants.authorizationLevel2Num.None,
    };
    this.loggedIn.next(false);
  }
}
