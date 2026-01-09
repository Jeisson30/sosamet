import { Routes } from '@angular/router';

// Auth
import { LoginComponent } from '../features/auth/pages/login.component';
import { ChangePasswordComponent } from '../features/auth/pages/changePassword.component';

//Contracts
import { ContractSelectTypeComponent } from '../features/contracts/pages/select-document/selectDocument.component';

// Layout
import { LayoutPrincipalComponent } from '../layout/layout-principal/layout-principal.component';
import { DashboardComponent } from '../layout/dashboard/dashboard.component';
import { UsersComponent } from '../features/users/pages/users/users.component';
import { ContractsComponent } from '../features/contracts/pages/contracts/contracts.component';
import { ContractConsultComponent } from '../features/contracts/pages/get-contract/getContract.component';

export const routes: Routes = [
  {
    path: '',
    component: LoginComponent, 
  },
  {
    path: 'changePassword',
    component: ChangePasswordComponent,
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
      {
        path: 'contracts',
        component: ContractSelectTypeComponent, 
      },
      { path: 'consult', 
        component: ContractConsultComponent
      },
      {
        path: 'gestion',
        loadChildren: () =>
          import('../features/gestion/gestion-routes')
            .then(m => m.GESTION_ROUTES)
      }
    ],
  },
  {
    path: '**',
    redirectTo: '', 
  },
];
