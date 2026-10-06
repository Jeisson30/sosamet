import { Routes } from '@angular/router';
import { InventarioComponent } from './pages/inventario/inventario.component';
import { EntregaConsultaComponent } from './pages/entrega-consulta/entrega-consulta.component';
import { InventarioActualComponent } from './pages/inventario-actual/inventario-actual.component';
import { InventarioReporteComponent } from './pages/inventario-reporte/inventario-reporte.component';
import { IngresoNuevoComponent } from './pages/ingreso-nuevo/ingreso-nuevo.component';
import { IngresoConsultaComponent } from './pages/ingreso-consulta/ingreso-consulta.component';
import { EntregaNuevaComponent } from './pages/entrega-nueva/entrega-nueva.component';
import { DevolucionNuevaComponent } from './pages/devolucion-nueva/devolucion-nueva.component';

export const INVENTARIO_ROUTES: Routes = [
  { path: '', component: InventarioComponent },
  { path: 'ingresos/nuevo', component: IngresoNuevoComponent },
  { path: 'ingresos', component: IngresoConsultaComponent },
  { path: 'despachos/nuevo', component: EntregaNuevaComponent },
  { path: 'despachos', component: EntregaConsultaComponent },
  { path: 'devoluciones/nuevo', component: DevolucionNuevaComponent },
  { path: 'actual', component: InventarioActualComponent },
  { path: 'reporte', component: InventarioReporteComponent },
];
