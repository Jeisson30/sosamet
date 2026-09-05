import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import Swal from 'sweetalert2';

import { GestionService } from '../../../shared/service/gestion.service';
import {
  ActividadAdicionalDto,
  Company,
  ContratoOption,
  FinalizarEjecucionCortesResponse,
  ItemCompletadoEjecucion,
  OrdenTrabajoDetalle,
  OrdenTrabajoHeader,
  TrazabilidadOtActa,
  TrazabilidadOtCabecera,
  TrazabilidadOtItem,
} from '../../../shared/interfaces/Response.interface';
import { BASE_URL } from '../../../../../core/url-constants';

export interface EjecucionItemUi extends OrdenTrabajoDetalle {
  checked: boolean;
  owd_estado: number;
}

export interface ActividadAdicionalUi {
  uid: string;
  id_adicional?: number | null;
  tipo_actividad: string | null;
  empresa_id: number | null;
  item: string;
  contrato_no: string;
  /** true = clave es cotización (tipo_vinculo COTIZACION) */
  sin_contrato: boolean;
  proyecto: string;
  descripcion: string;
  cantidad: number | null;
  um: string;
  ancho: number | null;
  alto: number | null;
  acta_medida_no: string;
  orden_no: string;
  plano_no: string;
  observaciones: string;
  checked: boolean;
  /** 1 pendiente · 2 completado */
  adc_estado: number;
}

function adicionalTieneContenido(a: ActividadAdicionalUi): boolean {
  return !!(
    String(a.item || '').trim() ||
    String(a.descripcion || '').trim() ||
    (a.cantidad != null && String(a.cantidad) !== '')
  );
}

@Component({
  selector: 'app-assign-ejecucion-cortes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    DropdownModule,
    CheckboxModule,
    TableModule,
    ButtonModule,
  ],
  templateUrl: './assign-ejecucion-cortes.component.html',
  styleUrls: ['./assign-ejecucion-cortes.component.scss'],
})
export class AssignEjecucionCortesComponent implements OnInit {
  @ViewChild('carouselTrack') carouselTrack?: ElementRef<HTMLDivElement>;

  loading = false;
  saving = false;
  savingAdicionales = false;
  buscar = '';

  private allHeaders: OrdenTrabajoHeader[] = [];
  private allDetalle: OrdenTrabajoDetalle[] = [];

  ordenesVisibles: OrdenTrabajoHeader[] = [];
  selectedOt: OrdenTrabajoHeader | null = null;
  selectedItems: EjecucionItemUi[] = [];
  actividades: ActividadAdicionalUi[] = [];
  itemsCompletados: ItemCompletadoEjecucion[] = [];

  tipoCorteEdit: string | null = null;
  observacionesEdit = '';
  empresaSelectedId: number | null = null;
  companies: Company[] = [];
  companiesActivas: Company[] = [];
  contratos: ContratoOption[] = [];

  /** Modal trazabilidad (solo lectura; no altera flujo de ejecución) */
  trazabilidadVisible = false;
  trazabilidadLoading = false;
  trazabilidadCabecera: TrazabilidadOtCabecera | null = null;
  trazabilidadItems: TrazabilidadOtItem[] = [];
  trazabilidadActas: TrazabilidadOtActa[] = [];

  private itemEstadoOverrides = new Map<number, number>();

  readonly tipoActividadOptions = [
    { label: 'PINTURA', value: 'PINTURA' },
    { label: 'FABRICACIÓN', value: 'FABRICACIÓN' },
    { label: 'INSTALACIÓN', value: 'INSTALACIÓN' },
  ];

  private readonly idUsuario = Number(localStorage.getItem('id_usuario') || 0);
  private readonly idPerfil = Number(localStorage.getItem('id_perfil') || 0);

  get veTodasLasOrdenes(): boolean {
    return this.idPerfil === 1 || this.idPerfil === 2;
  }

  get pendientesCount(): number {
    return this.ordenesVisibles.filter((o) => Number(o.estado) === 1).length;
  }

  get completadasCount(): number {
    const ids = new Set(
      this.itemsCompletados
        .map((r) => r.id_order_work)
        .filter((id): id is number => id != null)
    );
    return ids.size;
  }

