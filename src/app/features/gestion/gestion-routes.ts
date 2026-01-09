import { Routes } from '@angular/router';
import { GestionPrincipalComponent } from './pages/gestion-principal/gestion-principal.component';
import { CreateOrderWorkComponent } from './pages/order-work/create-order-work/create-order-work.component';
import { ConsultOrderWorkComponent } from './pages/order-work/consult-order-work/consult-order-work.component';

export const GESTION_ROUTES: Routes = [
  {
    path: '',
    component: GestionPrincipalComponent
  },
  {
    path: 'order-work',
    children: [
      {
        path: 'create',
        component: CreateOrderWorkComponent
      },
      {
        path: 'consult',
        component: ConsultOrderWorkComponent
      }
    ]
  }
];
