import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

interface ProductionCard {
  id: string;
  title: string;
  icon: string;
  showNuevo: boolean;
  showConsultar: boolean;
  nuevoDisabled?: boolean;
  consultarDisabled?: boolean;
  onNuevo?: () => void;
  onConsultar?: () => void;
}

@Component({
  selector: 'app-gestion-principal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gestion-principal.component.html',
  styleUrls: ['./gestion-principal.component.scss'],
})
export class GestionPrincipalComponent implements OnInit {
  nombreUsuario = 'Usuario';
  cards: ProductionCard[] = [];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.nombreUsuario = localStorage.getItem('nombreUsuario') || 'Usuario';
    this.cards = [
      {
        id: 'attendance',
        title: 'Asistencia',
        icon: 'assets/images/ASISTENCIA.png',
        showNuevo: true,
        showConsultar: true,
        onNuevo: () =>
          this.router.navigate(['/dashboard/contracts/nuevo'], {
            queryParams: { tipo: 'ASISTENCIA' },
          }),
        onConsultar: () =>
          this.router.navigate(['/dashboard/contracts/consult-asistencia']),
      },
      {
        id: 'measurement-acts',
        title: 'Actas de Medida',
        icon: 'assets/images/ACTAS DE MEDIDA.png',
        showNuevo: true,
        showConsultar: true,
        onNuevo: () =>
          this.router.navigate(['/dashboard/contracts/nuevo'], {
            queryParams: { tipo: 'ACTAS DE MEDIDA' },
          }),
        onConsultar: () =>
          Swal.fire({
            icon: 'info',
            title: 'Consulta no disponible',
            text: 'La consulta de Actas de Medida aún no está habilitada.',
            confirmButtonColor: '#20506A',
          }),
      },
      {
        id: 'plans',
        title: 'Planos',
        icon: 'assets/images/PLANOS.png',
        showNuevo: true,
        showConsultar: true,
        onNuevo: () => this.goToPlansNew(),
        onConsultar: () => this.goToPlansConsult(),
      },
      {
        id: 'purchase-orders',
        title: 'Órdenes de Compra',
        icon: 'assets/images/ORDENES DE COMPRA.png',
        showNuevo: true,
        showConsultar: true,
        onNuevo: () =>
          this.router.navigate(['/dashboard/contracts/nuevo'], {
            queryParams: { tipo: 'ORDEN DE COMPRA' },
          }),
        onConsultar: () =>
          this.router.navigate(['/dashboard/contracts/purchase-orders']),
      },
      {
        id: 'work-orders',
        title: 'Órdenes de Trabajo',
        icon: 'assets/images/ORDEN DE TRABAJO.png',
        showNuevo: true,
        showConsultar: true,
        consultarDisabled: true,
        onNuevo: () => this.goToOrdenes(),
        onConsultar: () => this.goToConsultarOrden(),
      },
      {
        id: 'cuts-execution',
        title: 'Ejecución Cortes',
        icon: 'assets/images/EJECUCION DE CORTES.png',
        showNuevo: true,
        showConsultar: true,
        consultarDisabled: true,
        onNuevo: () => this.goToNewLiquidation(),
        onConsultar: () => this.goToNewLiquidation(),
      },
      {
        id: 'cuts-liquidation',
        title: 'Liquidación Cortes',
        icon: 'assets/images/LIQUIDACION DE CORTES.png',
        showNuevo: true,
        showConsultar: true,
        nuevoDisabled: true,
        consultarDisabled: true,
        onNuevo: () => this.goToCortes(),
        onConsultar: () => this.goToCortes(),
      },
      {
        id: 'summary',
        title: 'Resumen',
        icon: 'assets/images/RESUMEN.png',
        showNuevo: false,
        showConsultar: true,
        onConsultar: () => this.goToSummaryConsult(),
      },
    ];
  }

  goToOrdenes(): void {
    this.router.navigate(['/dashboard/gestion/order-work/create']);
  }

  goToConsultarOrden(): void {
    this.router.navigate(['/dashboard/gestion/order-work/consult']);
  }

  goToCortes(): void {
    this.router.navigate(['/dashboard/gestion/cortes-contratistas']);
  }

  goToNewLiquidation(): void {
    this.router.navigate(['/dashboard/gestion/liquidation-courts/create']);
  }

  goToPlansNew(): void {
    Swal.fire({
      icon: 'info',
      title: 'Próximamente',
      text: 'La creación de planos estará disponible en una próxima actualización.',
      confirmButtonColor: '#20506A',
    });
  }

  goToPlansConsult(): void {
    Swal.fire({
      icon: 'info',
      title: 'Próximamente',
      text: 'La consulta de planos estará disponible en una próxima actualización.',
      confirmButtonColor: '#20506A',
    });
  }

  goToSummaryConsult(): void {
    Swal.fire({
      icon: 'info',
      title: 'Próximamente',
      text: 'El resumen estará disponible en una próxima actualización.',
      confirmButtonColor: '#20506A',
    });
  }

  onNuevo(card: ProductionCard): void {
    if (card.nuevoDisabled || !card.onNuevo) return;
    card.onNuevo();
  }

  onConsultar(card: ProductionCard): void {
    if (card.consultarDisabled || !card.onConsultar) return;
    card.onConsultar();
  }

  onIconError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.opacity = '0.25';
  }
}
