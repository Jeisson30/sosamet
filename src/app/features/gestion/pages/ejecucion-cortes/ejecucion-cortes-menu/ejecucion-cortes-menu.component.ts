import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface EjecucionOptionCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-ejecucion-cortes-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ejecucion-cortes-menu.component.html',
  styleUrls: ['./ejecucion-cortes-menu.component.scss'],
})
export class EjecucionCortesMenuComponent {
  readonly cards: EjecucionOptionCard[] = [
    {
      id: 'create',
      title: 'Crear Orden',
      description: 'Crear liquidación / orden de corte (flujo actual)',
      icon: 'assets/images/EJECUCION DE CORTES.png',
      route: '/dashboard/gestion/ejecucion-cortes/crear',
    },
    {
      id: 'assign',
      title: 'Asignar',
      description: 'Ejecutar órdenes de trabajo asignadas y actividades adicionales',
      icon: 'assets/images/ORDEN DE TRABAJO.png',
      route: '/dashboard/gestion/ejecucion-cortes/asignar',
    },
  ];

  constructor(private router: Router) {}

  volver(): void {
    this.router.navigate(['/dashboard/gestion']);
  }

  goTo(card: EjecucionOptionCard): void {
    this.router.navigate([card.route]);
  }

  onIconError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.opacity = '0.25';
  }
}