  get selectedItemsChecked(): number {
    return this.selectedItems.filter((i) => i.checked).length;
  }

  get itemsOtPendientesCount(): number {
    return this.selectedItems.filter((i) => !i.checked).length;
  }

  get todosItemsChecked(): boolean {
    return (
      this.selectedItems.length > 0 &&
      this.selectedItems.every((i) => i.checked)
    );
  }

  get isSingleCard(): boolean {
    return this.ordenesVisibles.length <= 1;
  }

  get showCarouselNav(): boolean {
    return this.ordenesVisibles.length > 2;
  }

  get tipoCorteEfectivo(): string | null {
    return this.selectedOt?.tipo_actividad || this.tipoCorteEdit || null;
  }

  get empresaNombre(): string | null {
    if (!this.empresaSelectedId) return null;
    const c = this.companies.find((x) => x.id === this.empresaSelectedId);
    return c?.nombre_empresa || null;
  }

  get puedeFinalizar(): boolean {
    return (
      !!this.selectedOt &&
      this.todosItemsChecked &&
      !!this.empresaSelectedId &&
      !!this.tipoCorteEfectivo &&
      !this.saving
    );
  }

  constructor(
    private router: Router,
    private gestionService: GestionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCompanies();
    this.loadContratos();
    this.cargarOrdenes();
    this.cargarCompletados();
    this.cargarAdicionalesUsuario();
  }

  volver(): void {
    this.router.navigate(['/dashboard/gestion/ejecucion-cortes']);
  }

  private loadCompanies(): void {
    this.gestionService.getCompanies().subscribe({
      next: (list) => {
        const all = Array.isArray(list) ? list : [];
        this.companies = all;
        this.companiesActivas = all.filter((c) => Number(c.estado) === 1);
      },
      error: () => {
        this.companies = [];
        this.companiesActivas = [];
      },
    });
  }

  private loadContratos(): void {
    this.gestionService.consultContratos().subscribe({
      next: (res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        this.contratos = rows.map((r: Record<string, unknown>) => {
          const value = String(r['value'] || r['numero_contrato'] || '');
          const label = String(r['label'] || value);
          return {
            ...r,
            numero_contrato: value,
            label,
            value,
          } as ContratoOption;
        });
      },
      error: () => {
        this.contratos = [];
      },
    });
  }

