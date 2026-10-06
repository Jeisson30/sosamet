import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TableModule } from 'primeng/table';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

import { AdministracionService } from '../../../administracion/shared/service/administracion.service';
import {
  InvCategoriaAdmin,
  InvMaterialAdmin,
} from '../../../administracion/shared/interfaces/administracion.interface';
import { INVENTARIO_HUB_ROUTE, SelectOption } from '../../shared/inventario.models';
import {
  InventarioService,
  OrigenMovimientoInventario,
} from '../../shared/service/inventario.service';
import {
  INGRESO_PLANO_COLUMNS,
  IngresoMaterialItem,
  PRIORIDAD_STOCK_OPTIONS,
  UBICACION_OPTIONS,
  ingresoItemToPayload,
  nuevoIngresoItem,
} from '../../shared/ingreso-material.model';

@Component({
  selector: 'app-inventario-ingreso-nuevo',
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
  templateUrl: './ingreso-nuevo.component.html',
  styleUrls: ['./ingreso-nuevo.component.scss'],
})
export class IngresoNuevoComponent implements OnInit {
  @ViewChild('archivoPlano') archivoPlano?: ElementRef<HTMLInputElement>;

  form: IngresoMaterialItem = nuevoIngresoItem();
  items: IngresoMaterialItem[] = [];
  editIndex: number | null = null;

  categorias: InvCategoriaAdmin[] = [];
  materiales: InvMaterialAdmin[] = [];
  categoriaOptions: SelectOption[] = [];
  codigoOptions: SelectOption[] = [];
  loadingCatalogo = false;
  guardando = false;

  /** Para registrar el origen del movimiento (MANUAL / PLANO / MIXTO). */
  private huboManual = false;
  private archivoPlanoNombre: string | null = null;

  readonly ubicacionOptions = UBICACION_OPTIONS;
  readonly prioridadOptions = PRIORIDAD_STOCK_OPTIONS;

  constructor(
    private administracionService: AdministracionService,
    private inventarioService: InventarioService,
    private router: Router
  ) {}

  get totalIngreso(): number {
    return this.items.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
  }

  ngOnInit(): void {
    this.cargarCatalogo();
  }

  private cargarCatalogo(): void {
    this.loadingCatalogo = true;
    this.administracionService.listarInvCategorias('ACTIVO').subscribe({
      next: (res) => {
        this.categorias = res.data || [];
        this.categoriaOptions = this.categorias.map((c) => ({
          label: c.nombre,
          value: String(c.id_categoria),
        }));
      },
      error: () => {
        this.categorias = [];
        this.categoriaOptions = [];
      },
    });
    this.administracionService.listarInvMateriales({ estado: 'ACTIVO' }).subscribe({
      next: (res) => {
        this.materiales = res.data || [];
        this.actualizarCodigoOptions();
        this.loadingCatalogo = false;
      },
      error: () => {
        this.materiales = [];
        this.codigoOptions = [];
        this.loadingCatalogo = false;
        Swal.fire('Error', 'No se pudo cargar el catálogo de inventario.', 'error');
      },
    });
  }

  /** El dropdown trabaja con id en texto; el ítem guarda el id numérico. */
  get categoriaSeleccionada(): string | null {
    return this.form.idCategoria != null ? String(this.form.idCategoria) : null;
  }

  set categoriaSeleccionada(value: string | null) {
    this.form.idCategoria = value ? Number(value) : null;
  }

  private actualizarCodigoOptions(): void {
    const idCat = this.form.idCategoria;
    this.codigoOptions = this.materiales
      .filter((m) => idCat == null || m.id_categoria === idCat)
      .map((m) => ({ label: `${m.codigo} - ${m.descripcion}`, value: m.codigo }));
  }

  onCategoriaChange(): void {
    const cat = this.categorias.find((c) => c.id_categoria === this.form.idCategoria);
    this.form.categoria = cat?.nombre ?? '';
    const material = this.materiales.find((m) => m.codigo === this.form.codigo);
    if (material && material.id_categoria !== this.form.idCategoria) {
      this.form.codigo = null;
      this.form.descripcion = '';
    }
    this.actualizarCodigoOptions();
  }

