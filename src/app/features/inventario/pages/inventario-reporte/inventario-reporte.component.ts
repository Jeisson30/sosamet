import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import Swal from 'sweetalert2';

import { INVENTARIO_HUB_ROUTE, SelectOption } from '../../shared/inventario.models';

/** Movimiento del kardex (se llenará desde el API cuando se conecte la lógica). */
interface KardexRow {
  fecha: string;
  tipo: string;
  consecutivo: string;
  codigo: string;
  insumo: string;
  um: string;
  entrada: number;
  salida: number;
  saldo: number;
  tercero: string;
  usuario: string;
}

@Component({
  selector: 'app-inventario-reporte',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DropdownModule,
    CalendarModule,
    InputTextModule,
    TableModule,
  ],
  templateUrl: './inventario-reporte.component.html',
  styleUrls: ['./inventario-reporte.component.scss'],
})
export class InventarioReporteComponent {
  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;
  tipoReporte: string | null = 'KARDEX';
  tipoMovimiento: string | null = null;
  insumo = '';
  categoria: string | null = null;

  readonly tipoReporteOptions: SelectOption[] = [
    { label: 'Kardex de movimientos', value: 'KARDEX' },
    { label: 'Existencias a la fecha', value: 'EXISTENCIAS' },
  ];
  readonly tipoMovimientoOptions: SelectOption[] = [
    { label: 'Ingresos', value: 'INGRESO' },
    { label: 'Despachos', value: 'DESPACHO' },
  ];
  categoriaOptions: SelectOption[] = [];

  rows: KardexRow[] = [];
  loading = false;
  readonly rowsPerPage = 10;
  readonly rowsPerPageOptions = [10, 25, 50];

  constructor(private router: Router) {}

  private pendiente(accion: string): void {
    Swal.fire({
      icon: 'info',
      title: 'Próximamente',
      text: `${accion} se habilitará al conectar la lógica del inventario.`,
      confirmButtonColor: '#20506A',
    });
  }

  generar(): void {
    this.pendiente('La vista previa del reporte');
  }

  exportarExcel(): void {
    this.pendiente('La exportación a Excel');
  }

  exportarPdf(): void {
    this.pendiente('La exportación a PDF');
  }

  limpiar(): void {
    this.fechaDesde = null;
    this.fechaHasta = null;
    this.tipoReporte = 'KARDEX';
    this.tipoMovimiento = null;
    this.insumo = '';
    this.categoria = null;
    this.rows = [];
  }

  volver(): void {
    this.router.navigate([INVENTARIO_HUB_ROUTE]);
  }
}
