import { Routes } from '@angular/router';
import { LoginComponent } from '../features/auth/pages/login.component';

export const routes: Routes = [
    {
      path: '',
      component: LoginComponent
    },
    {
      path: '**',
      redirectTo: ''
    }
  ];