  onCodigoChange(): void {
    const material = this.materiales.find((m) => m.codigo === this.form.codigo);
    if (!material) return;
    this.form.idCategoria = material.id_categoria;
    this.form.categoria = material.categoria;
    this.form.descripcion = material.descripcion;
    this.actualizarCodigoOptions();
  }

  private validarItem(item: IngresoMaterialItem): string | null {
    if (!item.fechaFc) return 'Ingrese la Fecha FC.';
    if (!item.noDoc.trim()) return 'Ingrese el No. Doc.';
    if (!item.codigo) return 'Seleccione el código.';
    if (!item.cantidad || item.cantidad <= 0) return 'La cantidad debe ser mayor a 0.';
    if (!item.um?.trim()) return 'Ingrese la U.M.';
    if (!item.ubicacion) return 'Seleccione la ubicación.';
    return null;
  }

  agregarItem(): void {
    const error = this.validarItem(this.form);
    if (error) {
      Swal.fire({ icon: 'warning', title: 'Datos incompletos', text: error, confirmButtonColor: '#20506A' });
      return;
    }

    const item = { ...this.form, um: this.form.um!.trim().toUpperCase() };
    if (this.editIndex != null) {
      this.items = this.items.map((it, i) => (i === this.editIndex ? item : it));
    } else {
      this.items = [...this.items, item];
      this.huboManual = true;
    }
    this.limpiarItem(item);
  }

  /** Conserva los datos del documento (fecha, doc, proveedor, ciudad, ubicación) para el siguiente ítem. */
  private limpiarItem(base: IngresoMaterialItem): void {
    this.form = {
      ...nuevoIngresoItem(),
      fechaFc: base.fechaFc,
      noDoc: base.noDoc,
      ubicacion: base.ubicacion,
      proveedor: base.proveedor,
      ciudad: base.ciudad,
    };
    this.editIndex = null;
    this.actualizarCodigoOptions();
  }

  editarItem(index: number): void {
    this.form = { ...this.items[index] };
    this.editIndex = index;
    this.actualizarCodigoOptions();
  }

  cancelarEdicion(): void {
    this.limpiarItem(this.form);
  }

  eliminarItem(index: number): void {
    this.items = this.items.filter((_, i) => i !== index);
    if (this.editIndex === index) this.cancelarEdicion();
  }

  /* ===================== Archivo plano ===================== */

