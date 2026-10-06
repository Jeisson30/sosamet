import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import Swal from 'sweetalert2';

import { AdministracionService } from '../../../administracion/shared/service/administracion.service';
import {
  InvCategoriaAdmin,
  InvMaterialAdmin,
} from '../../../administracion/shared/interfaces/administracion.interface';
import { INVENTARIO_HUB_ROUTE, SelectOption } from '../../shared/inventario.models';
import { MOVIMIENTO_CONFIG } from '../../shared/inventario-tipos';
import {
  IngresoMaterialItem,
  PRIORIDAD_STOCK_OPTIONS,
  UBICACION_OPTIONS,
  ingresoItemToPayload,
  movimientoRowToIngresoItem,
  toIsoDate,
} from '../../shared/ingreso-material.model';
import {
  InventarioService,
  MovimientoItemHistorial,
  MovimientoItemRow,
} from '../../shared/service/inventario.service';

@Component({
  selector: 'app-inventario-ingreso-consulta',
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
    DialogModule,
    MenuModule,
  ],
  templateUrl: './ingreso-consulta.component.html',
  styleUrls: ['./ingreso-consulta.component.scss'],
})
export class IngresoConsultaComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly buscar$ = new Subject<string>();

  readonly config = MOVIMIENTO_CONFIG.INGRESO;
  readonly ubicacionOptions = UBICACION_OPTIONS;
  readonly prioridadOptions = PRIORIDAD_STOCK_OPTIONS;
  readonly rowsPerPageOptions = [10, 25, 50, 100];

  buscar = '';
  idCategoria: string | null = null;
  prioridad: string | null = null;
  ubicacion: string | null = null;
  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;

  categorias: InvCategoriaAdmin[] = [];
  materiales: InvMaterialAdmin[] = [];
  categoriaOptions: SelectOption[] = [];
  codigoOptions: SelectOption[] = [];

  rows: MovimientoItemRow[] = [];
  loading = false;

  menuRow: MovimientoItemRow | null = null;
  rowMenuItems: MenuItem[] = [];

  detalleVisible = false;
  editMode = false;
  guardando = false;
  seleccionado: MovimientoItemRow | null = null;
  form: IngresoMaterialItem | null = null;
  historial: MovimientoItemHistorial[] = [];

  constructor(
    private inventarioService: InventarioService,
    private administracionService: AdministracionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.buscar$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.consultar());
    this.cargarCatalogo();
    this.consultar();
  }

  private cargarCatalogo(): void {
    this.administracionService.listarInvCategorias('ACTIVO').subscribe({
      next: (res) => {
        this.categorias = res.data || [];
        this.categoriaOptions = this.categorias.map((c) => ({
          label: c.nombre,
          value: String(c.id_categoria),
        }));
      },
      error: () => (this.categoriaOptions = []),
    });
    this.administracionService.listarInvMateriales({ estado: 'ACTIVO' }).subscribe({
      next: (res) => (this.materiales = res.data || []),
      error: () => (this.materiales = []),
    });
  }

  /* ===================== Consulta ===================== */

  onBuscarInput(): void {
    this.buscar$.next(this.buscar.trim());
  }

  consultar(): void {
    if (this.fechaDesde && this.fechaHasta && this.fechaDesde > this.fechaHasta) {
      Swal.fire({
        icon: 'warning',
        title: 'Rango de fechas',
        text: 'La fecha "Desde" no puede ser mayor que "Hasta".',
        confirmButtonColor: '#20506A',
      });
      return;
    }
    this.loading = true;
    this.inventarioService
      .listarMovimientos({
        tipo_movimiento: 'INGRESO',
        buscar: this.buscar,
        id_categoria: this.idCategoria,
        prioridad: this.prioridad,
        ubicacion: this.ubicacion,
        fecha_desde: toIsoDate(this.fechaDesde),
        fecha_hasta: toIsoDate(this.fechaHasta),
      })
      .subscribe({
        next: (res) => {
          this.rows = res.data || [];
          this.loading = false;
        },
        error: (err) => {
          this.rows = [];
          this.loading = false;
          Swal.fire('Error', err?.error?.mensaje || 'No se pudo consultar los ingresos.', 'error');
        },
      });
  }

  limpiar(): void {
    this.buscar = '';
    this.buscar$.next('');
    this.idCategoria = null;
    this.prioridad = null;
    this.ubicacion = null;
    this.fechaDesde = null;
    this.fechaHasta = null;
    this.consultar();
  }

  get hayFiltros(): boolean {
    return !!(
      this.buscar.trim() ||
      this.idCategoria ||
      this.prioridad ||
      this.ubicacion ||
      this.fechaDesde ||
      this.fechaHasta
    );
  }

  /* ===================== Presentación ===================== */

  fechaFc(row: MovimientoItemRow): string {
    const v = row.fecha_fc_txt;
    if (!v) return '—';
    const [y, m, d] = v.split('-');
    return `${d}/${m}/${y.slice(2)}`;
  }

  num(v: string | number | null | undefined): number | null {
    return v === null || v === undefined || v === '' ? null : Number(v);
  }

  etiquetaUbicacion(v: string | null): string {
    return this.ubicacionOptions.find((o) => o.value === v)?.label ?? v ?? '—';
  }

  etiquetaPrioridad(v: string | null): string {
    return this.prioridadOptions.find((o) => o.value === v)?.label ?? v ?? '—';
  }

  esAnulado(row: MovimientoItemRow | null): boolean {
    return row?.estado_item === 'ANULADO' || row?.estado_movimiento === 'ANULADO';
  }

  /* ===================== Acciones por fila ===================== */

  abrirMenu(event: Event, menu: { toggle: (e: Event) => void }, row: MovimientoItemRow): void {
    this.menuRow = row;
    const anulado = this.esAnulado(row);
    this.rowMenuItems = [
      {
        label: 'Editar',
        icon: 'pi pi-pencil',
        disabled: anulado,
        command: () => this.menuRow && this.abrirDetalle(this.menuRow, true),
      },
      {
        label: 'Eliminar',
        icon: 'pi pi-trash',
        command: () => this.menuRow && this.eliminar(this.menuRow),
      },
      {
        label: 'Anular',
        icon: 'pi pi-ban',
        disabled: anulado,
        command: () => this.menuRow && this.anular(this.menuRow),
      },
    ];
    menu.toggle(event);
  }

  abrirDetalle(row: MovimientoItemRow, editar: boolean): void {
    if (editar && this.esAnulado(row)) {
      Swal.fire('Ítem anulado', 'No se puede editar un ítem anulado.', 'warning');
      return;
    }
    this.seleccionado = row;
    this.form = movimientoRowToIngresoItem(row);
    this.editMode = editar;
    this.historial = [];
    this.actualizarCodigoOptions();
    this.detalleVisible = true;
    if (!editar) {
      this.inventarioService.historialItem(row.id_detalle).subscribe({
        next: (res) => (this.historial = res.data || []),
        error: () => (this.historial = []),
      });
    }
  }

  cerrarDetalle(): void {
    this.detalleVisible = false;
    this.editMode = false;
    this.seleccionado = null;
    this.form = null;
    this.historial = [];
  }

  pasarAEdicion(): void {
    if (this.seleccionado) this.abrirDetalle(this.seleccionado, true);
  }

  /* ----- Edición (mismos campos y reglas del Nuevo Ingreso) ----- */

  get categoriaSeleccionada(): string | null {
    return this.form?.idCategoria != null ? String(this.form.idCategoria) : null;
  }

  set categoriaSeleccionada(value: string | null) {
    if (this.form) this.form.idCategoria = value ? Number(value) : null;
  }

  private actualizarCodigoOptions(): void {
    const idCat = this.form?.idCategoria ?? null;
    this.codigoOptions = this.materiales
      .filter((m) => idCat == null || m.id_categoria === idCat)
      .map((m) => ({ label: `${m.codigo} - ${m.descripcion}`, value: m.codigo }));
    const actual = this.form?.codigo;
    if (actual && !this.codigoOptions.some((o) => o.value === actual)) {
      this.codigoOptions = [{ label: actual, value: actual }, ...this.codigoOptions];
    }
  }

  onCategoriaChange(): void {
    if (!this.form) return;
    const cat = this.categorias.find((c) => c.id_categoria === this.form!.idCategoria);
    this.form.categoria = cat?.nombre ?? '';
    const material = this.materiales.find((m) => m.codigo === this.form!.codigo);
    if (material && material.id_categoria !== this.form.idCategoria) {
      this.form.codigo = null;
      this.form.descripcion = '';
    }
    this.actualizarCodigoOptions();
  }

  onCodigoChange(): void {
    if (!this.form) return;
    const material = this.materiales.find((m) => m.codigo === this.form!.codigo);
    if (!material) return;
    this.form.idCategoria = material.id_categoria;
    this.form.categoria = material.categoria;
    this.form.descripcion = material.descripcion;
    this.actualizarCodigoOptions();
  }

  private validar(item: IngresoMaterialItem): string | null {
    if (!item.fechaFc) return 'Ingrese la Fecha FC.';
    if (!item.noDoc.trim()) return 'Ingrese el No. Doc.';
    if (!item.codigo) return 'Seleccione el código.';
    if (!item.cantidad || item.cantidad <= 0) return 'La cantidad debe ser mayor a 0.';
    if (!item.um?.trim()) return 'Ingrese la U.M.';
    if (!item.ubicacion) return 'Seleccione la ubicación.';
    return null;
  }

  guardarEdicion(): void {
    if (!this.form || !this.seleccionado || this.guardando) return;
    const error = this.validar(this.form);
    if (error) {
      Swal.fire({ icon: 'warning', title: 'Datos incompletos', text: error, confirmButtonColor: '#20506A' });
      return;
    }
    this.guardando = true;
    this.inventarioService
      .editarItem(this.seleccionado.id_detalle, ingresoItemToPayload(this.form))
      .subscribe({
        next: (res) => {
          this.guardando = false;
          this.cerrarDetalle();
          Swal.fire({ icon: 'success', title: 'Actualizado', text: res.mensaje, confirmButtonColor: '#20506A' });
          this.consultar();
        },
        error: (err) => {
          this.guardando = false;
          Swal.fire('Error', err?.error?.mensaje || 'No se pudo actualizar el ítem.', 'error');
        },
      });
  }

  /* ----- Anular / Eliminar (piden motivo; queda en el historial) ----- */

  private pedirMotivo(opts: {
    titulo: string;
    html: string;
    confirmar: string;
    color: string;
  }): Promise<string | null> {
    return Swal.fire({
      icon: 'warning',
      title: opts.titulo,
      html: opts.html,
      input: 'textarea',
      inputLabel: 'Motivo',
      inputPlaceholder: 'Indique el motivo…',
      inputValidator: (v) => (!v?.trim() ? 'El motivo es obligatorio.' : null),
      showCancelButton: true,
      confirmButtonText: opts.confirmar,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: opts.color,
      cancelButtonColor: '#6c757d',
      reverseButtons: true,
    }).then((r) => (r.isConfirmed ? String(r.value).trim() : null));
  }

  private descripcionFila(row: MovimientoItemRow): string {
    return `<strong>${row.codigo_material}</strong> — ${row.descripcion ?? ''} (${row.consecutivo})`;
  }

  anular(row: MovimientoItemRow): void {
    if (this.esAnulado(row)) {
      Swal.fire('Atención', 'El ítem ya está anulado.', 'info');
      return;
    }
    this.pedirMotivo({
      titulo: 'Anular ítem',
      html: `<p>Se anulará ${this.descripcionFila(row)}.</p><p>Seguirá visible pero no sumará en el inventario.</p>`,
      confirmar: 'Sí, anular',
      color: '#e67e22',
    }).then((motivo) => {
      if (!motivo) return;
      this.inventarioService.anularItem(row.id_detalle, motivo).subscribe({
        next: (res) => {
          Swal.fire({ icon: 'success', title: 'Anulado', text: res.mensaje, confirmButtonColor: '#20506A' });
          this.consultar();
        },
        error: (err) => Swal.fire('Error', err?.error?.mensaje || 'No se pudo anular el ítem.', 'error'),
      });
    });
  }

  eliminar(row: MovimientoItemRow): void {
    this.pedirMotivo({
      titulo: 'Eliminar ítem',
      html: `<p>Se eliminará ${this.descripcionFila(row)}.</p><p>Dejará de verse en la consulta y en el inventario (queda registro en el historial).</p>`,
      confirmar: 'Sí, eliminar',
      color: '#c0392b',
    }).then((motivo) => {
      if (!motivo) return;
      this.inventarioService.eliminarItem(row.id_detalle, motivo).subscribe({
        next: (res) => {
          if (this.seleccionado?.id_detalle === row.id_detalle) this.cerrarDetalle();
          Swal.fire({ icon: 'success', title: 'Eliminado', text: res.mensaje, confirmButtonColor: '#20506A' });
          this.consultar();
        },
        error: (err) => Swal.fire('Error', err?.error?.mensaje || 'No se pudo eliminar el ítem.', 'error'),
      });
    });
  }

  etiquetaAccion(a: MovimientoItemHistorial['accion']): string {
    return { EDITAR: 'Editado', ANULAR: 'Anulado', ELIMINAR: 'Eliminado' }[a] ?? a;
  }

  /* ===================== Navegación ===================== */

  nuevo(): void {
    this.router.navigate([this.config.rutaNuevo]);
  }

  volver(): void {
    this.router.navigate([INVENTARIO_HUB_ROUTE]);
  }
}
