import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-administracion-principal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './administracion-principal.component.html',
  styleUrls: ['./administracion-principal.component.scss'],
})
export class AdministracionPrincipalComponent {
  constructor(private router: Router) {}

  volver(): void {
    this.router.navigate(['/dashboard/contracts']);
  }

  goToConstructoras(): void {
    this.router.navigate(['/dashboard/administracion/constructoras']);
  }

  goToProyectos(): void {
    this.router.navigate(['/dashboard/administracion/proyectos']);
  }

  goToContratos(): void {
    this.router.navigate(['/dashboard/administracion/contratos']);
  }

  goToInsumos(): void {
    this.router.navigate(['/dashboard/administracion/insumos']);
  }
}
