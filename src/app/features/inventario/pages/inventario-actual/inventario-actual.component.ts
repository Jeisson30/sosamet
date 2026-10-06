import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';
import Swal from 'sweetalert2';

import { INVENTARIO_HUB_ROUTE, SelectOption } from '../../shared/inventario.models';

/** Existencia por insumo (se llenará desde el API cuando se conecte la lógica). */
interface ExistenciaRow {
  codigo: string;
  insumo: string;
  categoria: string;
  um: string;
  entradas: number;
  salidas: number;
  disponible: number;
  ultimo_movimiento: string;
}

@Component({
  selector: 'app-inventario-actual',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, DropdownModule, TableModule],
  templateUrl: './inventario-actual.component.html',
  styleUrls: ['./inventario-actual.component.scss'],
})
export class InventarioActualComponent {
  buscarTexto = '';
  categoria: string | null = null;
  disponibilidad: string | null = null;

  categoriaOptions: SelectOption[] = [];
  readonly disponibilidadOptions: SelectOption[] = [
    { label: 'Con existencia', value: 'CON' },
    { label: 'Sin existencia', value: 'SIN' },
  ];

  rows: ExistenciaRow[] = [];
  loading = false;
  readonly rowsPerPage = 10;
  readonly rowsPerPageOptions = [10, 25, 50];

  constructor(private router: Router) {}

  get totalInsumos(): number {
    return this.rows.length;
  }

  get totalConExistencia(): number {
    return this.rows.filter((r) => r.disponible > 0).length;
  }

  get totalSinExistencia(): number {
    return this.rows.filter((r) => r.disponible <= 0).length;
  }

  buscar(): void {
    Swal.fire({
      icon: 'info',
      title: 'Próximamente',
      text: 'El inventario actual se mostrará al conectar la lógica del inventario.',
      confirmButtonColor: '#20506A',
    });
  }

  limpiar(): void {
    this.buscarTexto = '';
    this.categoria = null;
    this.disponibilidad = null;
  }

  verReporte(): void {
    this.router.navigate(['/dashboard/inventario/reporte']);
  }

  volver(): void {
    this.router.navigate([INVENTARIO_HUB_ROUTE]);
  }
}
