import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { Dock } from 'primeng/dock';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [CommonModule, Dock, TooltipModule, RouterModule],
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
      // Solo admin
      visible: idPerfil === 1
    },
    {
      label: 'Documentos',
      icon: 'assets/images/documentos.png',
      command: () => {
        this.router.navigate(['/dashboard/contracts']);
      },
      visible: true
    },
    {
      label: 'Consultas',
      icon: 'assets/images/consultas.png',
      command: () => {
        this.router.navigate(['/dashboard/consult']);
      },
      visible: idPerfil === 1 || idPerfil === 2 || idPerfil === 10 || idPerfil === 6 || idPerfil === 7 || idPerfil === 13
    }
  ];
  this.items = fullMenu.filter(item => item.visible !== false);
  }
}
