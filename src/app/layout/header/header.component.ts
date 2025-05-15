import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

//PrimeNg
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [CommonModule, AvatarModule, ButtonModule, MenuModule],
})
export class HeaderComponent implements OnInit {
  nombreUsuario: string = 'Desconocido';
  userMenu: MenuItem[] = [];

  constructor(private router: Router) {}

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
  }

  logout(): void {
    localStorage.removeItem('nombreUsuario');
    this.router.navigate(['']);
  }
}
