import { BrowserModule } from '@angular/platform-browser';
import { NgModule, ErrorHandler, APP_INITIALIZER } from '@angular/core';
import { HttpModule } from '@angular/http';
import { HttpClientModule } from '@angular/common/http';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {MAT_MOMENT_DATE_FORMATS, MomentDateAdapter} from '@angular/material-moment-adapter';
import {DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE} from '@angular/material/core';
import {NgxWigModule} from '../../ngx-wig';
import { ChartsModule } from 'ng2-charts';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginFormComponent } from './login-form/login-form.component';
import { MatImportsModule } from './mat-imports/mat-imports.module';
import { CourseListComponent } from './course-list/course-list.component';
import { CourseDetailComponent } from './course-detail/course-detail.component';
import { EmpListComponent } from './emp-list/emp-list.component';
import { EmpDetailComponent } from './emp-detail/emp-detail.component';
import { CourseEditComponent } from './course-edit/course-edit.component';
import { MainComponent } from './main/main.component';
import { NavbarComponent } from './navbar/navbar.component';
import { ConfirmationDialogComponent,
         CollapsibleWellComponent,
         CollapsibleWellListComponent,
         GenericModalComponent } from './common';

import { AuthGuard } from './auth.guard';
import { PendingChangesGuard } from './pending-changes.guard';
import {AuthService,
        EmployeeService,
        CourseService,
        ConfirmationDialogService,
        ComaErrorHandlerService,
        NotificationService,
        VersionCheckService } from './services';
import { NotificationsComponent } from './notifications/notifications.component';
import { BudgetComponent } from './budget/budget.component';
import { AboutComponent } from './about/about.component';
import { HoursComponent } from './hours/hours.component';
import { AuthMngrGuard } from './auth-mngr.guard';
import { ConfListComponent } from './conference-list/conf-list.component';
import { AppConfigService } from './services/app-config.service';

const appInitializerFn = (configService: AppConfigService) => {
  return () => {
    return configService.setConfig();
  };
};

@NgModule({
  declarations: [
    AppComponent,
    LoginFormComponent,
    CourseListComponent,
    ConfListComponent,
    CourseDetailComponent,
    EmpListComponent,
    EmpDetailComponent,
    CourseEditComponent,
    MainComponent,
    NavbarComponent,
    CollapsibleWellComponent,
    ConfirmationDialogComponent,
    CollapsibleWellListComponent,
    GenericModalComponent,
    NotificationsComponent,
    BudgetComponent,
    AboutComponent,
    HoursComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    MatImportsModule,
    FormsModule,
    ReactiveFormsModule,
    HttpModule,
    HttpClientModule,
    NgbModule,
    NgbModule.forRoot(),
    NgxWigModule,
    ChartsModule,
    ],
  providers: [
    AuthService,
    EmployeeService,
    CourseService,
    ConfirmationDialogService,
    NotificationService,
    VersionCheckService,
    AuthGuard,
    AuthMngrGuard,
    PendingChangesGuard,
    {provide: ErrorHandler, useClass: ComaErrorHandlerService},
    {provide: MAT_DATE_LOCALE, useValue: 'en-GB'},
    {provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE]},
    {provide: MAT_DATE_FORMATS, useValue: MAT_MOMENT_DATE_FORMATS},
    AppConfigService,
    {
      provide: APP_INITIALIZER,
      useFactory: appInitializerFn,
      multi: true,
      deps: [AppConfigService]
    }
  ],
  bootstrap: [AppComponent],
  entryComponents: [ ConfirmationDialogComponent ]
})
export class AppModule { }
