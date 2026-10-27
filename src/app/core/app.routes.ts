import { Routes } from '@angular/router';

// Auth
import { LoginComponent } from '../features/auth/pages/login.component';
import { ChangePasswordComponent } from '../features/auth/pages/changePassword.component';
import { ForgotPasswordComponent } from '../features/auth/pages/forgot-password.component';
import { authGuard } from './auth/auth.guard';

// Contracts
import { ContractSelectTypeComponent } from '../features/contracts/pages/select-document/selectDocument.component';
import { unsavedDocumentGuard } from './auth/unsaved-document.guard';

// Layout
import { LayoutPrincipalComponent } from '../layout/layout-principal/layout-principal.component';
import { UsersHubComponent } from '../features/users/pages/users-hub/users-hub.component';
import { UsersComponent } from '../features/users/pages/users/users.component';
import { CatalogUsersComponent } from '../features/users/pages/catalog-users/catalog-users.component';
import { ContractConsultComponent } from '../features/contracts/pages/get-contract/getContract.component';
import { PurchaseOrdersConsultComponent } from '../features/contracts/pages/purchase-orders-consult/purchase-orders-consult.component';
import { ContractsConsultComponent } from '../features/contracts/pages/contracts-consult/contracts-consult.component';
import { AsistenciaConsultComponent } from '../features/contracts/pages/asistencia-consult/asistencia-consult.component';
import { AsistenciaNuevoComponent } from '../features/contracts/pages/asistencia-nuevo/asistencia-nuevo.component';
import { OtroSiNuevoComponent } from '../features/contracts/pages/otro-si-nuevo/otro-si-nuevo.component';
import { OtroSiConsultaComponent } from '../features/contracts/pages/otro-si-consulta/otro-si-consulta.component';
import { MemoriaNuevoComponent } from '../features/contracts/pages/memoria-nuevo/memoria-nuevo.component';
import { MemoriaConsultaComponent } from '../features/contracts/pages/memoria-consulta/memoria-consulta.component';
import { ActaPagoNuevoComponent } from '../features/contracts/pages/acta-pago-nuevo/acta-pago-nuevo.component';
import { ActaPagoConsultaComponent } from '../features/contracts/pages/acta-pago-consulta/acta-pago-consulta.component';
import { RemissionsConsultComponent } from '../features/gestion/pages/remissions-consult/remissions-consult.component';
import { InformesComponent } from '../features/reports/pages/informes/informes.component';
import { informesGuard } from './auth/informes.guard';
import { administracionGuard } from './auth/administracion.guard';
import { adminGuard } from './auth/admin.guard';
import { inventarioGuard } from './auth/inventario.guard';

export const routes: Routes = [
  {
    path: '',
    component: LoginComponent,
  },
  {
    path: 'recuperar',
    component: ForgotPasswordComponent,
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
        component: UsersHubComponent,
        canActivate: [adminGuard],
      },
      {
        path: 'users/system',
        component: UsersComponent,
        canActivate: [adminGuard],
      },
      {
        path: 'users/catalog',
        component: CatalogUsersComponent,
        canActivate: [adminGuard],
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
        path: 'contracts/asistencia-nuevo',
        component: AsistenciaNuevoComponent,
      },
      {
        path: 'contracts/otro-si',
        component: OtroSiConsultaComponent,
      },
      {
        path: 'contracts/otro-si/nuevo',
        component: OtroSiNuevoComponent,
      },
      {
        path: 'contracts/otro-si/editar/:id',
        component: OtroSiNuevoComponent,
      },
      {
        path: 'contracts/memorias',
        component: MemoriaConsultaComponent,
      },
      {
        path: 'contracts/memorias/nuevo',
        component: MemoriaNuevoComponent,
      },
      {
        path: 'contracts/memorias/ver/:id',
        component: MemoriaNuevoComponent,
      },
      {
        path: 'contracts/actas-pago',
        component: ActaPagoConsultaComponent,
      },
      {
        path: 'contracts/actas-pago/nuevo',
        component: ActaPagoNuevoComponent,
      },
      {
        path: 'contracts/actas-pago/ver/:id',
        component: ActaPagoNuevoComponent,
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
        canActivate: [inventarioGuard],
        loadChildren: () =>
          import('../features/inventario/inventario-routes')
            .then(m => m.INVENTARIO_ROUTES)
      }
    ],
  },
  {
    path: '**',
    redirectTo: '', 
  },
];
