import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
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

import { CatalogService } from '../../../../shared/services/catalog.service';
import {
  TIPO_CONTRATO_DOCUMENTO_OPTIONS,
  labelTipoContratoDocumento,
} from '../../shared/constants/tipo-contrato.constants';
import { OtroSiService } from '../../shared/service/otro-si.service';
import {
  OtroSiContextoResponse,
  OtroSiContrato,
  OtroSiFilaExistente,
  OtroSiFilaNueva,
  OtroSiItemPayload,
  OtroSiPayload,
  TABLA_ITEM_OPTIONS,
  TIPO_OTROSI_OPTIONS,
  TablaItemContrato,
  TipoOtroSi,
  diasEntre,
  fromIsoDate,
  sumarDias,
  toIsoDate,
  valorAdicionalExistente,
  valorTotalNuevo,
} from '../../shared/otro-si.model';
import { puedeVerValoresContrato } from '../../../../core/auth/permissions';

const COLOR_SWAL = '#20506A';
const HUB_CONTRATOS = '/dashboard/contracts';
const CONSULTA_OTROSI = '/dashboard/contracts/otro-si';

interface Opcion {
  label: string;
  value: string;
}

/** Línea de la previsualización (ítem existente con cantidad adicional o ítem nuevo). */
interface LineaPreview {
  item: string | null;
  detalle: string | null;
  um: string | null;
  cantidadOriginal: number;
  cantidadAdicional: number;
  cantidadNueva: number;
  observaciones: string;
  esNuevo: boolean;
}

const nuevaFilaBorrador = (tabla: TablaItemContrato = 'AIU'): OtroSiFilaNueva => ({
  tabla_origen: tabla,
  item: '',
  insumo: null,
  ref: '',
  detalle: '',
  um: '',
  cantidadAdicional: null,
  valor_unitario: null,
  observaciones: '',
});

