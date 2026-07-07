import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoginFormComponent } from './login-form/login-form.component';
import { MainComponent } from './main/main.component';
import { CourseEditComponent } from './course-edit/course-edit.component';
import { CourseDetailComponent } from './course-detail/course-detail.component';
import { CourseListComponent } from './course-list/course-list.component';
import { EmpListComponent } from './emp-list/emp-list.component';
import { EmpDetailComponent } from './emp-detail/emp-detail.component';
import { AuthGuard } from './auth.guard';
import { PendingChangesGuard } from './pending-changes.guard';
import { BudgetComponent } from './budget/budget.component';
import { AboutComponent } from './about/about.component';
import { HoursComponent } from './hours/hours.component';
import { AuthMngrGuard } from './auth-mngr.guard';
import { ConfListComponent } from './conference-list/conf-list.component';

const routes: Routes = [
  { path: 'log_in', component: LoginFormComponent },
  { path: '', canActivate: [AuthGuard], children: [
      { path: '', redirectTo: 'main', pathMatch: 'full' },
      { path: 'main', component: MainComponent },
      { path: 'edit', component: CourseEditComponent, canDeactivate: [PendingChangesGuard] },
      { path: 'edit/:name', component: CourseEditComponent, canDeactivate: [PendingChangesGuard] },
      { path: 'edit/:name/:duplicate', component: CourseEditComponent, canDeactivate: [PendingChangesGuard] },
      { path: 'courses', component: CourseListComponent },
      { path: 'confs', component: ConfListComponent },
      { path: 'courses/:name', component: CourseDetailComponent },
      { path: 'employees', component: EmpListComponent },
      { path: 'employees/:ID', component: EmpDetailComponent, canActivate: [AuthMngrGuard] },
      { path: 'budget', component: BudgetComponent },
      { path: 'hours', component: HoursComponent },
      { path: 'about', component: AboutComponent }
  ]},
  { path: '**', redirectTo: 'log_in', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {useHash: true})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
