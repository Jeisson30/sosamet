import { Routes } from '@angular/router';

// Auth
import { LoginComponent } from '../features/auth/pages/login.component';
import { ChangePasswordComponent } from '../features/auth/pages/changePassword.component';
import { authGuard } from './auth/auth.guard';

// Contracts
import { ContractSelectTypeComponent } from '../features/contracts/pages/select-document/selectDocument.component';
import { unsavedDocumentGuard } from './auth/unsaved-document.guard';

// Layout
import { LayoutPrincipalComponent } from '../layout/layout-principal/layout-principal.component';
import { UsersComponent } from '../features/users/pages/users/users.component';
import { ContractConsultComponent } from '../features/contracts/pages/get-contract/getContract.component';
import { PurchaseOrdersConsultComponent } from '../features/contracts/pages/purchase-orders-consult/purchase-orders-consult.component';
import { ContractsConsultComponent } from '../features/contracts/pages/contracts-consult/contracts-consult.component';
import { AsistenciaConsultComponent } from '../features/contracts/pages/asistencia-consult/asistencia-consult.component';
import { RemissionsConsultComponent } from '../features/gestion/pages/remissions-consult/remissions-consult.component';
import { InformesComponent } from '../features/reports/pages/informes/informes.component';
import { informesGuard } from './auth/informes.guard';
import { administracionGuard } from './auth/administracion.guard';
import { adminGuard } from './auth/admin.guard';
import { InventarioComponent } from '../features/inventario/pages/inventario/inventario.component';

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
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'contracts',
        pathMatch: 'full',
      },
      {
        path: 'users',
        component: UsersComponent, 
      },
      {
        path: 'contracts',
        component: ContractConsultComponent,
      },
      {
        path: 'contracts/nuevo',
        component: ContractSelectTypeComponent,
        canDeactivate: [unsavedDocumentGuard],
      },
      { path: 'consult', 
        component: ContractConsultComponent
      },
      {
        path: 'informes',
        component: InformesComponent,
        canActivate: [informesGuard],
      },
      {
        path: 'contracts/purchase-orders',
        component: PurchaseOrdersConsultComponent,
      },
      {
        path: 'contracts/remissions',
        component: RemissionsConsultComponent,
      },
      {
        path: 'contracts/consult-contracts',
        component: ContractsConsultComponent,
      },
      {
        path: 'contracts/consult-asistencia',
        component: AsistenciaConsultComponent,
      },
      {
        path: 'gestion',
        loadChildren: () =>
          import('../features/gestion/gestion-routes')
            .then(m => m.GESTION_ROUTES)
      },
      {
        path: 'administracion',
        canActivate: [administracionGuard],
        loadChildren: () =>
          import('../features/administracion/administracion-routes')
            .then(m => m.ADMINISTRACION_ROUTES)
      },
      {
        path: 'inventario',
        component: InventarioComponent,
        canActivate: [adminGuard],
      }
    ],
  },
  {
    path: '**',
    redirectTo: '', 
  },
];