const distintos = (valores: (string | null | undefined)[]): Opcion[] =>
  [...new Set(valores.map((v) => String(v || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es'))
    .map((v) => ({ label: v, value: v }));

const mismoTexto = (a: string | null | undefined, b: string | null | undefined) =>
  String(a || '').trim().toUpperCase() === String(b || '').trim().toUpperCase();

@Component({
  selector: 'app-otro-si-nuevo',
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
  templateUrl: './otro-si-nuevo.component.html',
  styleUrls: ['./otro-si-nuevo.component.scss'],
})
export class OtroSiNuevoComponent implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);

  readonly tipoOptions = TIPO_OTROSI_OPTIONS;
  readonly tipoDocOptions = TIPO_CONTRATO_DOCUMENTO_OPTIONS;
  readonly labelTipoDoc = labelTipoContratoDocumento;

  /** Contratos activos (fuente de las listas del buscador). */
  contratos: OtroSiContrato[] = [];
  loadingContratos = false;

  filtroConstructora: string | null = null;
  filtroProyecto: string | null = null;
  filtroTipoDoc: string | null = null;
  filtroNumerodoc: string | null = null;
  resultados: OtroSiContrato[] = [];
  buscado = false;
  buscando = false;

  contratoSel: OtroSiContrato | null = null;
  contexto: OtroSiContextoResponse | null = null;
  loadingContexto = false;

  fechaDocumento: Date | null = new Date();
  noDocumento = '';
  tipo: TipoOtroSi | null = null;

  nuevaFechaFin: Date | null = null;
  diasAmpliacion: number | null = null;
  /** Referencias estables para p-calendar (evitar recrear Date en cada CD). */
  minFechaNueva: Date | null = null;
  calendarioDefaultDate: Date = new Date();
  /**
   * Remonta el p-calendar de ampliación tras SweetAlert/errores:
   * si no, el overlay a veces no vuelve a abrirse la 2.ª vez.
   */
  fechaCalendarKey = 0;
  fechaCalendarVisible = true;

  filas: OtroSiFilaExistente[] = [];
  nuevas: OtroSiFilaNueva[] = [];
  borrador: OtroSiFilaNueva = nuevaFilaBorrador();
  insumoOptions: Opcion[] = [];
  private insumoNombre = new Map<string, string>();

  observacionesGenerales = '';
  guardando = false;

  /** Edición (ruta otro-si/editar/:id): el contrato se carga como estaba antes de este Otro Sí. */
  idEditar: number | null = null;

  constructor(
    private otroSiService: OtroSiService,
    private catalogService: CatalogService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.cargarInsumos();
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isInteger(id) && id > 0) {
      this.idEditar = id;
      this.iniciarEdicion(id);
    } else {
      this.cargarContratos();
    }
  }

  get esEdicion(): boolean {
    return this.idEditar !== null;
  }

  private iniciarEdicion(id: number): void {
    this.loadingContexto = true;
    this.otroSiService.detalle(id).subscribe({
      next: (d) => this.cargarContexto(d.otrosi.numerodoc),
      error: (err) => {
        this.loadingContexto = false;
        this.alertaError('No se pudo cargar el Otro Sí.', err);
        this.router.navigate([CONSULTA_OTROSI]);
      },
    });
  }

  // ===================== 1. Buscar contrato =====================

  private cargarContratos(): void {
    this.loadingContratos = true;
    this.otroSiService.listarContratos().subscribe({
      next: (rows) => {
        this.contratos = rows;
        this.loadingContratos = false;
      },
      error: (err) => {
        this.loadingContratos = false;
        this.alertaError('No se pudieron cargar los contratos.', err);
      },
    });
  }

  private cargarInsumos(): void {
    this.catalogService.getInsumosActivos().subscribe({
      next: (r) => {
        this.insumoOptions = (r.insumos || []).map((i) => {
          this.insumoNombre.set(i.codigo, i.nombre);
          return { label: `${i.codigo} - ${i.nombre}`, value: i.codigo };
        });
      },
      error: () => (this.insumoOptions = []),
    });
  }

  private contratosFiltrados(hasta: 'constructora' | 'proyecto' | 'tipo'): OtroSiContrato[] {
    return this.contratos.filter(
      (c) =>
        (!this.filtroConstructora || mismoTexto(c.constructora, this.filtroConstructora)) &&
        (hasta === 'constructora' || !this.filtroProyecto || mismoTexto(c.proyecto, this.filtroProyecto)) &&
        (hasta !== 'tipo' || !this.filtroTipoDoc || mismoTexto(c.tipo_doc_catalogo, this.filtroTipoDoc))
    );
  }

  get constructoraOptions(): Opcion[] {
    return distintos(this.contratos.map((c) => c.constructora));
  }

  get proyectoOptions(): Opcion[] {
    return distintos(this.contratosFiltrados('constructora').map((c) => c.proyecto));
  }

  get numerodocOptions(): Opcion[] {
    return this.contratosFiltrados('tipo')
      .map((c) => ({
        label: c.tipo_doc_catalogo ? `${labelTipoContratoDocumento(c.tipo_doc_catalogo)} – ${c.numerodoc}` : c.numerodoc,
        value: c.numerodoc,
      }))
      .sort((a, b) => a.value.localeCompare(b.value, 'es'));
  }

  onConstructoraChange(): void {
    this.filtroProyecto = null;
    this.filtroNumerodoc = null;
  }

  onProyectoChange(): void {
    this.filtroNumerodoc = null;
  }

  onTipoDocChange(): void {
    if (this.filtroNumerodoc && !this.numerodocOptions.some((o) => o.value === this.filtroNumerodoc)) {
      this.filtroNumerodoc = null;
    }
  }

  buscar(): void {
    this.buscando = true;
    this.otroSiService
      .listarContratos({
        constructora: this.filtroConstructora,
        proyecto: this.filtroProyecto,
        tipo_doc: this.filtroTipoDoc,
        numerodoc: this.filtroNumerodoc,
      })
      .subscribe({
        next: (rows) => {
          this.resultados = rows;
          this.buscado = true;
          this.buscando = false;
          if (rows.length === 1 && !this.contratoSel) this.seleccionar(rows[0]);
        },
        error: (err) => {
          this.buscando = false;
          this.alertaError('No se pudo realizar la búsqueda.', err);
        },
      });
  }

  async seleccionar(c: OtroSiContrato): Promise<void> {
    if (this.esEdicion || this.contratoSel?.numerodoc === c.numerodoc) return;
    if (this.contratoSel && this.hayCambios) {
      const r = await Swal.fire({
        icon: 'question',
        title: 'Cambiar de contrato',
        text: 'Se perderán los datos digitados del Otro Sí. ¿Desea continuar?',
        showCancelButton: true,
        confirmButtonText: 'Sí, cambiar',
        cancelButtonText: 'No',
        confirmButtonColor: COLOR_SWAL,
      });
      if (!r.isConfirmed) return;
    }

    this.contratoSel = c;
    this.cargarContexto(c.numerodoc);
  }

  private cargarContexto(numerodoc: string): void {
    this.contexto = null;
    this.limpiarOtroSi();
    this.loadingContexto = true;
    this.otroSiService.contextoContrato(numerodoc, this.idEditar).subscribe({
      next: (ctx) => {
        this.contexto = ctx;
        this.contratoSel = ctx.contrato;
        this.filas = ctx.items.map((i) => ({ ...i, cantidadAdicional: null, observaciones: '' }));
        this.borrador = nuevaFilaBorrador(this.tablaNuevoOptions[0]?.value ?? 'AIU');
        if (this.esEdicion) {
          this.resultados = [ctx.contrato];
          this.buscado = true;
          this.precargarEdicion(ctx);
        }
        this.actualizarLimitesCalendario();
        this.loadingContexto = false;
      },
      error: (err) => {
        this.loadingContexto = false;
        this.contratoSel = null;
        this.alertaError('No se pudo cargar el contrato.', err);
        if (this.esEdicion) this.router.navigate([CONSULTA_OTROSI]);
      },
    });
  }

  private precargarEdicion(ctx: OtroSiContextoResponse): void {
    const e = ctx.editando;
    if (!e) return;
    this.noDocumento = e.no_documento;
    this.fechaDocumento = fromIsoDate(e.fecha_documento);
    this.tipo = e.tipo;
    this.nuevaFechaFin = fromIsoDate(e.fecha_fin_nueva);
    this.onNuevaFechaChange();
    this.observacionesGenerales = e.observaciones || '';

    for (const it of e.items) {
      if (it.es_nuevo) {
        this.nuevas.push({
          tabla_origen: it.tabla_origen,
          item: it.item || '',
          insumo: it.insumo || null,
          ref: it.ref || '',
          detalle: it.detalle || '',
          um: it.um || '',
          cantidadAdicional: it.cantidad_adicional,
          valor_unitario: it.valor_unitario ?? null,
          observaciones: it.observaciones || '',
        });
        continue;
      }
      const fila = this.filas.find((f) => f.tabla_origen === it.tabla_origen && f.id_item_origen === it.id_item_origen);
      if (fila) {
        fila.cantidadAdicional = it.cantidad_adicional;
        fila.observaciones = it.observaciones || '';
      }
    }
  }

  esSeleccionado(c: OtroSiContrato): boolean {
    return this.contratoSel?.numerodoc === c.numerodoc;
  }

  // ===================== 3. Tipo / 4. Fecha =====================

  get aplicaFecha(): boolean {
    return this.tipo === 'FECHA' || this.tipo === 'AMBOS';
  }

  get aplicaCantidades(): boolean {
    return this.tipo === 'CANTIDAD' || this.tipo === 'AMBOS';
  }

  seleccionarTipo(t: TipoOtroSi): void {
    this.tipo = t;
    if (t === 'FECHA' || t === 'AMBOS') {
      this.actualizarLimitesCalendario();
    }
  }

  get fechaFinActual(): Date | null {
    return fromIsoDate(this.contratoSel?.fecha_fin);
  }

  /** Actualiza minDate y mes visible del popup (misma instancia hasta el próximo cambio). */
  private actualizarLimitesCalendario(): void {
    const actual = this.fechaFinActual;
    this.minFechaNueva = actual ? sumarDias(actual, 1) : null;
    this.calendarioDefaultDate =
      this.nuevaFechaFin || this.minFechaNueva || new Date();
  }

  /**
   * Limpia overlays residuales (Swal / datepicker) y remonta el calendario
   * de ampliación para que vuelva a abrirse tras un error.
   */
  private restaurarCalendarioAmpliacion(): void {
    document.body.classList.remove(
      'swal2-shown',
      'swal2-height-auto',
      'p-overflow-hidden',
      'p-datepicker-mask'
    );
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.querySelectorAll('.p-datepicker-mask, .p-component-overlay-enter').forEach((el) => {
      try {
        el.parentElement?.removeChild(el);
      } catch {
        /* ignore */
      }
    });

    this.actualizarLimitesCalendario();
    this.fechaCalendarVisible = false;
    this.fechaCalendarKey += 1;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.fechaCalendarVisible = true;
      this.cdr.markForCheck();
    }, 0);
  }

  /** Texto visible de días (readonly); se actualiza al usar el calendario. */
  get diasAmpliacionLabel(): string {
    const dias = this.diasAmpliacion;
    if (dias == null || !Number.isFinite(Number(dias))) return '';
    const n = Number(dias);
    return `${n} día${n === 1 ? '' : 's'}`;
  }

  /** Los días se derivan al elegir/cambiar la nueva fecha en el calendario. */
  onNuevaFechaChange(): void {
    const actual = this.fechaFinActual;
    const nueva = this.nuevaFechaFin;
    if (actual && nueva instanceof Date && !isNaN(nueva.getTime())) {
      this.diasAmpliacion = diasEntre(actual, nueva);
      this.calendarioDefaultDate = nueva;
      return;
    }
    this.diasAmpliacion = null;
  }

  // ===================== 5. Cantidades =====================

  nuevaCantidad(fila: OtroSiFilaExistente): number {
    return (Number(fila.cantidad) || 0) + (Number(fila.cantidadAdicional) || 0);
  }

  /** Solo se ofrecen las tablas que el contrato ya tiene (de ahí salen los porcentajes del ítem nuevo). */
  get tablaNuevoOptions(): { label: string; value: TablaItemContrato }[] {
    const p = this.contexto?.porcentajes;
    return TABLA_ITEM_OPTIONS.filter((o) => (o.value === 'AIU' ? !!p?.AIU : !!p?.IVA));
  }

  onInsumoBorradorChange(): void {
    const nombre = this.borrador.insumo ? this.insumoNombre.get(this.borrador.insumo) : null;
    if (nombre && !this.borrador.detalle.trim()) this.borrador.detalle = nombre;
  }

  private codigoExiste(item: string): boolean {
    const code = item.trim().toUpperCase();
    return (
      this.filas.some((f) => String(f.item || '').trim().toUpperCase() === code) ||
      this.nuevas.some((n) => n.item.trim().toUpperCase() === code)
    );
  }

  agregarNuevo(): void {
    if (!this.puedeVerValores) {
      this.alerta(
        'warning',
        'Sin permiso de valores',
        'Solo Administrador y Supervisor de Proyectos pueden agregar ítems nuevos con valor unitario. Use cantidades adicionales sobre ítems existentes.'
      );
      return;
    }
    const b = this.borrador;
    const faltan: string[] = [];
    if (!b.item.trim()) faltan.push('Item');
    if (!b.detalle.trim()) faltan.push('Detalle');
    if (!b.um.trim()) faltan.push('UM');
    if (!(Number(b.cantidadAdicional) > 0)) faltan.push('Cantidad mayor a 0');
    if (b.valor_unitario == null || Number(b.valor_unitario) < 0) faltan.push('Valor unitario');
    if (faltan.length) {
      this.alerta('warning', 'Ítem nuevo incompleto', `Complete: ${faltan.join(', ')}.`);
      return;
    }
    if (this.codigoExiste(b.item)) {
      this.alerta(
        'warning',
        'Item repetido',
        `El código de item "${b.item.trim()}" ya existe en el contrato. Aumente la cantidad del ítem existente.`
      );
      return;
    }
    this.nuevas = [...this.nuevas, { ...b, item: b.item.trim(), detalle: b.detalle.trim(), um: b.um.trim() }];
    this.borrador = nuevaFilaBorrador(b.tabla_origen);
  }

  quitarNuevo(index: number): void {
    this.nuevas = this.nuevas.filter((_, i) => i !== index);
  }

  valorNuevo(fila: OtroSiFilaNueva): number {
    return valorTotalNuevo(fila, this.contexto?.porcentajes ?? null);
  }

  // ===================== 6. Previsualización =====================

  get filasConAdicional(): OtroSiFilaExistente[] {
    return this.filas.filter((f) => Number(f.cantidadAdicional) > 0);
  }

  get lineasPreview(): LineaPreview[] {
    if (!this.aplicaCantidades) return [];
    return [
      ...this.filasConAdicional.map((f) => ({
        item: f.item,
        detalle: f.detalle,
        um: f.um,
        cantidadOriginal: Number(f.cantidad) || 0,
        cantidadAdicional: Number(f.cantidadAdicional) || 0,
        cantidadNueva: this.nuevaCantidad(f),
        observaciones: f.observaciones,
        esNuevo: false,
      })),
      ...this.nuevas.map((n) => ({
        item: n.item,
        detalle: n.detalle,
        um: n.um,
        cantidadOriginal: 0,
        cantidadAdicional: Number(n.cantidadAdicional) || 0,
        cantidadNueva: Number(n.cantidadAdicional) || 0,
        observaciones: n.observaciones,
        esNuevo: true,
      })),
    ];
  }

  get valorAdicionalEstimado(): number {
    if (!this.aplicaCantidades) return 0;
    const existentes = this.filasConAdicional.reduce((s, f) => s + valorAdicionalExistente(f), 0);
    const nuevos = this.nuevas.reduce((s, n) => s + this.valorNuevo(n), 0);
    return Math.round((existentes + nuevos) * 100) / 100;
  }

  get valorContratoActual(): number | null {
    const raw = String(this.contratoSel?.valor_contrato ?? '').trim();
    return /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : null;
  }

  /** Montos: solo Admin y Supervisor de Proyectos. */
  get puedeVerValores(): boolean {
    return puedeVerValoresContrato();
  }

  // ===================== Guardar =====================

  private get hayCambios(): boolean {
    if (this.esEdicion) return !!this.contexto;
    return (
      !!this.noDocumento.trim() ||
      !!this.tipo ||
      !!this.nuevaFechaFin ||
      this.filas.some((f) => Number(f.cantidadAdicional) > 0 || !!f.observaciones.trim()) ||
      this.nuevas.length > 0 ||
      !!this.observacionesGenerales.trim()
    );
  }

  private validar(): string | null {
    if (!this.contratoSel || !this.contexto) return 'Busque y seleccione el contrato.';
    if (!this.fechaDocumento) return 'Seleccione la fecha del documento.';
    if (!this.noDocumento.trim()) return 'Digite el No. Documento del Otro Sí.';
    if (!this.tipo) return 'Seleccione el tipo de Otro Sí.';
    if (this.aplicaFecha) {
      if (!this.nuevaFechaFin) return 'Seleccione la nueva fecha de finalización.';
      const actual = this.fechaFinActual;
      if (actual && diasEntre(actual, this.nuevaFechaFin) <= 0) {
        return 'La nueva fecha de finalización debe ser posterior a la fecha de finalización actual.';
      }
    }
    if (this.aplicaCantidades) {
      if (!this.filasConAdicional.length && !this.nuevas.length) {
        return 'Digite la cantidad adicional de al menos un ítem o agregue un ítem nuevo.';
      }
      if (this.borrador.item.trim() || this.borrador.detalle.trim()) {
        return 'Tiene un ítem nuevo sin agregar: presione + o limpie la fila.';
      }
    }
    return null;
  }

  private construirPayload(): OtroSiPayload {
    const items: OtroSiItemPayload[] = !this.aplicaCantidades
      ? []
      : [
          ...this.filasConAdicional.map((f) => ({
            tabla_origen: f.tabla_origen,
            id_item_origen: f.id_item_origen,
            cantidad_adicional: Number(f.cantidadAdicional),
            observaciones: f.observaciones.trim() || null,
          })),
          ...this.nuevas.map((n) => ({
            tabla_origen: n.tabla_origen,
            cantidad_adicional: Number(n.cantidadAdicional),
            item: n.item,
            insumo: n.insumo,
            ref: n.ref.trim() || null,
            detalle: n.detalle,
            um: n.um,
            valor_unitario: Number(n.valor_unitario),
            observaciones: n.observaciones.trim() || null,
          })),
        ];

    return {
      numerodoc: this.contratoSel!.numerodoc,
      cabecera: {
        no_documento: this.noDocumento.trim(),
        fecha_documento: toIsoDate(this.fechaDocumento),
        tipo: this.tipo!,
        fecha_fin_nueva: this.aplicaFecha ? toIsoDate(this.nuevaFechaFin) : null,
        observaciones: this.observacionesGenerales.trim() || null,
      },
      items,
    };
  }

  async guardar(): Promise<void> {
    const error = this.validar();
    if (error) {
      await this.alerta('warning', 'Revise el Otro Sí', error);
      return;
    }

    const partes: string[] = [];
    if (this.aplicaFecha && this.nuevaFechaFin) {
      partes.push(`nueva fecha fin ${this.nuevaFechaFin.toLocaleDateString('es-CO')}`);
    }
    if (this.aplicaCantidades) partes.push(`${this.lineasPreview.length} ítem(s)`);
    const confirmacion = await Swal.fire({
      icon: 'question',
      title: this.esEdicion ? 'Actualizar Otro Sí' : 'Guardar Otro Sí',
      text: this.esEdicion
        ? `Se reversarán los cambios actuales del Otro Sí N° ${this.contexto!.editando?.consecutivo} y se aplicará al contrato ${this.contratoSel!.numerodoc}: ${partes.join(' y ')}. ¿Desea continuar?`
        : `Se aplicará al contrato ${this.contratoSel!.numerodoc}: ${partes.join(' y ')}. ¿Desea continuar?`,
      showCancelButton: true,
      confirmButtonText: this.esEdicion ? 'Sí, actualizar' : 'Sí, guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: COLOR_SWAL,
    });
    if (!confirmacion.isConfirmed) return;

    await this.enviarGuardado(false);
  }

  private async enviarGuardado(confirmarNumeroDuplicado: boolean): Promise<void> {
    this.guardando = true;
    const payload: OtroSiPayload = {
      ...this.construirPayload(),
      ...(confirmarNumeroDuplicado ? { confirmar_numero_duplicado: true } : {}),
    };
    const peticion = this.idEditar
      ? this.otroSiService.editar(this.idEditar, payload)
      : this.otroSiService.registrar(payload);
    peticion.subscribe({
      next: async (r) => {
        this.guardando = false;
        await Swal.fire({
          icon: 'success',
          title: this.esEdicion ? 'Otro Sí actualizado' : 'Otro Sí guardado',
          text: r.mensaje,
          confirmButtonColor: COLOR_SWAL,
        });
        if (this.esEdicion) {
          this.router.navigate([CONSULTA_OTROSI]);
        } else {
          this.reiniciar();
        }
      },
      error: async (err) => {
        this.guardando = false;
        const r = err?.error;
        const requiereConfirmacion =
          !confirmarNumeroDuplicado &&
          (r?.requiere_confirmacion === true ||
            r?.codigo_app === 'NUMERO_DUPLICADO_CONFIRMAR' ||
            (err?.status === 409 && Number(r?.codigo) === 2));

        if (requiereConfirmacion) {
          const conf = await Swal.fire({
            icon: 'question',
            title: 'No. Documento ya existe',
            text:
              r?.mensaje ||
              'Este No. Documento ya existe. ¿Desea crear otro con el mismo número?',
            showCancelButton: true,
            confirmButtonText: 'Sí, crear con el mismo número',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: COLOR_SWAL,
            cancelButtonColor: '#6c757d',
          });
          if (conf.isConfirmed) {
            await this.enviarGuardado(true);
          } else if (this.aplicaFecha) {
            this.restaurarCalendarioAmpliacion();
          }
          return;
        }

        if (r?.codigo === 2) {
          await this.alerta('warning', 'No. Documento repetido', r.mensaje);
        } else if (r?.codigo === 0) {
          await this.alerta('warning', 'Revise el Otro Sí', r.mensaje);
        } else {
          await this.alertaError('No se pudo guardar el Otro Sí.', err);
        }
      },
    });
  }

  private limpiarOtroSi(): void {
    this.noDocumento = '';
    this.fechaDocumento = new Date();
    this.tipo = null;
    this.nuevaFechaFin = null;
    this.diasAmpliacion = null;
    this.minFechaNueva = null;
    this.calendarioDefaultDate = new Date();
    this.filas = [];
    this.nuevas = [];
    this.borrador = nuevaFilaBorrador();
    this.observacionesGenerales = '';
  }

  private reiniciar(): void {
    this.limpiarOtroSi();
    this.contratoSel = null;
    this.contexto = null;
    this.resultados = [];
    this.buscado = false;
    this.cargarContratos();
  }

  async cancelar(): Promise<void> {
    if (this.hayCambios) {
      const r = await Swal.fire({
        icon: 'question',
        title: 'Cancelar Otro Sí',
        text: 'Se perderán los datos digitados. ¿Desea salir?',
        showCancelButton: true,
        confirmButtonText: 'Sí, salir',
        cancelButtonText: 'No',
        confirmButtonColor: COLOR_SWAL,
      });
      if (!r.isConfirmed) return;
    }
    this.router.navigate([this.esEdicion ? CONSULTA_OTROSI : HUB_CONTRATOS]);
  }

  volver(): void {
    this.cancelar();
  }

  private async alerta(
    icon: 'warning' | 'error' | 'info',
    title: string,
    text: string
  ): Promise<void> {
    await Swal.fire({ icon, title, text, confirmButtonColor: COLOR_SWAL });
    // Tras el modal, rearmar el calendario de ampliación (bug: 2.ª apertura).
    if (this.aplicaFecha) {
      this.restaurarCalendarioAmpliacion();
    }
  }

  private async alertaError(texto: string, err: unknown): Promise<void> {
    const msg = (err as { error?: { mensaje?: string } })?.error?.mensaje;
    await this.alerta('error', 'Error', msg || texto);
  }
}
