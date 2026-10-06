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
import html2pdf from 'html2pdf.js';

import { BASE_URL } from '../../../../core/url-constants';
import { AdministracionService } from '../../../administracion/shared/service/administracion.service';
import { GestionService } from '../../../gestion/shared/service/gestion.service';
import { CatalogService, ConstructoraDto, ProyectoDto } from '../../../../shared/services/catalog.service';
import {
  TIPO_CONTRATO_DOCUMENTO_OPTIONS,
  labelTipoContratoDocumento,
} from '../../../contracts/shared/constants/tipo-contrato.constants';
import { INVENTARIO_HUB_ROUTE, SelectOption } from '../../shared/inventario.models';
import { MOVIMIENTO_CONFIG } from '../../shared/inventario-tipos';
import { fromIsoDate, toIsoDate } from '../../shared/ingreso-material.model';
import {
  EMPRESA_IMPRESION,
  EmpresaImpresion,
  EntregaCabecera,
  TIPO_ENTREGA_OPTIONS,
  VALOR_OTRO,
  etiquetaParametro,
  nuevaEntregaCabecera,
  parametrosToOptions,
} from '../../shared/entrega-material.model';
import {
  DevolucionConsulta,
  EntregaConsultaDetalle,
  EntregaConsultaRow,
  EstadoEntregaConsulta,
  InventarioService,
  MovimientoAdjunto,
  MovimientoEncabezado,
} from '../../shared/service/inventario.service';
import {
  FormatoElemento,
  FormatoMovimientoComponent,
} from '../../shared/components/formato-movimiento/formato-movimiento.component';

/** Elemento editable de la entrega (cantidad y código no se editan: afectan el stock). */
interface ItemEdicion {
  idDetalle: number;
  codigo: string;
  descripcion: string;
  cantidad: number;
  um: string;
  ancho: number | null;
  alto: number | null;
  estado: string;
  observaciones: string;
}

interface FormatoDatos {
  titulo: string;
  nombreArchivo: string;
  empresa: EmpresaImpresion | null;
  consecutivo: string;
  fecha: Date | null;
  personaLabel: string;
  persona: string;
  concepto: string;
  area: string;
  proyecto: string;
  tipoDoc: string;
  numeroDoc: string;
  elementos: FormatoElemento[];
  observaciones: string;
  autoriza: string;
  transporte: string;
}

const COLOR_SWAL = '#20506A';
const FILES_BASE = BASE_URL.replace(/\/api\/?$/, '');
/** Las alertas deben quedar sobre los p-dialog abiertos. */
const SwalTop = Swal.mixin({ customClass: { container: 'ent-swal-top' } });

export const ESTADO_ENTREGA_LABEL: Record<EstadoEntregaConsulta, string> = {
  PRESTAMO: 'En préstamo',
  VENCIDA: 'Devolución vencida',
  PARCIAL: 'Devuelto parcialmente',
  DEVUELTO: 'Devuelto',
  DANADO: 'Dañado',
  EXTRAVIADO: 'Extraviado',
  NO_REQUIERE: 'No requiere devolución',
  ANULADO: 'Anulado',
};

