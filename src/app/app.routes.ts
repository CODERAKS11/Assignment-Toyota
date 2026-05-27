import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { AdminComponent } from './components/admin/admin.component';
import { SalesOfficerComponent } from './components/sales-officer/sales-officer.component';
import { adminGuard, salesGuard, loginGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: LoginComponent,
    canActivate: [loginGuard]
  },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [adminGuard]
  },
  {
    path: 'sales-officer',
    component: SalesOfficerComponent,
    canActivate: [salesGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
