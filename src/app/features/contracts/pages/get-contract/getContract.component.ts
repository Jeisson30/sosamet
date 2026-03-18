import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-contract-consult',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule],
  templateUrl: 'getContract.component.html',
  styleUrls: ['getContract.component.scss'],
})
export class ContractConsultComponent {
  constructor(private router: Router) {}

  // Por ahora solo dejamos los handlers preparados para navegación futura
  onNuevoContrato(): void {
    console.log('Nuevo Contrato');
  }

  onConsultarContrato(): void {
    console.log('Consultar Contrato');
  }

  onNuevoAsistencia(): void {
    console.log('Nuevo Asistencia');
  }

  onConsultarAsistencia(): void {
    console.log('Consultar Asistencia');
  }

  onNuevoActaMedida(): void {
    console.log('Nuevo Acta de Medida');
  }

  onConsultarActaMedida(): void {
    console.log('Consultar Acta de Medida');
  }

  onNuevoOrdenCompra(): void {
    this.router.navigate(['/dashboard/contracts']);
  }

  onConsultarOrdenCompra(): void {
    this.router.navigate(['/dashboard/contracts/purchase-orders']);
  }

  onNuevoRemision(): void {
    this.router.navigate(['/dashboard/contracts']);
  }

  onConsultarRemision(): void {
    this.router.navigate(['/dashboard/contracts/remissions']);
  }

  onNuevoActaPago(): void {
    console.log('Nuevo Acta de Pago');
  }

  onConsultarActaPago(): void {
    console.log('Consultar Acta de Pago');
  }
}