@Component({
  selector: 'app-inventario-entrega-consulta',
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
    FormatoMovimientoComponent,
  ],
  templateUrl: './entrega-consulta.component.html',
  styleUrls: ['../ingreso-consulta/ingreso-consulta.component.scss', './entrega-consulta.component.scss'],
})
export class EntregaConsultaComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly buscar$ = new Subject<string>();

  readonly config = MOVIMIENTO_CONFIG.DESPACHO;
  readonly rowsPerPageOptions = [10, 25, 50, 100];
  readonly estadoOptions = (Object.keys(ESTADO_ENTREGA_LABEL) as EstadoEntregaConsulta[]).map((value) => ({
    label: ESTADO_ENTREGA_LABEL[value],
    value,
  }));
  readonly tipoDocOptions = TIPO_CONTRATO_DOCUMENTO_OPTIONS;
  readonly tipoEntregaOptions = TIPO_ENTREGA_OPTIONS;

  /* Filtros */
  buscar = '';
  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;
  idConstructora: string | null = null;
  idProyecto: string | null = null;
  concepto: string | null = null;
  estado: EstadoEntregaConsulta | null = null;

  constructoraOptions: SelectOption[] = [];
  proyectoFiltroOptions: SelectOption[] = [];
  conceptoOptions: SelectOption[] = [];
  areaOptions: SelectOption[] = [];
  usuarioOptions: { label: string; value: number }[] = [];

  rows: EntregaConsultaRow[] = [];
  loading = false;

  menuRow: EntregaConsultaRow | null = null;
  rowMenuItems: MenuItem[] = [];

  /* Visualizar */
  detalleVisible = false;
  cargandoDetalle = false;
  detalle: EntregaConsultaDetalle | null = null;
  filaDetalle: number | null = null;

  /* Editar */
  edicionVisible = false;
  guardando = false;
  cab: EntregaCabecera = nuevaEntregaCabecera();
  itemsEdicion: ItemEdicion[] = [];
  edicionProyectoOptions: SelectOption[] = [];
  edicionDocumentoOptions: SelectOption[] = [];
  loadingDocumentos = false;
  private idEntregaEdicion: number | null = null;
  private fechaPrimeraDevolucion: string | null = null;

  /* Formato PDF */
  formatoVisible = false;
  formato: FormatoDatos | null = null;
  generandoPdf = false;

  constructor(
    private inventarioService: InventarioService,
    private administracionService: AdministracionService,
    private gestionService: GestionService,
    private catalogService: CatalogService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.buscar$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.consultar());
    this.cargarCatalogos();
    this.consultar();
  }

  private cargarCatalogos(): void {
    this.catalogService
      .getConstructoras()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list: ConstructoraDto[]) =>
          (this.constructoraOptions = list.map((c) => ({ label: c.nombre, value: String(c.id) }))),
        error: () => (this.constructoraOptions = []),
      });
    this.inventarioService
      .listarParametros(['CONCEPTO_ENTREGA', 'AREA'])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const rows = res.data || [];
          this.conceptoOptions = parametrosToOptions(rows.filter((r) => r.grupo === 'CONCEPTO_ENTREGA').map((r) => r.valor));
          this.areaOptions = parametrosToOptions(rows.filter((r) => r.grupo === 'AREA').map((r) => r.valor));
        },
        error: () => {
          this.conceptoOptions = [];
          this.areaOptions = [];
        },
      });
    this.gestionService
      .getAllUsers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const list = Array.isArray(res?.data) ? res.data : [];
          this.usuarioOptions = list
            .filter((u) => String(u.estado || '').toUpperCase() === 'ACTIVO')
            .map((u) => ({ label: `${u.nombre} ${u.apellido} - ${u.perfil}`, value: u.id_usuario }));
        },
        error: () => (this.usuarioOptions = []),
      });
  }

  /* ===================== Consulta ===================== */

  onBuscarInput(): void {
    this.buscar$.next(this.buscar.trim());
  }

  onConstructoraFiltroChange(): void {
    this.idProyecto = null;
    this.proyectoFiltroOptions = [];
    const id = this.idConstructora;
    if (id) {
      this.catalogService.getProyectosByConstructora(id).subscribe({
        next: (list: ProyectoDto[]) =>
          (this.proyectoFiltroOptions = list.map((p) => ({ label: p.nombre, value: String(p.id) }))),
        error: () => (this.proyectoFiltroOptions = []),
      });
    }
    this.consultar();
  }

  consultar(): void {
    if (this.fechaDesde && this.fechaHasta && toIsoDate(this.fechaDesde)! > toIsoDate(this.fechaHasta)!) {
      Swal.fire({
        icon: 'warning',
        title: 'Rango de fechas',
        text: 'La fecha "Desde" no puede ser mayor que "Hasta".',
        confirmButtonColor: COLOR_SWAL,
      });
      return;
    }
    this.loading = true;
    this.inventarioService
      .listarEntregas({
        buscar: this.buscar,
        fecha_desde: toIsoDate(this.fechaDesde),
        fecha_hasta: toIsoDate(this.fechaHasta),
        id_constructora: this.idConstructora,
        id_proyecto: this.idProyecto,
        concepto: this.concepto,
        estado: this.estado,
      })
      .subscribe({
        next: (res) => {
          this.rows = res.data || [];
          this.loading = false;
        },
        error: (err) => {
          this.rows = [];
          this.loading = false;
          Swal.fire('Error', err?.error?.mensaje || 'No se pudo consultar las entregas.', 'error');
        },
      });
  }

  limpiar(): void {
    this.buscar = '';
    this.buscar$.next('');
    this.fechaDesde = null;
    this.fechaHasta = null;
    this.idConstructora = null;
    this.idProyecto = null;
    this.proyectoFiltroOptions = [];
    this.concepto = null;
    this.estado = null;
    this.consultar();
  }

  get hayFiltros(): boolean {
    return !!(
      this.buscar.trim() ||
      this.fechaDesde ||
      this.fechaHasta ||
      this.idConstructora ||
      this.idProyecto ||
      this.concepto ||
      this.estado
    );
  }

  /* ===================== Presentación ===================== */

  fechaTexto(iso: string | null | undefined): string {
    const d = fromIsoDate(iso);
    return d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` : '—';
  }

  num(v: string | number | null | undefined): number | null {
    return v === null || v === undefined || v === '' ? null : Number(v);
  }

  conceptoDe(m: { concepto: string | null; concepto_detalle: string | null }): string {
    if (!m.concepto) return '—';
    return m.concepto === VALOR_OTRO && m.concepto_detalle ? m.concepto_detalle : etiquetaParametro(m.concepto);
  }

  areaDe(m: { area: string | null; area_detalle: string | null }): string {
    if (!m.area) return '—';
    return m.area === VALOR_OTRO && m.area_detalle ? m.area_detalle : etiquetaParametro(m.area);
  }

  contratoDe(m: { tipo_doc_ref: string | null; numerodoc_ref: string | null }): string {
    if (!m.numerodoc_ref) return '—';
    const tipo = m.tipo_doc_ref ? labelTipoContratoDocumento(m.tipo_doc_ref) : '';
    return tipo ? `${tipo} ${m.numerodoc_ref}` : m.numerodoc_ref;
  }

  etiquetaEstado(e: EstadoEntregaConsulta): string {
    return ESTADO_ENTREGA_LABEL[e] ?? e;
  }

  claseEstado(e: EstadoEntregaConsulta): string {
    return `ec-estado-${String(e).toLowerCase()}`;
  }

  esAnulado(row: EntregaConsultaRow | null): boolean {
    return row?.estado_item === 'ANULADO' || row?.estado_movimiento === 'ANULADO';
  }

  urlAdjunto(a: MovimientoAdjunto): string {
    return `${FILES_BASE}${a.ruta.startsWith('/') ? '' : '/'}${a.ruta}`;
  }

  get entregaAnulada(): boolean {
    return this.detalle?.entrega.estado === 'ANULADO';
  }

  get devolucionesActivas(): DevolucionConsulta[] {
    return (this.detalle?.devoluciones || []).filter((d) => d.estado === 'ACTIVO');
  }

  etiquetaParametroDev(valor: string): string {
    return etiquetaParametro(valor);
  }

  /* ===================== Acciones por fila ===================== */

  abrirMenu(event: Event, menu: { toggle: (e: Event) => void }, row: EntregaConsultaRow): void {
    this.menuRow = row;
    const anulado = this.esAnulado(row);
    this.rowMenuItems = [
      {
        label: 'Editar',
        icon: 'pi pi-pencil',
        disabled: row.estado_movimiento === 'ANULADO',
        command: () => this.menuRow && this.abrirEdicion(this.menuRow.id_movimiento),
      },
      {
        label: 'Eliminar',
        icon: 'pi pi-trash',
        command: () => this.menuRow && this.eliminarItem(this.menuRow),
      },
      {
        label: 'Anular',
        icon: 'pi pi-ban',
        disabled: anulado,
        command: () => this.menuRow && this.anularItem(this.menuRow),
      },
    ];
    menu.toggle(event);
  }

  private pedirMotivo(opts: { titulo: string; html: string; confirmar: string; color: string }): Promise<string | null> {
    return SwalTop.fire({
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

  private descripcionFila(row: EntregaConsultaRow): string {
    return `<strong>${row.codigo_material}</strong> — ${row.descripcion ?? ''} (${row.consecutivo})`;
  }

  private exito(titulo: string, texto: string): void {
    SwalTop.fire({ icon: 'success', title: titulo, text: texto, confirmButtonColor: COLOR_SWAL });
  }

  private fallo(err: { error?: { mensaje?: string } }, texto: string): void {
    SwalTop.fire('Error', err?.error?.mensaje || texto, 'error');
  }

  /** Después de anular / eliminar / editar: refresca la tabla y, si está abierto, el detalle. */
  private refrescar(): void {
    this.consultar();
    if (this.detalleVisible && this.detalle) this.cargarDetalle(this.detalle.entrega.id_movimiento);
  }

  anularItem(row: EntregaConsultaRow): void {
    if (this.esAnulado(row)) {
      SwalTop.fire('Atención', 'El elemento ya está anulado.', 'info');
      return;
    }
    this.pedirMotivo({
      titulo: 'Anular elemento',
      html: `<p>Se anulará ${this.descripcionFila(row)}.</p><p>Seguirá visible y la cantidad vuelve al inventario.</p>`,
      confirmar: 'Sí, anular',
      color: '#e67e22',
    }).then((motivo) => {
      if (!motivo) return;
      this.inventarioService.anularItem(row.id_detalle, motivo).subscribe({
        next: (res) => {
          this.exito('Anulado', res.mensaje);
          this.refrescar();
        },
        error: (err) => this.fallo(err, 'No se pudo anular el elemento.'),
      });
    });
  }

  eliminarItem(row: EntregaConsultaRow): void {
    this.pedirMotivo({
      titulo: 'Eliminar elemento',
      html: `<p>Se eliminará ${this.descripcionFila(row)}.</p><p>Dejará de verse en la consulta y la cantidad vuelve al inventario (queda registro en el historial).</p>`,
      confirmar: 'Sí, eliminar',
      color: '#c0392b',
    }).then((motivo) => {
      if (!motivo) return;
      this.inventarioService.eliminarItem(row.id_detalle, motivo).subscribe({
        next: (res) => {
          this.exito('Eliminado', res.mensaje);
          this.refrescar();
        },
        error: (err) => this.fallo(err, 'No se pudo eliminar el elemento.'),
      });
    });
  }

  /* ===================== Visualizar ===================== */

  abrirDetalle(row: EntregaConsultaRow): void {
    this.filaDetalle = row.id_detalle;
    this.detalle = null;
    this.detalleVisible = true;
    this.cargarDetalle(row.id_movimiento);
  }

  private cargarDetalle(idMovimiento: number, alCargar?: (d: EntregaConsultaDetalle) => void): void {
    this.cargandoDetalle = true;
    this.inventarioService.detalleEntrega(idMovimiento).subscribe({
      next: (res) => {
        this.cargandoDetalle = false;
        if (this.detalleVisible) this.detalle = res.data;
        alCargar?.(res.data);
      },
      error: (err) => {
        this.cargandoDetalle = false;
        this.detalleVisible = false;
        this.fallo(err, 'No se pudo consultar la entrega.');
      },
    });
  }

  cerrarDetalle(): void {
    this.detalleVisible = false;
    this.detalle = null;
    this.filaDetalle = null;
  }

  anularEntrega(): void {
    const e = this.detalle?.entrega;
    if (!e || e.estado === 'ANULADO') return;
    if (this.devolucionesActivas.length) {
      SwalTop.fire({
        icon: 'warning',
        title: 'Tiene devoluciones',
        text: `Anule primero las devoluciones ${this.devolucionesActivas.map((d) => d.consecutivo).join(', ')}.`,
        confirmButtonColor: COLOR_SWAL,
      });
      return;
    }
    this.pedirMotivo({
      titulo: `Anular entrega ${e.consecutivo}`,
      html: '<p>Se anularán todos sus elementos y las cantidades vuelven al inventario.</p>',
      confirmar: 'Sí, anular',
      color: '#e67e22',
    }).then((motivo) => {
      if (!motivo) return;
      this.inventarioService.anularMovimiento(e.id_movimiento, motivo).subscribe({
        next: (res) => {
          this.exito('Entrega anulada', res.mensaje);
          this.refrescar();
        },
        error: (err) => this.fallo(err, 'No se pudo anular la entrega.'),
      });
    });
  }

  anularDevolucion(dev: DevolucionConsulta): void {
    if (dev.estado !== 'ACTIVO') return;
    this.pedirMotivo({
      titulo: `Anular devolución ${dev.consecutivo}`,
      html: '<p>Las cantidades devueltas vuelven a quedar pendientes en la entrega.</p>',
      confirmar: 'Sí, anular',
      color: '#e67e22',
    }).then((motivo) => {
      if (!motivo) return;
      this.inventarioService.anularMovimiento(dev.id_movimiento, motivo).subscribe({
        next: (res) => {
          this.exito('Devolución anulada', res.mensaje);
          this.refrescar();
        },
        error: (err) => this.fallo(err, 'No se pudo anular la devolución.'),
      });
    });
  }

  /* ===================== Editar entrega ===================== */

  abrirEdicion(idMovimiento: number): void {
    if (this.detalle?.entrega.id_movimiento === idMovimiento) {
      this.prepararEdicion(this.detalle);
      return;
    }
    this.inventarioService.detalleEntrega(idMovimiento).subscribe({
      next: (res) => this.prepararEdicion(res.data),
      error: (err) => this.fallo(err, 'No se pudo consultar la entrega.'),
    });
  }

  editarDesdeDetalle(): void {
    if (this.detalle) this.prepararEdicion(this.detalle);
  }

  private prepararEdicion(d: EntregaConsultaDetalle): void {
    const e = d.entrega;
    if (e.estado !== 'ACTIVO') {
      SwalTop.fire('Entrega anulada', 'No se puede editar una entrega anulada.', 'warning');
      return;
    }
    this.idEntregaEdicion = e.id_movimiento;
    this.fechaPrimeraDevolucion =
      d.devoluciones
        .filter((x) => x.estado === 'ACTIVO')
        .map((x) => x.fecha)
        .sort()[0] ?? null;

    this.asegurarOpcion(this.conceptoOptions, e.concepto);
    this.asegurarOpcion(this.areaOptions, e.area);
    if (e.id_usuario_entregado && !this.usuarioOptions.some((u) => u.value === e.id_usuario_entregado)) {
      this.usuarioOptions = [{ label: e.entregado_a ?? `Usuario ${e.id_usuario_entregado}`, value: e.id_usuario_entregado }, ...this.usuarioOptions];
    }

    this.cab = {
      consecutivo: e.consecutivo,
      fecha: fromIsoDate(e.fecha),
      concepto: e.concepto,
      conceptoDetalle: e.concepto_detalle ?? '',
      area: e.area,
      areaDetalle: e.area_detalle ?? '',
      idUsuarioEntregado: e.id_usuario_entregado,
      idConstructora: e.id_constructora ? String(e.id_constructora) : null,
      idProyecto: e.id_proyecto ? String(e.id_proyecto) : null,
      tipoDoc: e.tipo_doc_ref,
      numeroDoc: e.numerodoc_ref,
      ubicacionEntrega: e.ubicacion_entrega ?? '',
      tipoEntrega: e.tipo_entrega,
      fechaDevolucion: fromIsoDate(e.fecha_prevista),
      autoriza: e.autoriza ?? '',
      transporte: e.transporte ?? '',
      observaciones: e.observaciones ?? '',
    };
    this.itemsEdicion = d.items
      .filter((it) => it.estado_item === 'ACTIVO')
      .map((it) => ({
        idDetalle: it.id_detalle,
        codigo: it.codigo_material,
        descripcion: it.descripcion ?? '',
        cantidad: Number(it.cantidad),
        um: it.um,
        ancho: this.num(it.ancho),
        alto: this.num(it.alto),
        estado: it.estado_material ?? '',
        observaciones: it.observaciones ?? '',
      }));

    this.edicionProyectoOptions = [];
    this.edicionDocumentoOptions = [];
    if (this.cab.idConstructora) this.cargarProyectosEdicion(this.cab.idConstructora, e.id_proyecto, e.proyecto);
    if (this.cab.idProyecto && this.cab.tipoDoc) this.cargarDocumentosEdicion(this.cab.numeroDoc);
    this.edicionVisible = true;
  }

  private asegurarOpcion(options: SelectOption[], valor: string | null): void {
    if (valor && !options.some((o) => o.value === valor)) options.unshift({ label: etiquetaParametro(valor), value: valor });
  }

  private cargarProyectosEdicion(idConstructora: string, idActual?: number | null, nombreActual?: string | null): void {
    this.catalogService.getProyectosByConstructora(idConstructora).subscribe({
      next: (list: ProyectoDto[]) => {
        this.edicionProyectoOptions = list.map((p) => ({ label: p.nombre, value: String(p.id) }));
        if (idActual && !this.edicionProyectoOptions.some((o) => o.value === String(idActual))) {
          this.edicionProyectoOptions.unshift({ label: nombreActual ?? `Proyecto ${idActual}`, value: String(idActual) });
        }
      },
      error: () => (this.edicionProyectoOptions = []),
    });
  }

  private cargarDocumentosEdicion(numeroActual?: string | null): void {
    const idProyecto = Number(this.cab.idProyecto);
    const tipo = String(this.cab.tipoDoc || '').trim();
    if (!Number.isFinite(idProyecto) || idProyecto <= 0 || !tipo) return;
    this.loadingDocumentos = true;
    this.administracionService
      .listarDocumentosNumero({ id_proyecto: idProyecto, tipo_doc: tipo, estado: 'ACTIVO' })
      .subscribe({
        next: (res) => {
          const list = Array.isArray(res?.data) ? res.data : [];
          this.edicionDocumentoOptions = list.map((doc) => {
            const numero = String(doc.numero_documento || '').trim();
            return { label: numero, value: numero };
          });
          if (numeroActual && !this.edicionDocumentoOptions.some((o) => o.value === numeroActual)) {
            this.edicionDocumentoOptions.unshift({ label: numeroActual, value: numeroActual });
          }
          this.loadingDocumentos = false;
        },
        error: () => {
          this.edicionDocumentoOptions = [];
          this.loadingDocumentos = false;
        },
      });
  }

  onConstructoraEdicionChange(): void {
    this.cab.idProyecto = null;
    this.cab.tipoDoc = null;
    this.cab.numeroDoc = null;
    this.edicionProyectoOptions = [];
    this.edicionDocumentoOptions = [];
    if (this.cab.idConstructora) this.cargarProyectosEdicion(this.cab.idConstructora);
  }

  onProyectoEdicionChange(): void {
    this.cab.tipoDoc = null;
    this.cab.numeroDoc = null;
    this.edicionDocumentoOptions = [];
  }

  onTipoDocEdicionChange(): void {
    this.cab.numeroDoc = null;
    this.edicionDocumentoOptions = [];
    this.cargarDocumentosEdicion();
  }

  get conceptoEsOtro(): boolean {
    return this.cab.concepto === VALOR_OTRO;
  }

  get areaEsOtro(): boolean {
    return this.cab.area === VALOR_OTRO;
  }

  get requiereDevolucion(): boolean {
    return this.cab.tipoEntrega === 'REQUIERE_DEVOLUCION';
  }

  onConceptoChange(): void {
    if (!this.conceptoEsOtro) this.cab.conceptoDetalle = '';
  }

  onAreaChange(): void {
    if (!this.areaEsOtro) this.cab.areaDetalle = '';
  }

  onTipoEntregaChange(): void {
    if (!this.requiereDevolucion) this.cab.fechaDevolucion = null;
  }

  esFilaResaltada(idDetalle: number): boolean {
    return this.menuRow?.id_detalle === idDetalle || this.filaDetalle === idDetalle;
  }

  private validarEdicion(): string | null {
    const c = this.cab;
    if (!c.fecha) return 'Seleccione la fecha de entrega.';
    if (this.fechaPrimeraDevolucion && toIsoDate(c.fecha)! > this.fechaPrimeraDevolucion) {
      return `La fecha no puede ser posterior a la primera devolución (${this.fechaTexto(this.fechaPrimeraDevolucion)}).`;
    }
    if (!c.concepto) return 'Seleccione el concepto.';
    if (this.conceptoEsOtro && !c.conceptoDetalle.trim()) return 'Indique cuál es el concepto.';
    if (!c.area) return 'Seleccione el área.';
    if (this.areaEsOtro && !c.areaDetalle.trim()) return 'Indique cuál es el área.';
    if (!c.idUsuarioEntregado) return 'Seleccione a quién se entrega.';
    if (!c.tipoEntrega) return 'Seleccione el tipo de entrega.';
    if (this.requiereDevolucion) {
      if (!c.fechaDevolucion) return 'Seleccione la fecha prevista de devolución.';
      if (toIsoDate(c.fechaDevolucion)! < toIsoDate(c.fecha)!) {
        return 'La fecha prevista de devolución no puede ser anterior a la fecha de entrega.';
      }
    } else if (this.fechaPrimeraDevolucion) {
      return 'La entrega ya tiene devoluciones: no puede pasar a "No requiere devolución".';
    }
    return null;
  }

  guardarEdicion(): void {
    if (this.guardando || !this.idEntregaEdicion) return;
    const error = this.validarEdicion();
    if (error) {
      SwalTop.fire({ icon: 'warning', title: 'Datos incompletos', text: error, confirmButtonColor: COLOR_SWAL });
      return;
    }
    const c = this.cab;
    const id = this.idEntregaEdicion;
    this.guardando = true;
    this.inventarioService
      .editarEntrega(id, {
        fecha_movimiento: toIsoDate(c.fecha),
        concepto: c.concepto,
        concepto_detalle: this.conceptoEsOtro ? c.conceptoDetalle.trim() : null,
        area: c.area,
        area_detalle: this.areaEsOtro ? c.areaDetalle.trim() : null,
        id_usuario_entregado: c.idUsuarioEntregado,
        id_constructora: c.idConstructora ? Number(c.idConstructora) : null,
        id_proyecto: c.idProyecto ? Number(c.idProyecto) : null,
        tipo_doc_ref: c.tipoDoc,
        numerodoc_ref: c.numeroDoc,
        ubicacion_entrega: c.ubicacionEntrega.trim() || null,
        tipo_entrega: c.tipoEntrega,
        fecha_prevista_devolucion: this.requiereDevolucion ? toIsoDate(c.fechaDevolucion) : null,
        autoriza: c.autoriza.trim() || null,
        transporte: c.transporte.trim() || null,
        observaciones: c.observaciones.trim() || null,
        items: this.itemsEdicion.map((it) => ({
          id_detalle: it.idDetalle,
          ancho: it.ancho,
          alto: it.alto,
          estado_material: it.estado.trim() || null,
          observaciones: it.observaciones.trim() || null,
        })),
      })
      .subscribe({
        next: (res) => {
          this.guardando = false;
          this.edicionVisible = false;
          this.exito('Entrega actualizada', res.mensaje);
          this.refrescar();
        },
        error: (err) => {
          this.guardando = false;
          this.fallo(err, 'No se pudo editar la entrega.');
        },
      });
  }

  /* ===================== Formato PDF (reimpresión) ===================== */

  private empresaDe(m: MovimientoEncabezado): EmpresaImpresion | null {
    return m.id_empresa ? EMPRESA_IMPRESION[m.id_empresa] ?? null : null;
  }

  private proyectoDe(m: MovimientoEncabezado): string {
    return m.proyecto || m.ubicacion_entrega || '';
  }

  verFormatoEntrega(): void {
    const d = this.detalle;
    if (!d) return;
    const e = d.entrega;
    const obs = (e.observaciones ?? '').trim();
    const prevista = e.tipo_entrega === 'REQUIERE_DEVOLUCION' && e.fecha_prevista
      ? `Requiere devolución el ${this.fechaTexto(e.fecha_prevista)}.`
      : '';
    this.abrirFormato({
      titulo: 'ENTREGA MATERIAL',
      nombreArchivo: 'Entrega',
      empresa: this.empresaDe(e),
      consecutivo: e.consecutivo,
      fecha: fromIsoDate(e.fecha),
      personaLabel: 'ENTREGADO A:',
      persona: e.entregado_a ?? '',
      concepto: this.conceptoDe(e),
      area: this.areaDe(e),
      proyecto: this.proyectoDe(e),
      tipoDoc: labelTipoContratoDocumento(e.tipo_doc_ref),
      numeroDoc: e.numerodoc_ref ?? '',
      elementos: d.items
        .filter((it) => it.estado_item === 'ACTIVO')
        .map((it) => ({
          codigo: it.codigo_material,
          descripcion: it.descripcion,
          cantidad: it.cantidad,
          um: it.um,
          ancho: it.ancho,
          alto: it.alto,
          estado: it.estado_material,
          observaciones: it.observaciones,
        })),
      observaciones: [obs, prevista].filter(Boolean).join(' — '),
      autoriza: e.autoriza ?? '',
      transporte: e.transporte ?? '',
    });
  }

  verFormatoDevolucion(dev: DevolucionConsulta): void {
    const e = this.detalle?.entrega;
    if (!e) return;
    const obs = (dev.observaciones ?? '').trim();
    const ref = `Devolución de la entrega ${e.consecutivo} del ${this.fechaTexto(e.fecha)}.`;
    this.abrirFormato({
      titulo: 'DEVOLUCIÓN MATERIAL',
      nombreArchivo: 'Devolucion',
      empresa: this.empresaDe(dev) ?? this.empresaDe(e),
      consecutivo: dev.consecutivo,
      fecha: fromIsoDate(dev.fecha),
      personaLabel: 'ENCARGADO:',
      persona: dev.entregado_a ?? '',
      concepto: dev.concepto_devolucion ? etiquetaParametro(dev.concepto_devolucion) : '',
      area: this.areaDe(dev),
      proyecto: this.proyectoDe(dev),
      tipoDoc: labelTipoContratoDocumento(dev.tipo_doc_ref),
      numeroDoc: dev.numerodoc_ref ?? '',
      elementos: dev.items
        .filter((it) => it.estado === 'ACTIVO')
        .map((it) => ({
          codigo: it.codigo_material,
          descripcion: it.descripcion,
          cantidad: it.cantidad,
          um: it.um,
          ancho: it.ancho,
          alto: it.alto,
          estado: it.estado_material,
          observaciones: it.observaciones,
        })),
      observaciones: obs ? `${obs} — ${ref}` : ref,
      autoriza: dev.autoriza ?? '',
      transporte: dev.transporte ?? '',
    });
  }

  private abrirFormato(datos: FormatoDatos): void {
    this.formato = datos;
    this.formatoVisible = true;
  }

  descargarPdf(): void {
    const f = this.formato;
    const element = document.getElementById('consultaFormato');
    if (!f || !element || this.generandoPdf) return;

    this.generandoPdf = true;
    SwalTop.fire({
      title: 'Generando PDF...',
      text: 'Por favor espere',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(null),
    });

    const proyecto = f.proyecto.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
    const filename = proyecto ? `${f.nombreArchivo}_${f.consecutivo}_${proyecto}.pdf` : `${f.nombreArchivo}_${f.consecutivo}.pdf`;

    html2pdf()
      .set({
        margin: 5,
        filename,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm' as const, format: 'letter' as const, orientation: 'portrait' as const },
      })
      .from(element)
      .save()
      .then(() => Swal.close())
      .catch(() => SwalTop.fire('Error', 'No se pudo generar el PDF.', 'error'))
      .finally(() => {
        this.generandoPdf = false;
      });
  }

  /* ===================== Navegación ===================== */

  nuevaEntrega(): void {
    this.router.navigate([this.config.rutaNuevo]);
  }

  nuevaDevolucion(): void {
    this.router.navigate([MOVIMIENTO_CONFIG.DEVOLUCION.rutaNuevo]);
  }

  volver(): void {
    this.router.navigate([INVENTARIO_HUB_ROUTE]);
  }
}
