import { Routes } from '@angular/router';
import { GestionPrincipalComponent } from './pages/gestion-principal/gestion-principal.component';
import { OrderWorkMenuComponent } from './pages/order-work/order-work-menu/order-work-menu.component';
import { CreateOrderWorkComponent } from './pages/order-work/create-order-work/create-order-work.component';
import { AssignOrderWorkComponent } from './pages/order-work/assign-order-work/assign-order-work.component';
import { ConsultOrderWorkComponent } from './pages/order-work/consult-order-work/consult-order-work.component';
import { CreateLiquidationComponent } from './pages/liquidation-courts/create-liquidation-courts/create-liquidation-courts.component';
import { ActasMedidaConsultComponent } from './pages/actas-medida-consult/actas-medida-consult.component';
import { RegistrarPlanoComponent } from './pages/registrar-plano/registrar-plano.component';
import { PlanosConsultComponent } from './pages/planos-consult/planos-consult.component';

export const GESTION_ROUTES: Routes = [
  {
    path: '',
    component: GestionPrincipalComponent
  },
  {
    path: 'actas-medida',
    component: ActasMedidaConsultComponent
  },
  {
    path: 'registrar-plano',
    component: RegistrarPlanoComponent
  },
  {
    path: 'planos',
    component: PlanosConsultComponent
  },
  {
    path: 'order-work',
    children: [
      {
        path: '',
        component: OrderWorkMenuComponent
      },
      {
        path: 'create',
        component: CreateOrderWorkComponent
      },
      {
        path: 'assign',
        component: AssignOrderWorkComponent
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
  }
];

