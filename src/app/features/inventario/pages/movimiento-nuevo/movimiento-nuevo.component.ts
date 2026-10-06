import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TableModule } from 'primeng/table';
import Swal from 'sweetalert2';

import {
  INVENTARIO_HUB_ROUTE,
  InventarioItemRow,
  SelectOption,
  UM_OPTIONS,
  nuevaFilaItem,
} from '../../shared/inventario.models';
import {
  MOVIMIENTO_CONFIG,
  MovimientoConfig,
  TipoMovimientoInventario,
} from '../../shared/inventario-tipos';

@Component({
  selector: 'app-inventario-movimiento-nuevo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    DropdownModule,
    CalendarModule,
    TableModule,
  ],
  templateUrl: './movimiento-nuevo.component.html',
  styleUrls: ['./movimiento-nuevo.component.scss'],
})
export class MovimientoNuevoComponent implements OnInit {
  config: MovimientoConfig = MOVIMIENTO_CONFIG.INGRESO;

  fecha: Date | null = new Date();
  usuario = '';
  observaciones = '';

  // Ingreso
  tipoIngreso: string | null = null;
  proveedor = '';
  documentoSoporte = '';
  ordenCompra = '';

  // Despacho
  constructora: string | null = null;
  proyecto: string | null = null;
  numeroContrato = '';
  numeroRemision = '';
  recibe = '';
  transportador = '';

  readonly tipoIngresoOptions: SelectOption[] = [
    { label: 'Compra', value: 'COMPRA' },
    { label: 'Devolución de obra', value: 'DEVOLUCION' },
    { label: 'Ajuste de inventario', value: 'AJUSTE' },
  ];
  constructoraOptions: SelectOption[] = [];
  proyectoOptions: SelectOption[] = [];
  insumoOptions: SelectOption[] = [];
  readonly umOptions = UM_OPTIONS;

  items: InventarioItemRow[] = [nuevaFilaItem()];

  constructor(private route: ActivatedRoute, private router: Router) {}

  get esIngreso(): boolean {
    return this.config.tipo === 'INGRESO';
  }

  get totalCantidad(): number {
    return this.items.reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0);
  }

  ngOnInit(): void {
    const tipo = this.route.snapshot.data['tipo'] as TipoMovimientoInventario;
    this.config = MOVIMIENTO_CONFIG[tipo] ?? MOVIMIENTO_CONFIG.INGRESO;
    const nombre = localStorage.getItem('nombreUsuario') ?? '';
    const apellido = localStorage.getItem('apellidoUsuario') ?? '';
    this.usuario = `${nombre} ${apellido}`.trim();
  }

  agregarItem(): void {
    this.items = [...this.items, nuevaFilaItem()];
  }

  eliminarItem(index: number): void {
    this.items = this.items.filter((_, i) => i !== index);
    if (!this.items.length) this.items = [nuevaFilaItem()];
  }

  guardar(): void {
    Swal.fire({
      icon: 'info',
      title: 'Próximamente',
      text: `"${this.config.labelGuardar}" se habilitará al conectar la lógica del inventario.`,
      confirmButtonColor: '#20506A',
    });
  }

  verConsulta(): void {
    this.router.navigate([this.config.rutaConsulta]);
  }

  volver(): void {
    this.router.navigate([INVENTARIO_HUB_ROUTE]);
  }
}
