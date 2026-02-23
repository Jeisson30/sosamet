import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-gestion-principal',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule],
  templateUrl: './gestion-principal.component.html',
  styleUrls: ['./gestion-principal.component.scss']
})
export class GestionPrincipalComponent {

  constructor(private router: Router) {}

  goToOrdenes(): void {    
    this.router.navigate(['/dashboard/gestion/order-work/create']);;
  }

  goToConsultarOrden(): void {
    console.log('dirige');
    
    this.router.navigate(['/dashboard/gestion/order-work/consult']);
  }

  goToCortes(): void {
    this.router.navigate(['/dashboard/gestion/cortes-contratistas']);
  }

  goToNewLiquidation(): void {
    this.router.navigate(['/dashboard/gestion/liquidation-courts/create']);
  }
}