  scrollCarousel(dir: -1 | 1): void {
    const el = this.carouselTrack?.nativeElement;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.95, 280);
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  }

  cargarOrdenes(): void {
    this.loading = true;
    const encargadoFiltro = this.veTodasLasOrdenes
      ? null
      : this.idUsuario || null;

    this.gestionService
      .consultOrdenesTrabajo({
        buscar: this.buscar?.trim() || null,
        encargado_id: encargadoFiltro,
      })
      .subscribe({
        next: (res) => {
          this.allHeaders = Array.isArray(res?.cabecera) ? res.cabecera : [];
          this.allDetalle = Array.isArray(res?.detalle) ? res.detalle : [];
          this.ordenesVisibles = this.allHeaders.filter(
            (h) => Number(h.estado) === 1
          );

          if (this.selectedOt) {
            const still = this.ordenesVisibles.find(
              (h) => h.id_order_work === this.selectedOt!.id_order_work
            );
            if (still) this.seleccionarOt(still);
            else this.limpiarSeleccion();
          }

          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loading = false;
          this.allHeaders = [];
          this.allDetalle = [];
          this.ordenesVisibles = [];
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text:
              err?.error?.Mensaje ||
              err?.error?.message ||
              'No se pudieron cargar las órdenes de trabajo.',
            confirmButtonColor: '#20506A',
          });
        },
      });
  }

  cargarCompletados(): void {
    this.gestionService
      .consultItemsCompletadosEjecucion({
        buscar: this.buscar?.trim() || null,
      })
      .subscribe({
        next: (res) => {
          this.itemsCompletados = Array.isArray(res?.items) ? res.items : [];
          this.cdr.markForCheck();
        },
        error: () => {
          this.itemsCompletados = [];
        },
      });
  }

  cargarAdicionalesUsuario(): void {
    this.gestionService.consultAdicionalesUsuario().subscribe({
      next: (res) => {
        this.applyAdicionalesFromApi(Array.isArray(res?.items) ? res.items : []);
      },
      error: () => {
        this.actividades = [];
        this.cdr.markForCheck();
      },
    });
  }

  onBuscar(): void {
    this.cargarOrdenes();
    this.cargarCompletados();
  }

  estadoBadge(estado: number | null | undefined): string {
    const n = Number(estado);
    if (n === 2) return 'Completada';
    if (n === 3) return 'Anulada';
    return 'Pendiente';
  }

  estadoClass(estado: number | null | undefined): string {
    const n = Number(estado);
    if (n === 2) return 'badge-ok';
    if (n === 3) return 'badge-anulada';
    return 'badge-pendiente';
  }

  itemEstadoLabel(estado: number | null | undefined): string {
    return Number(estado) === 2 ? 'Completado' : 'Pendiente';
  }

  seleccionarOt(ot: OrdenTrabajoHeader): void {
    this.selectedOt = ot;
    this.tipoCorteEdit = ot.tipo_actividad || null;
    this.observacionesEdit = ot.observaciones || '';
    this.empresaSelectedId =
      ot.empresa_asociada_id || this.empresaSelectedId;

    this.selectedItems = this.allDetalle
      .filter((d) => d.id_order_work === ot.id_order_work)
      .map((d) => {
        const override = this.itemEstadoOverrides.get(d.id_order_work_detail);
        const raw = override ?? Number(d.owd_estado);
        const owd_estado = raw === 2 || raw === 3 ? raw : 1;
        return {
          ...d,
          owd_estado,
          checked: owd_estado === 2,
        };
      });
  }

  private applyAdicionalesFromApi(items: ActividadAdicionalDto[]): void {
    this.actividades = (items || [])
      .filter((a) => Number(a.adc_estado) !== 2)
      .map((a) => ({
        uid: `db-${a.id_adicional || Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 6)}`,
        id_adicional: a.id_adicional ?? null,
        tipo_actividad: a.tipo_actividad || null,
        empresa_id: a.empresa_id ?? null,
        item: a.item || '',
        contrato_no: a.contrato_no || '',
        sin_contrato:
          String(a.tipo_vinculo || '').toUpperCase() === 'COTIZACION',
        proyecto: a.proyecto || '',
        descripcion: a.descripcion || '',
        cantidad: a.cantidad ?? null,
        um: a.um || '',
        ancho: a.ancho ?? null,
        alto: a.alto ?? null,
        acta_medida_no: a.acta_medida_no || '',
        orden_no: a.orden_no || '',
        plano_no: a.plano_no || '',
        observaciones: a.observaciones || '',
        adc_estado: Number(a.adc_estado) === 2 ? 2 : 1,
        checked: Number(a.adc_estado) === 2,
      }));
    this.cdr.detectChanges();
  }

  private buildAdicionalesPayload() {
    return this.actividades.map((a) => ({
      id_adicional: a.id_adicional,
      tipo_actividad: a.tipo_actividad,
      empresa_id: a.empresa_id,
      item: a.item,
      contrato_no: a.contrato_no,
      tipo_vinculo: (a.sin_contrato ? 'COTIZACION' : 'CONTRATO') as
        | 'CONTRATO'
        | 'COTIZACION',
      proyecto: a.proyecto,
      descripcion: a.descripcion,
      cantidad: a.cantidad,
      um: a.um,
      ancho: a.ancho,
      alto: a.alto,
      acta_medida_no: a.acta_medida_no,
      orden_no: a.orden_no,
      plano_no: a.plano_no,
      observaciones: a.observaciones,
      checked: a.checked,
      adc_estado: a.adc_estado,
    }));
  }

  onCheckAdicional(a: ActividadAdicionalUi): void {
    a.adc_estado = a.checked ? 2 : 1;
    this.cdr.detectChanges();
  }

  onCheckItem(item: EjecucionItemUi): void {
    item.owd_estado = item.checked ? 2 : 1;
    this.itemEstadoOverrides.set(item.id_order_work_detail, item.owd_estado);
    this.cdr.detectChanges();
  }

  onGuardarAdicionales(): void {
    const filas = this.actividades.filter((a) => adicionalTieneContenido(a));
    if (!filas.length) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin datos',
        text: 'Agrega al menos una actividad adicional con contenido.',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    const incompleta = filas.find(
      (a) =>
        !a.tipo_actividad ||
        !a.empresa_id ||
        !String(a.contrato_no || '').trim()
    );
    if (incompleta) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos obligatorios',
        text: 'Cada adicional requiere Tipo de actividad, Empresa y Contrato (o N° Cotización si marca Sin contrato).',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    this.savingAdicionales = true;
    this.gestionService
      .guardarAdicionalesOt({
        actividades_adicionales: this.buildAdicionalesPayload(),
      })
      .subscribe({
        next: (res) => {
          this.savingAdicionales = false;
          if (Number(res?.Codigo) !== 1) {
            Swal.fire({
              icon: 'error',
              title: 'No se pudo guardar',
              text: res?.Mensaje || 'Error desconocido.',
              confirmButtonColor: '#20506A',
            });
            return;
          }

          this.applyAdicionalesFromApi(
            Array.isArray(res?.items) ? res.items : []
          );
          this.cargarCompletados();

          Swal.fire({
            icon: 'success',
            title: 'Guardado',
            text: res.Mensaje || 'Actividades adicionales guardadas.',
            confirmButtonColor: '#20506A',
          });
        },
        error: (err) => {
          this.savingAdicionales = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text:
              err?.error?.Mensaje ||
              err?.error?.mensaje ||
              'No se pudieron guardar las actividades adicionales.',
            confirmButtonColor: '#20506A',
          });
        },
      });
  }

  limpiarSeleccion(): void {
    this.selectedOt = null;
    this.selectedItems = [];
    this.tipoCorteEdit = null;
    this.observacionesEdit = '';
  }

  private nuevaActividadVacia(): ActividadAdicionalUi {
    return {
      uid: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      id_adicional: null,
      tipo_actividad: null,
      empresa_id: null,
      item: '',
      contrato_no: '',
      sin_contrato: false,
      proyecto: '',
      descripcion: '',
      cantidad: null,
      um: '',
      ancho: null,
      alto: null,
      acta_medida_no: '',
      orden_no: '',
      plano_no: '',
      observaciones: '',
      checked: false,
      adc_estado: 1,
    };
  }

  agregarActividad(): void {
    this.actividades = [...this.actividades, this.nuevaActividadVacia()];
  }

  eliminarActividad(uid: string): void {
    this.actividades = this.actividades.filter((a) => a.uid !== uid);
  }

  formatFecha(value: string | null | undefined): string {
    if (!value) return '—';
    const raw = String(value).trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
    const d = new Date(raw);
    return Number.isNaN(d.getTime())
      ? raw
      : d.toLocaleDateString('es-CO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
  }

  abrirTrazabilidad(event: Event, ot: OrdenTrabajoHeader): void {
    event.stopPropagation();
    const id = Number(ot?.id_order_work);
    if (!id) return;

    this.trazabilidadVisible = true;
    this.trazabilidadLoading = true;
    this.trazabilidadCabecera = null;
    this.trazabilidadItems = [];
    this.trazabilidadActas = [];

    this.gestionService.consultTrazabilidadOt(id).subscribe({
      next: (res) => {
        this.trazabilidadLoading = false;
        if (Number(res?.Codigo) !== 1 || !res?.cabecera) {
          Swal.fire({
            icon: 'error',
            title: 'Trazabilidad',
            text: res?.Mensaje || 'No se pudo cargar la trazabilidad.',
            confirmButtonColor: '#20506A',
          });
          this.cerrarTrazabilidad();
          return;
        }
        this.trazabilidadCabecera = res.cabecera;
        this.trazabilidadItems = Array.isArray(res.items) ? res.items : [];
        this.trazabilidadActas = Array.isArray(res.actas) ? res.actas : [];
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.trazabilidadLoading = false;
        this.cerrarTrazabilidad();
        Swal.fire({
          icon: 'error',
          title: 'Trazabilidad',
          text:
            err?.error?.Mensaje ||
            err?.error?.mensaje ||
            'No se pudo cargar la trazabilidad de la OT.',
          confirmButtonColor: '#20506A',
        });
      },
    });
  }

  cerrarTrazabilidad(): void {
    this.trazabilidadVisible = false;
    this.trazabilidadLoading = false;
    this.trazabilidadCabecera = null;
    this.trazabilidadItems = [];
    this.trazabilidadActas = [];
  }

  esItemCompletado(estado: number | string | null | undefined): boolean {
    return Number(estado) === 2;
  }

  urlArchivo(path: string | null | undefined): string | null {
    if (!path) return null;
    const clean = String(path).trim();
    if (!clean) return null;
    if (/^https?:\/\//i.test(clean)) return clean;
    const base = String(BASE_URL || '').replace(/\/api\/?$/i, '');
    const rel = clean.replace(/^\/+/, '');
    return `${base}/${rel}`;
  }

  onEditarCompletado(row: ItemCompletadoEjecucion): void {
    if (row?.origen === 'OT' && row.id_order_work) {
      this.abrirTrazabilidad(
        new Event('click'),
        { id_order_work: row.id_order_work } as OrdenTrabajoHeader
      );
      return;
    }
    const origen = row.origen === 'ADICIONAL' ? 'Adicional' : 'OT';
    Swal.fire({
      icon: 'info',
      title: `${origen} finalizado`,
      text: `${row.orden_trabajo || ''} — ${row.item || ''}. La edición de cierres se habilitará en una siguiente fase.`,
      confirmButtonColor: '#20506A',
    });
  }

  onGenerarPdf(): void {
    console.log('[Ejecución Cortes] GENERAR PDF:', this.itemsCompletados);
    Swal.fire({
      icon: 'info',
      title: 'Generar PDF',
      text: 'Datos de completados en consola. Exportación PDF pendiente.',
      confirmButtonColor: '#20506A',
    });
  }

  onFinalizar(): void {
    if (!this.selectedOt) {
      Swal.fire({
        icon: 'warning',
        title: 'Selecciona una OT',
        text: 'Debes seleccionar una orden de trabajo.',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    if (!this.todosItemsChecked) {
      Swal.fire({
        icon: 'warning',
        title: 'Ítems incompletos',
        text: 'Debe marcar todos los ítems de la OT (check) antes de finalizar.',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    if (!this.empresaSelectedId) {
      Swal.fire({
        icon: 'warning',
        title: 'Empresa asociada',
        text: 'Debe seleccionar la empresa asociada para finalizar.',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    if (!this.tipoCorteEfectivo) {
      Swal.fire({
        icon: 'warning',
        title: 'Tipo de corte',
        text: 'La OT no tiene tipo de corte (FABRICACIÓN / INSTALACIÓN / PINTURA).',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    const payload = {
      id_order_work: this.selectedOt.id_order_work,
      empresa_asociada_id: this.empresaSelectedId,
      encargado_id: this.selectedOt.encargado_id || this.idUsuario,
      tipo_corte: this.tipoCorteEfectivo,
      observaciones:
        this.selectedOt.observaciones || this.observacionesEdit || null,
      items: this.selectedItems.map((i) => ({
        id_order_work_detail: i.id_order_work_detail,
        checked: i.checked,
        owd_estado: i.owd_estado,
      })),
    };

    this.saving = true;
    this.gestionService.finalizarEjecucionCortes(payload).subscribe({
      next: (res: FinalizarEjecucionCortesResponse) => {
        this.saving = false;
        if (Number(res?.Codigo) !== 1) {
          Swal.fire({
            icon: 'error',
            title: 'No se pudo finalizar',
            text: res?.Mensaje || 'Error desconocido.',
            confirmButtonColor: '#20506A',
          });
          return;
        }

        Swal.fire({
          icon: 'success',
          title: 'Ejecución finalizada',
          text: `${res.Mensaje} Consecutivo: ${res.consecutivo || '—'}`,
          confirmButtonColor: '#20506A',
        });

        this.itemEstadoOverrides.clear();
        this.limpiarSeleccion();
        this.cargarOrdenes();
        this.cargarCompletados();
      },
      error: (err) => {
        this.saving = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text:
            err?.error?.Mensaje ||
            err?.error?.mensaje ||
            err?.message ||
            'No se pudo finalizar la ejecución.',
          confirmButtonColor: '#20506A',
        });
      },
    });
  }
}
