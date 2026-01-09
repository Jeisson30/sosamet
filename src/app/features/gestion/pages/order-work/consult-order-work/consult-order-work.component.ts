import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { FloatLabelModule } from 'primeng/floatlabel';

import { GestionUser } from '../../../shared/interfaces/Response.interface';
import { GestionService } from '../../../shared/service/gestion.service';

interface OrdenTrabajo {
  ordenT: string;
  creado: string;
  entregado: string;
  estado: string;
}

@Component({
  selector: 'app-consult-order-work',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    DropdownModule,
    CalendarModule,
    ButtonModule,
    TableModule,
    FloatLabelModule
  ],
  templateUrl: './consult-order-work.component.html',
  styleUrls: ['./consult-order-work.component.scss']
})
export class ConsultOrderWorkComponent  implements OnInit{

  filtroConsecutivo: string = '';
  empresaSeleccionada: any = null;
  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;

  ordenes: OrdenTrabajo[] = [];
  workUsers: GestionUser[] = [];
  userSelected :  number | null = null;
  years: { label: string; value: number }[] = [];
  yearSelected: number | null = null;

  constructor(
    private gestionService: GestionService
  ) {}

  ngOnInit(): void {
    this.getAllUsers();
    this.generateYears();
  }
 
  buscar(): void {
    console.log('Buscando con filtros');
  }

  limpiar(): void {
    this.filtroConsecutivo = '';
    this.empresaSeleccionada = null;
    this.fechaDesde = null;
    this.fechaHasta = null;
    this.ordenes = [];
  }

  getAllUsers(): void {
    this.gestionService.getAllUsers().subscribe({
      next: (res) => {
        this.workUsers = res.data.map(user => ({
          ...user,
          displayName: `${user.nombre} ${user.apellido} - ${user.perfil}`
        }));

        console.log('usuarios cargados:', this.workUsers);
      },
      error: (err) => {
        console.error('Error al obtener usuarios:', err);
      },
    }); 
  }

  // * Generará dinámicamente cada año
  
  private generateYears(): void {
  const startYear = 2025;
  const endYear = 2026;

  this.years = [];

  for (let year = startYear; year <= endYear; year++) {
    this.years.push({
      label: year.toString(),
      value: year
    });
  }
}
}
