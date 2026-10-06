import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TableModule } from 'primeng/table';
import Swal from 'sweetalert2';

import { INVENTARIO_HUB_ROUTE, SelectOption } from '../../shared/inventario.models';
import {
  MOVIMIENTO_CONFIG,
  MovimientoConfig,
  TipoMovimientoInventario,
} from '../../shared/inventario-tipos';

/** Fila de la consulta (se llenará desde el API cuando se conecte la lógica). */
interface MovimientoResumenRow {
  consecutivo: string;
  fecha: string;
  tercero: string;
  documento: string;
  items: number;
  cantidad: number;
  usuario: string;
  estado: string;
}

@Component({
  selector: 'app-inventario-movimiento-consulta',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    CalendarModule,
    TableModule,
  ],
  templateUrl: './movimiento-consulta.component.html',
  styleUrls: ['./movimiento-consulta.component.scss'],
})
export class MovimientoConsultaComponent implements OnInit {
  config: MovimientoConfig = MOVIMIENTO_CONFIG.INGRESO;

  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;
  consecutivo = '';
  tercero = '';
  documento = '';
  proyecto: string | null = null;
  estado: string | null = null;

  proyectoOptions: SelectOption[] = [];
  readonly estadoOptions: SelectOption[] = [
    { label: 'Activo', value: 'ACTIVO' },
    { label: 'Anulado', value: 'ANULADO' },
  ];

  rows: MovimientoResumenRow[] = [];
  loading = false;
  readonly rowsPerPage = 10;
  readonly rowsPerPageOptions = [10, 25, 50];

  constructor(private route: ActivatedRoute, private router: Router) {}

  get esIngreso(): boolean {
    return this.config.tipo === 'INGRESO';
  }

  ngOnInit(): void {
    const tipo = this.route.snapshot.data['tipo'] as TipoMovimientoInventario;
    this.config = MOVIMIENTO_CONFIG[tipo] ?? MOVIMIENTO_CONFIG.INGRESO;
  }

  buscar(): void {
    Swal.fire({
      icon: 'info',
      title: 'Próximamente',
      text: `La consulta de ${this.esIngreso ? 'ingresos' : 'despachos'} se habilitará al conectar la lógica del inventario.`,
      confirmButtonColor: '#20506A',
    });
  }

  limpiar(): void {
    this.fechaDesde = null;
    this.fechaHasta = null;
    this.consecutivo = '';
    this.tercero = '';
    this.documento = '';
    this.proyecto = null;
    this.estado = null;
    this.rows = [];
  }

  nuevo(): void {
    this.router.navigate([this.config.rutaNuevo]);
  }

  volver(): void {
    this.router.navigate([INVENTARIO_HUB_ROUTE]);
  }
}