  descargarPlantilla(): void {
    const ws = XLSX.utils.aoa_to_sheet([INGRESO_PLANO_COLUMNS.map((c) => c.header)]);
    ws['!cols'] = INGRESO_PLANO_COLUMNS.map((c) => ({ wch: Math.max(c.header.length + 2, 12) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'INGRESO MATERIAL');
    XLSX.writeFile(wb, 'plantilla-ingreso-material.xlsx');
  }

  abrirArchivo(): void {
    this.archivoPlano?.nativeElement.click();
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const wb = XLSX.read(reader.result, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
        this.importarFilas(raw, file.name);
      } catch {
        Swal.fire('Error', 'No se pudo leer el archivo. Verifique que sea la plantilla de ingreso.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  private importarFilas(raw: Record<string, unknown>[], nombreArchivo: string): void {
    const norm = (s: string) =>
      s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const importados: IngresoMaterialItem[] = [];
    const errores: string[] = [];

    raw.forEach((fila, idx) => {
      const porColumna = new Map(Object.entries(fila).map(([k, v]) => [norm(k), v]));
      const valor = (header: string) => porColumna.get(norm(header));
      const item = nuevoIngresoItem();

      for (const col of INGRESO_PLANO_COLUMNS) {
        const v = valor(col.header);
        if (v === undefined || v === '') continue;
        (item as unknown as Record<string, unknown>)[col.field] = this.convertirCelda(col.field, v);
      }

      const vacia = INGRESO_PLANO_COLUMNS.every((c) => {
        const v = valor(c.header);
        return v === undefined || String(v).trim() === '';
      });
      if (vacia) return;

      const codigoPlano = String(item.codigo ?? '').trim().replace(/\.0+$/, '');
      const material = this.materiales.find((m) => m.codigo === codigoPlano);
      if (material) {
        item.codigo = material.codigo;
        item.idCategoria = material.id_categoria;
        item.categoria = material.categoria;
        if (!item.descripcion) item.descripcion = material.descripcion;
      }
      if (item.um) item.um = item.um.toUpperCase();
      item.ubicacion = this.matchOption(this.ubicacionOptions, item.ubicacion);
      item.prioridad = this.matchOption(this.prioridadOptions, item.prioridad);

      const error = material
        ? this.validarItem(item)
        : `código "${codigoPlano}" no existe o está inactivo en el catálogo de inventario`;
      if (error) {
        errores.push(`Fila ${idx + 2}: ${error}`);
        return;
      }
      importados.push(item);
    });

    this.items = [...this.items, ...importados];
    if (importados.length) {
      this.archivoPlanoNombre = this.archivoPlanoNombre
        ? `${this.archivoPlanoNombre}; ${nombreArchivo}`
        : nombreArchivo;
    }

    Swal.fire({
      icon: errores.length ? 'warning' : 'success',
      title: `${importados.length} ítem(s) cargados`,
      html: errores.length
        ? `<div style="text-align:left;max-height:200px;overflow:auto">${errores.slice(0, 20).join('<br>')}</div>`
        : 'Revise el detalle antes de guardar.',
      confirmButtonColor: '#20506A',
    });
  }

  private convertirCelda(field: keyof IngresoMaterialItem, v: unknown): unknown {
    const numericos: (keyof IngresoMaterialItem)[] = [
      'cantidad', 'longitud', 'ancho', 'alto', 'valor', 'iva', 'total', 'valorUm',
    ];
    if (field === 'fechaFc' || field === 'fechaMantenimiento') return this.toDate(v);
    if (numericos.includes(field)) {
      const n = Number(String(v).replace(/[^\d.,-]/g, '').replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    }
    return String(v).trim();
  }

  private toDate(v: unknown): Date | null {
    if (v instanceof Date && !isNaN(v.getTime())) return v;
    const m = String(v).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    const d = new Date(String(v));
    return isNaN(d.getTime()) ? null : d;
  }

  private matchOption(options: SelectOption[], raw: string | null): string | null {
    const key = String(raw ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();
    if (!key) return null;
    return options.find((o) => o.value === key || o.label.toUpperCase() === key)?.value ?? null;
  }

  /* ===================== Guardar ===================== */

  guardar(): void {
    if (this.guardando) return;
    if (!this.items.length) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin materiales',
        text: 'Agregue al menos un ítem con el botón + o adjunte el Excel.',
        confirmButtonColor: '#20506A',
      });
      return;
    }
    if (this.editIndex !== null) {
      Swal.fire({
        icon: 'warning',
        title: 'Edición pendiente',
        text: 'Actualice o cancele el ítem en edición antes de guardar.',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    Swal.fire({
      icon: 'question',
      title: '¿Guardar ingreso?',
      text: `Se registrarán ${this.items.length} material(es) en el inventario.`,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#20506A',
    }).then((r) => {
      if (r.isConfirmed) this.enviarIngreso();
    });
  }

  private enviarIngreso(): void {
    this.guardando = true;
    this.inventarioService
      .registrarMovimiento({
        tipo_movimiento: 'INGRESO',
        origen: this.origenMovimiento(),
        archivo_plano: this.archivoPlanoNombre,
        items: this.items.map((it) => ingresoItemToPayload(it)),
      })
      .subscribe({
        next: (res) => {
          this.guardando = false;
          this.items = [];
          this.huboManual = false;
          this.archivoPlanoNombre = null;
          this.form = nuevoIngresoItem();
          this.actualizarCodigoOptions();
          Swal.fire({
            icon: 'success',
            title: `Ingreso ${res.data.consecutivo}`,
            text: res.mensaje,
            confirmButtonColor: '#20506A',
          });
        },
        error: (err) => {
          this.guardando = false;
          Swal.fire({
            icon: 'error',
            title: 'No se guardó el ingreso',
            text: err?.error?.mensaje || 'Ocurrió un error al guardar. Los materiales siguen en el detalle.',
            confirmButtonColor: '#20506A',
          });
        },
      });
  }

  private origenMovimiento(): OrigenMovimientoInventario {
    if (this.archivoPlanoNombre && this.huboManual) return 'MIXTO';
    return this.archivoPlanoNombre ? 'PLANO' : 'MANUAL';
  }


  volver(): void {
    this.router.navigate([INVENTARIO_HUB_ROUTE]);
  }
}
