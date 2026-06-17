import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-administracion-principal',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule],
  templateUrl: './administracion-principal.component.html',
  styleUrls: ['./administracion-principal.component.scss'],
})
export class AdministracionPrincipalComponent {
  constructor(private router: Router) {}

  goToConstructoras(): void {
    this.router.navigate(['/dashboard/administracion/constructoras']);
  }

  goToProyectos(): void {
    this.router.navigate(['/dashboard/administracion/proyectos']);
  }
}
