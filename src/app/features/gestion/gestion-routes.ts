import { Routes } from '@angular/router';
import { GestionPrincipalComponent } from './pages/gestion-principal/gestion-principal.component';
import { CreateOrderWorkComponent } from './pages/order-work/create-order-work/create-order-work.component';
import { ConsultOrderWorkComponent } from './pages/order-work/consult-order-work/consult-order-work.component';
import { CreateLiquidationComponent } from './pages/liquidation-courts/create-liquidation-courts/create-liquidation-courts.component';
import { PurchaseOrdersConsultComponent } from '../contracts/pages/purchase-orders-consult/purchase-orders-consult.component';
import { RemissionsConsultComponent } from './pages/remissions-consult/remissions-consult.component';

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
  },
  {
    path: 'liquidation-courts',
    children: [
      {
        path: 'create',
        component: CreateLiquidationComponent
      },
    ]
  },
  {
    path: 'purchase-orders',
    children: [
      {
        path: 'consult',
        component: PurchaseOrdersConsultComponent,
      },
    ],
  },
  {
    path: 'remissions',
    children: [
      {
        path: 'consult',
        component: RemissionsConsultComponent,
      },
    ],
  }
];
