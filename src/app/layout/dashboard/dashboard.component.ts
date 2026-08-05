import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { Dock } from 'primeng/dock';

/** Menú lateral (dock). El contenido de cada ruta se renderiza en layout-principal. */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [CommonModule, Dock, TooltipModule],
})
export class DashboardComponent implements OnInit {
  items: MenuItem[] = [];

  position: 'left' | 'top' = 'left';

  constructor(private router: Router) {}

  ngOnInit(): void {
    const idPerfil = Number(localStorage.getItem('id_perfil'));
    const fullMenu: MenuItem[] = [
      {
        label: 'Usuarios',
        icon: 'assets/images/usuarios.png',
        command: () => {
          this.router.navigate(['/dashboard/users']);
        },
        visible: idPerfil === 1,
      },
      {
        label: 'Administración',
        icon: 'assets/images/adminconstructoras.png',
        command: () => {
          this.router.navigate(['/dashboard/administracion']);
        },
        visible: idPerfil === 1 || idPerfil === 2,
      },
      {
        label: 'Contratos',
        icon: 'assets/images/documentos.png',
        command: () => {
          this.router.navigate(['/dashboard/contracts']);
        },
        visible: true,
      },
      {
        label: 'Producción',
        icon: 'assets/images/contratistas.png',
        command: () => {
          this.router.navigate(['/dashboard/gestion']);
        },
        visible: idPerfil === 1 || idPerfil === 2,
      },
      {
        label: 'Inventario',
        icon: 'assets/images/MODULO INVENTARIO.png',
        command: () => {
          this.router.navigate(['/dashboard/inventario']);
        },
        visible: idPerfil === 1,
      },
    ];
    this.items = fullMenu.filter((item) => item.visible !== false);
  }
}
