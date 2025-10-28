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
    this.items = [
      {
        label: 'Usuarios',
        //icon: 'https://primefaces.org/cdn/primeng/images/dock/finder.svg',
        icon: 'assets/images/usuarios.png',
        command: () => {
          this.router.navigate(['/dashboard/users']);
        },
      },
      {
        label: 'Documentos',
        //icon: 'https://cdn-icons-png.flaticon.com/128/748/748504.png',
        icon: 'assets/images/documentos.png',
        command: () => {
          this.router.navigate(['/dashboard/contracts']);
        },
      },
      {
        label: 'Consultas',
        //icon: 'https://cdn-icons-png.flaticon.com/128/8123/8123498.png',
        icon: 'assets/images/consultas.png',
        command: () => {
          this.router.navigate(['/dashboard/consult']);
        },
      }
    ];
  }
}
