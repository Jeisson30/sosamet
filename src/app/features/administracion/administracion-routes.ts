import { Routes } from '@angular/router';
import { AdministracionPrincipalComponent } from './pages/administracion-principal/administracion-principal.component';
import { ConstructorasAdminComponent } from './pages/constructoras-admin/constructoras-admin.component';
import { ProyectosAdminComponent } from './pages/proyectos-admin/proyectos-admin.component';

export const ADMINISTRACION_ROUTES: Routes = [
  {
    path: '',
    component: AdministracionPrincipalComponent,
  },
  {
    path: 'constructoras',
    component: ConstructorasAdminComponent,
  },
  {
    path: 'proyectos',
    component: ProyectosAdminComponent,
  },
];
