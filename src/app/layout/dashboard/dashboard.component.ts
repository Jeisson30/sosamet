import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { TooltipModule } from 'primeng/tooltip';
import { Dock } from 'primeng/dock';
import {
  puedeCrearUsuarios,
  puedeVerAdministracion,
  puedeVerHubContratos,
  puedeVerInventario,
  puedeVerProduccion,
} from '../../core/auth/permissions';
import { MobileNavService } from '../mobile-nav.service';

/** Menú lateral (dock desktop / drawer móvil). Contenido en layout-principal. */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [CommonModule, Dock, TooltipModule],
})
export class DashboardComponent implements OnInit, OnDestroy {
  items: MenuItem[] = [];
  position: 'left' | 'top' = 'left';
  mobileNavOpen = false;

  private mobileNav = inject(MobileNavService);
  private sub?: Subscription;

  constructor(private router: Router) {}

  ngOnInit(): void {
    const fullMenu: MenuItem[] = [
      {
        label: 'Usuarios',
        icon: 'assets/images/usuarios.png',
        command: () => {
          this.router.navigate(['/dashboard/users']);
        },
        visible: puedeCrearUsuarios(),
      },
      {
        label: 'Administración',
        icon: 'assets/images/adminconstructoras.png',
        command: () => {
          this.router.navigate(['/dashboard/administracion']);
        },
        visible: puedeVerAdministracion(),
      },
      {
        label: 'Contratos',
        icon: 'assets/images/documentos.png',
        command: () => {
          this.router.navigate(['/dashboard/contracts']);
        },
        visible: puedeVerHubContratos(),
      },
      {
        label: 'Producción',
        icon: 'assets/images/contratistas.png',
        command: () => {
          this.router.navigate(['/dashboard/gestion']);
        },
        visible: puedeVerProduccion(),
      },
      {
        label: 'Inventario',
        icon: 'assets/images/MODULO INVENTARIO.png',
        command: () => {
          this.router.navigate(['/dashboard/inventario']);
        },
        visible: puedeVerInventario(),
      },
    ];
    this.items = fullMenu.filter((item) => item.visible !== false);

    this.sub = this.mobileNav.open$.subscribe((open) => {
      this.mobileNavOpen = open;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  closeMobileNav(): void {
    this.mobileNav.close();
  }

  onMobileItemClick(item: MenuItem): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    item.command?.({ item } as any);
    this.mobileNav.close();
  }
}
