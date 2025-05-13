import { Routes } from '@angular/router';

// Auth
import { LoginComponent } from '../features/auth/pages/login.component';

// Layout
import { LayoutPrincipalComponent } from '../layout/layout-principal/layout-principal.component';
import { DashboardComponent } from '../layout/dashboard/dashboard.component';
import { UsersComponent } from '../features/users/pages/users/users.component';

export const routes: Routes = [
  {
    path: '',
    component: LoginComponent, 
  },
  {
    path: 'dashboard',
    component: LayoutPrincipalComponent,  
    children: [
      {
        path: '',
        component: DashboardComponent,  
      },
      {
        path: 'users',
        component: UsersComponent, 
      },
    ],
  },
  {
    path: '**',
    redirectTo: '', 
  },
];
