import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

// PrimeNG
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

// Auth
import { AuthService } from '../../features/auth/shared/service/auth.service';
import { MobileNavService } from '../mobile-nav.service';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [CommonModule, AvatarModule, ButtonModule, MenuModule],
})
export class HeaderComponent implements OnInit, OnDestroy {
  nombreUsuario: string = 'Desconocido';
  userMenu: MenuItem[] = [];
  mobileNavOpen = false;

  private authService = inject(AuthService);
  private mobileNav = inject(MobileNavService);
  private sub?: Subscription;

  ngOnInit(): void {
    const usuario = localStorage.getItem('nombreUsuario');
    this.nombreUsuario = usuario ?? 'Desconocido';
    this.userMenu = [
      {
        label: 'Mi perfil',
        icon: 'pi pi-user',
        command: () => {
          console.log('Perfil');
        },
      },
      {
        label: 'Configuración',
        icon: 'pi pi-cog',
        command: () => {
          console.log('Configuración');
        },
      },
      {
        label: 'Cerrar sesión',
        icon: 'pi pi-sign-out',
        command: () => {
          this.logout();
        },
      },
    ];

    this.sub = this.mobileNav.open$.subscribe((open) => {
      this.mobileNavOpen = open;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  toggleMobileNav(): void {
    this.mobileNav.toggle();
  }

  logout(): void {
    this.authService.logout();
  }
}
