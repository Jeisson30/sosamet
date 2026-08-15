import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface OrderWorkOptionCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-order-work-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-work-menu.component.html',
  styleUrls: ['./order-work-menu.component.scss'],
})
export class OrderWorkMenuComponent {
  readonly cards: OrderWorkOptionCard[] = [
    {
      id: 'create',
      title: 'Crear Orden',
      description: 'Crear una nueva orden de trabajo',
      icon: 'assets/images/ORDEN DE TRABAJO.png',
      route: '/dashboard/gestion/order-work/create',
    },
    {
      id: 'assign',
      title: 'Asignar',
      description: 'Asignar órdenes de trabajo',
      icon: 'assets/images/ORDEN DE TRABAJO.png',
      route: '/dashboard/gestion/order-work/assign',
    },
  ];

  constructor(private router: Router) {}

  goTo(card: OrderWorkOptionCard): void {
    this.router.navigate([card.route]);
  }

  onIconError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.opacity = '0.25';
  }
}
