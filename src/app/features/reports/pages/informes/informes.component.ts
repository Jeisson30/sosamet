import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import Swal from 'sweetalert2';
import html2pdf from 'html2pdf.js';

import { ContractsService } from '../../../contracts/shared/service/contracts.service';
import { ContractTypeResponse } from '../../../contracts/shared/interfaces/Response.interface';
import { CatalogService, ConstructoraDto, ProyectoDto } from '../../../../shared/services/catalog.service';
import { GestionService } from '../../../gestion/shared/service/gestion.service';
import { GestionUser } from '../../../gestion/shared/interfaces/Response.interface';
import {
  ReportColumn,
  ReportsService,
} from '../../shared/service/reports.service';
import {
  COLUMNAS_POR_INFORME,
  INFORME_SUBTITULO,
} from '../../shared/informes-spec';
import { ReportTypeId } from '../../shared/informes-types';
import {
  informeTiposPermitidos,
  informeTipoHabilitado as perfilInformeTipoHabilitado,
} from '../../../../core/auth/permissions';

interface ReportTypeCard {
  id: ReportTypeId;
  title: string;
  description: string;
  icon: string;
}

interface EmpresaOption {
  label: string;
  value: string | null;
}

interface TrabajadorOption {
  label: string;
  value: string | null;
}

@Component({
  selector: 'app-informes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    DropdownModule,
    CalendarModule,
    TableModule,
    ButtonModule,
    TooltipModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './informes.component.html',
  styleUrls: ['./informes.component.scss'],
})
export class InformesComponent implements OnInit {
  @ViewChild('typeScroll') typeScroll?: ElementRef<HTMLDivElement>;
  @ViewChild('pdfContrato') pdfContrato?: ElementRef<HTMLDivElement>;
  @ViewChild('pdfCartera') pdfCartera?: ElementRef<HTMLDivElement>;
  @ViewChild('pdfObrasActivas') pdfObrasActivas?: ElementRef<HTMLDivElement>;
  @ViewChild('pdfCostosInsumo') pdfCostosInsumo?: ElementRef<HTMLDivElement>;

  reportTypes: ReportTypeCard[] = [
    {
      id: 'payment',
      title: 'FINANZAS',
      description:
        'Por contrato y constructoras: anticipos, actas, retegarantías, saldo, pago y avance de obra.',
      icon: 'pi pi-wallet',
    },
    {
      id: 'cost-by-input',
      title: 'COSTOS POR INSUMO',
      description:
        'Valor por unidad de medida — promedio por insumo, constructora y proyecto.',
      icon: 'pi pi-chart-bar',
    },
    {
      id: 'production-contract',
      title: 'CONTRATOS',
      description:
        'Elementos contratados, fabricados, entregados y adicionales.',
      icon: 'pi pi-briefcase',
    },
    {
      id: 'production-plant',
      title: 'PRODUCCIÓN',
      description:
        'Contratos, actas de medida, órdenes de producción, liquidación de cortes.',
      icon: 'pi pi-warehouse',
    },
    {
      id: 'movements',
      title: 'MOVIMIENTOS GENERALES',
      description:
        'Resumen de remisiones, órdenes de compra y documentos.',
      icon: 'pi pi-arrows-h',
    },
  ];

  selectedType: ReportTypeId = 'production-contract';
  lastSearchAt: Date | null = null;
  canExport = false;

  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;
  documento: string | null = null;
  documentoOptions: { label: string; value: string | null }[] = [
    { label: 'Todos', value: null },
  ];
  /** Informe de movimientos sin tipo_doc propio (no viene del catálogo de tipos). */
  private static readonly DOCUMENTO_HISTORIAL_CONTRATOS = {
    label: 'HISTORIAL CONTRATOS',
    value: 'HISTORIAL CONTRATOS' as string | null,
  };
  /** Tipo de informe (tarjeta CONTRATOS). Habilitados: control-general-contrato y obras-activas. */
  tipoInformeContrato: string = 'control-general-contrato';
  readonly tipoInformeContratoOptions: {
    label: string;
    value: string;
    ready: boolean;
  }[] = [
    { label: 'Obras Activas', value: 'obras-activas', ready: true },
    {
      label: 'Control General Contrato',
      value: 'control-general-contrato',
      ready: true,
    },
    { label: 'Control Adicionales', value: 'control-adicionales', ready: false },
    {
      label: 'Detalle Contrato Con Valores',
      value: 'detalle-con-valores',
      ready: false,
    },
    {
      label: 'Detalle De Contrato Sin Valores',
      value: 'detalle-sin-valores',
      ready: false,
    },
    { label: 'Historial De Obras', value: 'historial-obras', ready: false },
    {
      label: 'Activas y Finalizadas',
      value: 'activas-finalizadas',
      ready: false,
    },
  ];
  /** @deprecated compat: se mantiene por plantillas PDF antiguas */
  get documentoProduccion(): 'contrato' | 'obras-activas' {
    return this.tipoInformeContrato === 'obras-activas'
      ? 'obras-activas'
      : 'contrato';
  }
  empresaAsociada: string | null = null;
  empresas: EmpresaOption[] = [{ label: 'Todas', value: null }];
  contratosOptions: { label: string; value: string }[] = [];
  private contratosRaw: Array<Record<string, unknown>> = [];
  selectedConstructoraId: string | null = null;
  selectedProyectoId: string | null = null;
  constructorasOptions: { label: string; value: string }[] = [];
  proyectosOptions: { label: string; value: string }[] = [];
  numeroContrato: string = '';
  trabajador: string | null = null;
  trabajadorOptions: TrabajadorOption[] = [{ label: 'Todos', value: null }];

  /** Filtros Costos por insumo */
  selectedCategoriaId: number | null = null;
  selectedInsumoCodigo: string | null = null;
  categoriaOptions: { label: string; value: number | null }[] = [
    { label: 'Todos', value: null },
  ];
  insumoOptions: { label: string; value: string | null }[] = [
    { label: 'Todos', value: null },
  ];
  private insumosRaw: Array<{
    id_insumo: number;
    id_categoria: number;
    codigo: string;
    nombre: string;
    prefijo: string;
  }> = [];

  /** Liquidación de cortes (PDF): fabricación / instalación / pintura */
  tipoCorteFiltro: string | null = null;
  tipoCorteOptions: { label: string; value: string | null }[] = [
    { label: 'Todos', value: null },
    { label: 'Fabricación', value: 'fabricacion' },
    { label: 'Instalación', value: 'instalacion' },
    { label: 'Pintura', value: 'pintura' },
  ];

  /** Catálogo id -> logo + nombre (alineado con setEmpresaImpresion en selectDocument). */
  private empresaDetalle = new Map<
    string,
    { nombre: string; logo: string }
  >();

  previewColumns: ReportColumn[] = [];
  previewRows: Record<string, string | number | null>[] = [];
  metaPreview: Record<string, unknown> = {};
  previewLoading = false;

  outputFormat: 'xlsx' | 'pdf' = 'xlsx';
  generando = false;

  get nombreReporteVista(): string {
    if (this.selectedType === 'production-contract') {
      return (
        this.tipoInformeContratoOptions.find(
          (o) => o.value === this.tipoInformeContrato
        )?.label?.toUpperCase() ?? 'INFORME DE CONTRATOS'
      );
    }
    const map: Record<ReportTypeId, string> = {
      payment: 'INFORME DE PAGOS (por contrato y constructoras)',
      'cost-by-input': 'ANÁLISIS DE COSTOS POR INSUMO',
      'production-contract': 'INFORME DE PRODUCCIÓN POR CONTRATO',
      'production-plant': 'INFORME DE PRODUCCIÓN – PLANTA Y OBRAS',
      movements: 'MOVIMIENTO GENERAL',
    };
    return map[this.selectedType] ?? 'INFORME';
  }

  get labelDocumentoProduccion(): string {
    return (
      this.tipoInformeContratoOptions.find(
        (o) => o.value === this.tipoInformeContrato
      )?.label ?? 'Contrato'
    );
  }

  get tipoInformeContratoListo(): boolean {
    return !!this.tipoInformeContratoOptions.find(
      (o) => o.value === this.tipoInformeContrato && o.ready
    );
  }

  get subtituloDocumentoSpec(): string {
    return INFORME_SUBTITULO[this.selectedType] ?? '';
  }

  /**
   * Excel INFORMES:
   * Admin → todos; Supervisor → General + Producción; Contabilidad → Finanzas + Costos.
   */
  informeTipoHabilitado(id: ReportTypeId): boolean {
    return perfilInformeTipoHabilitado(id);
  }

  get rangoFechasTexto(): string {
    if (
      this.selectedType !== 'movements' &&
      this.selectedType !== 'cost-by-input'
    ) {
      return '';
    }
    const a = this.formatoDisplay(this.fechaDesde);
    const b = this.formatoDisplay(this.fechaHasta);
    if (a && b) {
      return `${a} — ${b}`;
    }
    if (a) {
      return `Desde ${a}`;
    }
    if (b) {
      return `Hasta ${b}`;
    }
    return '';
  }

  /**
   * Encabezado: movimientos generales según empresa asociada;
   * producción por contrato: Sosamet.
   */
  get vistaPreviaLogoUrl(): string {
    return this.getVistaPreviaBranding().logo;
  }

  get vistaPreviaNombreComercial(): string {
    return this.getVistaPreviaBranding().nombre;
  }

  /** Hierros (empresa 2): logo más compacto verticalmente → necesita más altura. */
  get vistaPreviaLogoEsHs(): boolean {
    return /LOGO_HS\.png$/i.test(this.vistaPreviaLogoUrl);
  }

  private getVistaPreviaBranding(): { logo: string; nombre: string } {
    // Logo según empresa filtrada (1 Sosamet / 2 HS) en movimientos y contratos.
    if (
      (this.selectedType === 'movements' ||
        this.selectedType === 'production-contract' ||
        this.selectedType === 'payment' ||
        this.selectedType === 'cost-by-input') &&
      this.empresaAsociada
    ) {
      return (
        this.empresaDetalle.get(String(this.empresaAsociada)) ?? {
          logo: this.logoForEmpresaId(String(this.empresaAsociada)),
          nombre: this.labelEmpresaAsociadaCartera,
        }
      );
    }
    if (this.selectedType === 'movements' && !this.empresaAsociada) {
      return { logo: 'assets/images/logo.png', nombre: 'Todas las empresas' };
    }
    if (
      this.selectedType === 'production-contract' ||
      this.selectedType === 'payment' ||
      this.selectedType === 'production-plant'
    ) {
      // Sin filtro: logo Sosamet claro (logo.png) sobre fondo oscuro de la vista previa.
      return {
        logo: 'assets/images/logo.png',
        nombre: 'SOSAMET SAS',
      };
    }
    return { logo: 'assets/images/logo.png', nombre: '' };
  }

  get usuarioTexto(): string {
    const nombre = localStorage.getItem('nombreUsuario') ?? '';
    const apellido = localStorage.getItem('apellidoUsuario') ?? '';
    const full = `${nombre} ${apellido}`.trim();
    return full || nombre || 'Usuario';
  }

  /**
   * Iconos de cabecera/detalle en PDFs de informes (`src/assets/images`).
   * `stem` = nombre de archivo sin extensión (p. ej. "Exportado por" → Exportado%20por.png).
   */
  informeIcon(stem: string): string {
    return `assets/images/${encodeURIComponent(stem)}.png`;
  }

  get contratoMeta(): Record<string, unknown> | null {
    const m = this.metaPreview as { contrato?: unknown };
    return m?.contrato && typeof m.contrato === 'object'
      ? (m.contrato as Record<string, unknown>)
      : null;
  }

  get resumenMeta(): Record<string, unknown> | null {
    const m = this.metaPreview as { resumen?: unknown };
    return m?.resumen && typeof m.resumen === 'object'
      ? (m.resumen as Record<string, unknown>)
      : null;
  }

  get carteraEncabezado(): Record<string, unknown> | null {
    const m = this.metaPreview as { encabezado?: unknown };
    return m?.encabezado && typeof m.encabezado === 'object'
      ? (m.encabezado as Record<string, unknown>)
      : null;
  }

  get carteraResumen(): Record<string, unknown> | null {
    const m = this.metaPreview as { resumen?: unknown };
    return m?.resumen && typeof m.resumen === 'object'
      ? (m.resumen as Record<string, unknown>)
      : null;
  }

  get carteraFacturacion(): Record<string, string | number | null>[] {
    const m = this.metaPreview as { facturacion?: unknown };
    return Array.isArray(m?.facturacion)
      ? (m.facturacion as Record<string, string | number | null>[])
      : [];
  }

  /** Grupos por constructora (SP_REPORTE_CARTERA unificado). */
  get carteraGruposMeta(): {
    constructora: string;
    rete: Record<string, unknown>[];
    facturacion: Record<string, unknown>[];
    total_constructora: Record<string, unknown> | null;
  }[] {
    const m = this.metaPreview as { grupos?: unknown };
    if (!Array.isArray(m?.grupos)) {
      return [];
    }
    return m.grupos as {
      constructora: string;
      rete: Record<string, unknown>[];
      facturacion: Record<string, unknown>[];
      total_constructora: Record<string, unknown> | null;
    }[];
  }

  carteraEstadoFactura(dias: unknown): string {
    if (dias == null || dias === '') {
      return '—';
    }
    return String(dias);
  }

  /** Evita `?.['x']` en plantillas (Angular no lo parsea bien). */
  carteraTotalCampo(
    tot: Record<string, unknown> | null | undefined,
    campo: string
  ): unknown {
    if (tot == null || typeof tot !== 'object') {
      return null;
    }
    return tot[campo];
  }

  get pdfLogoUrl(): string {
    const empresaAsociada = this.contratoMeta?.['empresa_asociada'];
    const id = empresaAsociada != null ? String(empresaAsociada) : '';
    return this.logoForEmpresaId(id);
  }

  /** Logo PDF Obras Activas: según filtro empresa (1/2); sin filtro → Sosamet claro. */
  get obrasActivasPdfLogoUrl(): string {
    const id =
      this.empresaAsociada != null && String(this.empresaAsociada).trim() !== ''
        ? String(this.empresaAsociada).trim()
        : '1';
    return this.logoForEmpresaId(id);
  }

  get obrasActivasPdfLogoEsHs(): boolean {
    return /LOGO_HS\.png$/i.test(this.obrasActivasPdfLogoUrl);
  }

  get pdfLogoEsHs(): boolean {
    return /LOGO_HS\.png$/i.test(this.pdfLogoUrl);
  }

  get obrasActivasPdfNombreEmpresa(): string {
    const id =
      this.empresaAsociada != null && String(this.empresaAsociada).trim() !== ''
        ? String(this.empresaAsociada).trim()
        : '1';
    return (
      this.empresaDetalle.get(id)?.nombre ??
      (id === '2' ? 'HS' : id === '3' ? 'DMS STUDIO' : 'SOSAMET SAS')
    );
  }

  get pdfNombreEmpresa(): string {
    const empresaAsociada = this.contratoMeta?.['empresa_asociada'];
    const id = empresaAsociada != null ? String(empresaAsociada) : '';
    return this.empresaDetalle.get(id)?.nombre ?? 'SOSAMET SAS';
  }

  get fechaGeneracion(): Date {
    return this.lastSearchAt ?? new Date();
  }

  /** Vista previa o exportación en curso (overlay unificado). */
  get informeBusy(): boolean {
    return this.previewLoading || this.generando;
  }

  get informeBusyTitulo(): string {
    if (this.generando) {
      return 'Generando informe';
    }
    if (this.previewLoading) {
      return 'Cargando vista previa';
    }
    return '';
  }

  get informeBusyDetalle(): string {
    if (this.generando) {
      return this.outputFormat === 'pdf'
        ? 'Preparando el PDF, espere un momento…'
        : 'Generando el archivo Excel…';
    }
    if (this.previewLoading) {
      return 'Consultando el servidor…';
    }
    return '';
  }

  /**
   * Fechas del contrato en PDF Control General: DD-MM-AA (año 2 cifras).
   * La fecha de generación no usa esto.
   */
  formatFechaCorta(value: unknown): string {
    if (value == null || value === '') return '—';
    if (typeof value === 'number' && Number.isFinite(value)) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return `${this.pad2(d.getDate())}-${this.pad2(d.getMonth() + 1)}-${String(d.getFullYear()).slice(-2)}`;
      }
    }
    if (value instanceof Date && !isNaN(value.getTime())) {
      return `${this.pad2(value.getDate())}-${this.pad2(value.getMonth() + 1)}-${String(value.getFullYear()).slice(-2)}`;
    }
    const s = String(value).trim();
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      const [, y, mo, d] = iso;
      return `${d}-${mo}-${y.slice(-2)}`;
    }
    const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (slash) {
      const d = Number(slash[1]);
      const mo = Number(slash[2]);
      let y = slash[3];
      if (y.length === 4) y = y.slice(-2);
      return `${this.pad2(d)}-${this.pad2(mo)}-${y}`;
    }
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      return `${this.pad2(parsed.getDate())}-${this.pad2(parsed.getMonth() + 1)}-${String(parsed.getFullYear()).slice(-2)}`;
    }
    return s;
  }

  /** Fechas Obras Activas (vista previa + PDF): DD/MM/AAAA */
  formatFechaDdMmYyyy(value: unknown): string {
    if (value == null || value === '') return '—';
    const toParts = (d: Date): string =>
      `${this.pad2(d.getDate())}/${this.pad2(d.getMonth() + 1)}/${d.getFullYear()}`;

    if (typeof value === 'number' && Number.isFinite(value)) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return toParts(d);
    }
    if (value instanceof Date && !isNaN(value.getTime())) {
      return toParts(value);
    }
    const s = String(value).trim();
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      const [, y, mo, d] = iso;
      return `${d}/${mo}/${y}`;
    }
    const slash = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (slash) {
      const d = Number(slash[1]);
      const mo = Number(slash[2]);
      let y = slash[3];
      if (y.length === 2) y = `20${y}`;
      return `${this.pad2(d)}/${this.pad2(mo)}/${y}`;
    }
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return toParts(parsed);
    return s;
  }

  /** Id empresa asociada (1/2) → nombre comercial. */
  nombreEmpresaAsociada(value: unknown): string {
    if (value == null || value === '') return '—';
    const id = String(value).trim();
    const fromMap = this.empresaDetalle.get(id)?.nombre;
    if (fromMap) return fromMap;
    const fromList = this.empresas.find((e) => e.value === id)?.label;
    if (fromList) return fromList;
    if (id === '1') return 'SOSAMET SAS';
    if (id === '2') return 'HIERROS Y SERVICIOS SAS';
    if (id === '3') return 'DMS STUDIO';
    return id;
  }

  /** Celda de vista previa: formatea Obras Activas e Insumo (código - nombre). */
  formatPreviewCell(
    field: string,
    value: unknown,
    row?: Record<string, string | number | null>
  ): string {
    if (this.selectedType === 'movements') {
      return value == null || value === '' ? '—' : String(value);
    }
    if (this.selectedType === 'cost-by-input') {
      if (
        field === 'valor_contratado_promedio' ||
        field === 'valor_unitario_promedio' ||
        field === 'costo_material_promedio' ||
        field === 'mo_fabricacion_promedio' ||
        field === 'mo_instalacion_promedio' ||
        field === 'costo_total_promedio' ||
        field === 'utilidad_promedio'
      ) {
        return value == null || value === '' ? '—' : this.formatMoneyCOP(value);
      }
      if (
        field === 'pct_material' ||
        field === 'pct_fabricacion' ||
        field === 'pct_instalacion' ||
        field === 'pct_utilidad'
      ) {
        if (value == null || value === '') return '—';
        return `${value}%`;
      }
      if (value == null || value === '') return '—';
      return String(value);
    }
    if (field === 'insumo') {
      return this.formatInsumoLabel(
        (row as Record<string, unknown>) ?? { insumo: value }
      );
    }
    if (this.documentoProduccion === 'obras-activas') {
      if (field === 'fecha_inicio' || field === 'fecha_finalizacion') {
        return this.formatFechaDdMmYyyy(value);
      }
      if (field === 'empresa_asociada') {
        return this.nombreEmpresaAsociada(value);
      }
      if (field === 'valor_contratado' || field === 'saldo') {
        return this.formatMoneyCOP(value);
      }
      if (field === 'ejecutado') {
        return this.formatPctEjecutado(value);
      }
    }
    if (value == null || value === '') return '—';
    return String(value);
  }

  private pad2(n: number): string {
    return n < 10 ? `0${n}` : String(n);
  }

  /** Números negativos (incl. formato contable con paréntesis) → rojo en PDF */
  isNegativo(value: unknown): boolean {
    if (value == null || value === '') return false;
    if (typeof value === 'number' && Number.isFinite(value) && value < 0) return true;
    const raw = String(value)
      .trim()
      .replace(/\s/g, '')
      .replace(/\u2212/g, '-')
      .replace(',', '.');
    if (/^\(.*\)$/.test(raw)) {
      const inner = raw.slice(1, -1).replace(',', '.');
      const n = Number(inner);
      return Number.isFinite(n) && n !== 0;
    }
    const n = Number(raw);
    if (Number.isFinite(n) && n < 0) return true;
    if (/^-/.test(raw)) return true;
    return false;
  }

  readonly pdfGaugeRadius = 46;

  get pdfGaugeArcLength(): number {
    return Math.PI * this.pdfGaugeRadius;
  }

  get pdfGaugeStrokeOffset(): number {
    const p = Math.max(0, Math.min(100, this.pctEntregadoNum));
    return this.pdfGaugeArcLength * (1 - p / 100);
  }

  private toPct(value: unknown): number {
    if (value == null) return 0;
    const raw = String(value).replace('%', '').trim();
    const n = Number(raw);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  get pctEntregadoNum(): number {
    return this.toPct(this.resumenMeta?.['pct_entregado']);
  }

  get pctInstaladoNum(): number {
    return this.toPct(this.resumenMeta?.['pct_instalado']);
  }

  get pctPendienteNum(): number {
    // Pendiente para finalizar = 100% − % entregado (remisiones vs contrato)
    return Math.max(0, Math.min(100, 100 - this.pctEntregadoNum));
  }

  get pctFabricadoNum(): number {
    return this.toPct(this.resumenMeta?.['pct_fabricado']);
  }

  get pctFacturadoNum(): number {
    return this.toPct(this.resumenMeta?.['pct_facturado'] ?? 0);
  }

  estadoPillClass(estado: unknown): string {
    const s = String(estado ?? '').trim().toLowerCase();
    if (!s) return 'estado--default';
    if (s.includes('exced')) return 'estado--excedido';
    if (s.includes('proceso') || s.includes('en progreso')) return 'estado--proceso';
    if (s.includes('instalar')) return 'estado--proceso';
    if (s.includes('facturar')) return 'estado--proceso';
    if (s.includes('pend')) return 'estado--pendiente';
    if (s.includes('cancel')) return 'estado--cancelado';
    if (s.includes('complet')) return 'estado--completado';
    return 'estado--default';
  }

  /** Insumo en informes: código - nombre (catálogo). */
  formatInsumoLabel(row: Record<string, unknown> | null | undefined): string {
    if (!row) return '—';
    let codigo = String(row['insumo'] ?? '').trim();
    let nombre = String(row['insumo_nombre'] ?? '').trim();
    // Si ya viene concatenado desde Excel/API, no duplicar.
    if (codigo.includes(' - ') && !nombre) {
      return codigo;
    }
    if (codigo.includes(' - ') && nombre) {
      const left = codigo.split(' - ')[0]?.trim() || codigo;
      codigo = left;
    }
    if (codigo && nombre) return `${codigo} - ${nombre}`;
    return codigo || nombre || '—';
  }

  get labelTipoCorteFiltro(): string {
    if (!this.tipoCorteFiltro) {
      return 'Todos';
    }
    return (
      this.tipoCorteOptions.find((o) => o.value === this.tipoCorteFiltro)
        ?.label ?? this.tipoCorteFiltro
    );
  }

  constructor(
    private contractsService: ContractsService,
    private catalogService: CatalogService,
    private gestionService: GestionService,
    private reportsService: ReportsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const permitidos = informeTiposPermitidos();
    if (permitidos.length && !permitidos.includes(this.selectedType)) {
      this.selectedType = permitidos[0];
    }
    this.loadDocumentTypes();
    this.loadEmpresas();
    this.loadContratos();
    this.loadConstructoras();
    this.loadTrabajadoresGestion();
    this.loadInsumosCatalog();
    this.aplicarPlantillaVistaPrevia();
  }

  private loadInsumosCatalog(): void {
    this.catalogService.getInsumosActivos().subscribe({
      next: (data) => {
        this.categoriaOptions = [
          { label: 'Todos', value: null },
          ...(data?.categorias || []).map((c) => ({
            label: `${c.prefijo} — ${c.nombre}`,
            value: c.id_categoria,
          })),
        ];
        this.insumosRaw = data?.insumos || [];
        this.refreshInsumoOptions();
      },
      error: () => {
        this.categoriaOptions = [{ label: 'Todos', value: null }];
        this.insumosRaw = [];
        this.refreshInsumoOptions();
      },
    });
  }

  private refreshInsumoOptions(): void {
    const catId = this.selectedCategoriaId;
    const list = catId
      ? this.insumosRaw.filter((i) => i.id_categoria === catId)
      : this.insumosRaw;
    this.insumoOptions = [
      { label: 'Todos', value: null },
      ...list.map((i) => ({
        label: `${i.codigo} - ${i.nombre}`,
        value: i.codigo,
      })),
    ];
    if (
      this.selectedInsumoCodigo &&
      !list.some((i) => i.codigo === this.selectedInsumoCodigo)
    ) {
      this.selectedInsumoCodigo = null;
    }
  }

  onCategoriaInsumoChange(value: number | null): void {
    this.selectedCategoriaId = value;
    this.refreshInsumoOptions();
    this.canExport = false;
  }

  private loadDocumentTypes(): void {
    this.contractsService.getTypeContract().subscribe({
      next: (list: ContractTypeResponse[]) => {
        const tipos = list
          .filter((t) => t?.tipo_doc)
          .map((t) => ({
            label: String(t.tipo_doc).toUpperCase(),
            value: t.tipo_doc as string | null,
          }));
        const idxContrato = tipos.findIndex((t) => t.label === 'CONTRATO');
        tipos.splice(idxContrato + 1, 0, InformesComponent.DOCUMENTO_HISTORIAL_CONTRATOS);
        this.documentoOptions = [{ label: 'Todos', value: null }, ...tipos];
      },
      error: () => {
        this.documentoOptions = [
          { label: 'Todos', value: null },
          InformesComponent.DOCUMENTO_HISTORIAL_CONTRATOS,
        ];
      },
    });
  }

  private loadEmpresas(): void {
    this.contractsService.getCompanies().subscribe({
      next: (companies) => {
        this.empresas = [
          { label: 'Todas', value: null },
          ...companies.map((c: { id: unknown; nombre_empresa: string }) => ({
            label: c.nombre_empresa,
            value: String(c.id),
          })),
        ];
        this.empresaDetalle.clear();
        companies.forEach((c: { id: unknown; nombre_empresa: string }) => {
          const id = String(c.id);
          this.empresaDetalle.set(id, {
            nombre: c.nombre_empresa,
            logo: this.logoForEmpresaId(id),
          });
        });
        this.empresaDetalle.set('1', {
          nombre: 'SOSAMET SAS',
          logo: 'assets/images/logo.png',
        });
        this.empresaDetalle.set('2', {
          nombre: 'HIERROS Y SERVICIOS SAS',
          logo: 'assets/images/LOGO_HS.png',
        });
        this.empresaDetalle.set('3', {
          nombre: 'DMS STUDIO',
          logo: 'assets/images/LOGO_DMS.png',
        });
      },
      error: () => {
        this.empresas = [{ label: 'Todas', value: null }];
      },
    });
  }

  private loadContratos(): void {
    this.contractsService.consultarContratos().subscribe({
      next: (res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.contratosRaw = list as Array<Record<string, unknown>>;
        // value = numerodoc puro (lo que consume el SP). label puede traer "num — proyecto".
        this.contratosOptions = list
          .map((c) => {
            const value = String(c.value || c.numero_contrato || '').trim();
            const label = String(c.label || value).trim();
            return { label: label || value, value };
          })
          .filter((c) => !!c.value);
      },
      error: () => {
        this.contratosRaw = [];
        this.contratosOptions = [];
      },
    });
  }

  onTipoInformeContratoChange(value: string): void {
    this.tipoInformeContrato = value;
    this.canExport = false;
    this.previewRows = [];
    this.metaPreview = {};
    this.lastSearchAt = null;
    this.aplicarPlantillaVistaPrevia();
    const opt = this.tipoInformeContratoOptions.find((o) => o.value === value);
    if (opt && !opt.ready) {
      void Swal.fire({
        icon: 'info',
        title: 'Próximamente',
        text: `El informe «${opt.label}» se implementará en una próxima versión. Por ahora puede usar Control General Contrato.`,
        confirmButtonColor: '#20506A',
      });
      this.tipoInformeContrato = 'control-general-contrato';
      return;
    }
    // Si ya hay contrato y el tipo está listo, recargar automáticamente.
    if (this.tipoInformeContratoListo && this.selectedType === 'production-contract') {
      if (this.tipoInformeContrato === 'obras-activas') {
        this.cargarVistaPreviaObrasActivas();
      } else if (String(this.numeroContrato || '').trim()) {
        this.cargarVistaPreviaProduccion();
      }
    }
  }

  private logoForEmpresaId(id: string): string {
    // Empresa 1: logo.png (texto blanco) — logo_principal no se ve en fondos oscuros.
    if (id === '1') {
      return 'assets/images/logo.png';
    }
    if (id === '2') {
      return 'assets/images/LOGO_HS.png';
    }
    if (id === '3') {
      return 'assets/images/LOGO_DMS.png';
    }
    return 'assets/images/logo.png';
  }

  private loadConstructoras(): void {
    this.catalogService.getConstructoras().subscribe({
      next: (list: ConstructoraDto[]) => {
        this.constructorasOptions = list.map((c) => ({
          label: c.nombre,
          value: String(c.id),
        }));
      },
      error: () => {
        this.constructorasOptions = [];
      },
    });
  }

  private loadTrabajadoresGestion(): void {
    this.gestionService.getAllUsers().subscribe({
      next: (res) => {
        const list = res.data || [];
        this.trabajadorOptions = [
          { label: 'Todos', value: null },
          ...list.map((u: GestionUser) => {
            const nombreCompleto = `${u.nombre ?? ''} ${u.apellido ?? ''}`.trim();
            return {
              label: `${nombreCompleto} — ${u.perfil}`,
              value: nombreCompleto,
            };
          }),
        ];
      },
      error: () => {
        this.trabajadorOptions = [{ label: 'Todos', value: null }];
      },
    });
  }

  onConstructoraFilterChange(id: string | null): void {
    this.selectedConstructoraId = id;
    this.selectedProyectoId = null;
    this.proyectosOptions = [];
    if (!id) {
      return;
    }
    this.catalogService.getProyectosByConstructora(id).subscribe({
      next: (list: ProyectoDto[]) => {
        this.proyectosOptions = list.map((p) => ({
          label: p.nombre,
          value: String(p.id),
        }));
      },
      error: () => {
        this.proyectosOptions = [];
      },
    });
  }

  selectType(id: ReportTypeId): void {
    if (!this.informeTipoHabilitado(id)) {
      return;
    }
    this.selectedType = id;
    this.canExport = false;
    this.generando = false;
    if (id === 'movements') {
      this.outputFormat = 'xlsx';
    }
    this.aplicarPlantillaVistaPrevia();
  }

  /**
   * Columnas fijas según CONSULTAS GENERAL (PDF). Filas vacías hasta SP / API.
   */
  private aplicarPlantillaVistaPrevia(): void {
    const cols = COLUMNAS_POR_INFORME[this.selectedType];
    this.previewColumns = cols.length ? [...cols] : [];
    this.previewRows = [];
    this.lastSearchAt = null;
    this.previewLoading = false;
  }

  scrollTypes(dir: number): void {
    const el = this.typeScroll?.nativeElement;
    if (el) {
      el.scrollBy({ left: dir * 300, behavior: 'smooth' });
    }
  }

  limpiarFiltros(): void {
    this.fechaDesde = null;
    this.fechaHasta = null;
    this.documento = null;
    this.tipoInformeContrato = 'control-general-contrato';
    this.empresaAsociada = null;
    this.numeroContrato = '';
    this.trabajador = null;
    this.tipoCorteFiltro = null;
    this.selectedConstructoraId = null;
    this.selectedProyectoId = null;
    this.proyectosOptions = [];
    this.selectedCategoriaId = null;
    this.selectedInsumoCodigo = null;
    this.refreshInsumoOptions();
    this.costosBarrasChart = [];
    this.costosDonutChart = [];
    this.costosDonutSlices = [];
    this.canExport = false;
    this.generando = false;
    this.cleanupAfterPdfCapture();
    this.aplicarPlantillaVistaPrevia();
  }

  buscar(): void {
    if (this.selectedType === 'movements') {
      if (!this.validarDocumentoMovimiento()) {
        return;
      }
      this.cargarVistaPreviaMovimientos();
      return;
    }
    if (this.selectedType === 'cost-by-input') {
      this.cargarVistaPreviaCostosPorInsumo();
      return;
    }
    if (this.selectedType === 'production-plant') {
      this.previewColumns = [...COLUMNAS_POR_INFORME[this.selectedType]];
      this.previewRows = [];
      this.lastSearchAt = new Date();
      this.canExport = false;
      this.previewLoading = false;
      return;
    }
    if (this.selectedType === 'payment') {
      this.cargarVistaPreviaCartera();
      return;
    }
    if (this.selectedType === 'production-contract') {
      if (!this.tipoInformeContratoListo) {
        const label = this.labelDocumentoProduccion;
        void Swal.fire({
          icon: 'info',
          title: 'Próximamente',
          text: `El informe «${label}» estará disponible próximamente.`,
          confirmButtonColor: '#20506A',
        });
        return;
      }
      if (this.tipoInformeContrato === 'obras-activas') {
        this.cargarVistaPreviaObrasActivas();
        return;
      }
      if (!String(this.numeroContrato || '').trim()) {
        void Swal.fire({
          icon: 'warning',
          title: 'Contrato requerido',
          text: 'Seleccione un número de contrato para generar el Control General.',
          confirmButtonColor: '#20506A',
        });
        return;
      }
      this.cargarVistaPreviaProduccion();
    }
  }

  private toDateParam(d: Date | null): string | null {
    if (!d) {
      return null;
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  formatoDisplay(d: Date | null): string {
    if (!d) {
      return '';
    }
    const day = String(d.getDate()).padStart(2, '0');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const y = d.getFullYear();
    return `${day}/${m}/${y}`;
  }

  private buildFilterParams(): Record<string, string | null> {
    if (this.selectedType === 'production-contract') {
      return {
        numero_contrato: this.numeroContrato.trim() || null,
        tipo_informe: this.tipoInformeContrato,
        documento: 'CONTROL GENERAL CONTRATO',
        empresa_asociada: this.empresaAsociada,
      };
    }
    if (this.selectedType === 'payment') {
      return {
        numero_contrato: this.numeroContrato.trim() || null,
        empresa_asociada: this.empresaAsociada,
        fecha_desde: this.toDateParam(this.fechaDesde),
        fecha_hasta: this.toDateParam(this.fechaHasta),
        constructora: this.nombreConstructoraFiltroCartera(),
        proyecto: this.nombreProyectoFiltroCartera(),
      };
    }
    if (this.selectedType === 'cost-by-input') {
      return {
        fecha_desde: this.toDateParam(this.fechaDesde),
        fecha_hasta: this.toDateParam(this.fechaHasta),
        categoria_id:
          this.selectedCategoriaId != null
            ? String(this.selectedCategoriaId)
            : null,
        insumo_codigo: this.selectedInsumoCodigo,
        constructora: this.nombreConstructoraFiltroCartera(),
        proyecto: this.nombreProyectoFiltroCartera(),
      };
    }
    if (this.selectedType === 'movements') {
      // Constructora/proyecto se guardan por nombre en los documentos.
      return {
        fecha_desde: this.toDateParam(this.fechaDesde),
        fecha_hasta: this.toDateParam(this.fechaHasta),
        documento: this.documento,
        empresa_asociada: this.empresaAsociada,
        constructora: this.nombreConstructoraFiltroCartera(),
        proyecto: this.nombreProyectoFiltroCartera(),
        numero_contrato: this.numeroContrato.trim() || null,
        trabajador: this.trabajador,
      };
    }
    return {};
  }

  /** Movimientos: cada documento genera su propio informe; es obligatorio elegirlo. */
  private validarDocumentoMovimiento(): boolean {
    if (String(this.documento ?? '').trim()) {
      return true;
    }
    void Swal.fire({
      icon: 'warning',
      title: 'Documento requerido',
      text: 'Seleccione el Documento (p. ej. Remisiones) para generar el movimiento.',
      confirmButtonColor: '#20506A',
    });
    return false;
  }

  onDocumentoMovimientoChange(): void {
    this.canExport = false;
    this.aplicarPlantillaVistaPrevia();
  }

  private get nombreArchivoMovimiento(): string {
    const doc = String(this.documento ?? 'documento')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
    return `movimiento-${doc}.xlsx`;
  }

  private cargarVistaPreviaMovimientos(): void {
    this.previewLoading = true;
    this.canExport = false;
    this.reportsService.previewMovimientos(this.buildFilterParams()).subscribe({
      next: (res) => {
        this.previewLoading = false;
        this.previewColumns = res.data.columns || [];
        this.previewRows = res.data.rows || [];
        this.metaPreview = res.data.meta || {};
        this.lastSearchAt = new Date();
        this.canExport = this.previewRows.length > 0;
      },
      error: (e) => {
        this.previewLoading = false;
        this.canExport = false;
        this.aplicarPlantillaVistaPrevia();
        const msg = e?.error?.message || 'No se pudo cargar el movimiento.';
        void Swal.fire({
          icon: e?.status === 400 ? 'info' : 'error',
          title: e?.status === 400 ? 'Movimientos' : 'Error',
          text: msg,
          confirmButtonColor: '#20506A',
        });
      },
    });
  }

  private exportarMovimientoExcel(): void {
    if (!this.validarDocumentoMovimiento()) {
      return;
    }
    this.generando = true;
    this.cdr.detectChanges();
    this.reportsService.exportMovimientos(this.buildFilterParams()).subscribe({
      next: (blob) => {
        this.generando = false;
        this.downloadBlob(blob, this.nombreArchivoMovimiento);
      },
      error: (e) => {
        this.generando = false;
        void this.handleBlobError(e, 'exportar el movimiento a Excel');
      },
    });
  }

  private cargarVistaPreviaProduccion(): void {
    this.previewLoading = true;
    this.canExport = false;
    this.reportsService
      .previewProduccionPorContrato(this.buildFilterParams())
      .subscribe({
        next: (res) => {
          this.previewLoading = false;
          if (res.data) {
            // Filtro opcional por empresa asociada (validación post-SP)
            if (this.empresaAsociada) {
              const empContrato = String(
                (res.data.meta as { contrato?: { empresa_asociada?: unknown } })
                  ?.contrato?.empresa_asociada ?? ''
              ).trim();
              if (empContrato && empContrato !== String(this.empresaAsociada)) {
                this.previewColumns = [
                  ...COLUMNAS_POR_INFORME['production-contract'],
                ];
                this.previewRows = [];
                this.metaPreview = {};
                this.canExport = false;
                void Swal.fire({
                  icon: 'warning',
                  title: 'Sin coincidencia',
                  text: 'El contrato seleccionado no pertenece a la empresa asociada filtrada.',
                  confirmButtonColor: '#20506A',
                });
                return;
              }
            }
            this.previewColumns = [...COLUMNAS_POR_INFORME['production-contract']];
            this.previewRows = res.data.rows;
            this.metaPreview = res.data.meta || {};
            this.lastSearchAt = new Date();
            this.canExport = true;
          }
        },
        error: (e) => {
          this.previewLoading = false;
          this.canExport = false;
          this.aplicarPlantillaVistaPrevia();
          const msg = e?.error?.message || 'No se pudo cargar la vista previa.';
          void Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#20506A' });
        },
      });
  }

  private buildObrasActivasParams(): Record<string, string | null> {
    return {
      buscar: this.numeroContrato.trim() || null,
      empresa_asociada: this.empresaAsociada || null,
    };
  }

  private cargarVistaPreviaObrasActivas(): void {
    this.previewLoading = true;
    this.canExport = false;
    this.reportsService
      .previewObrasActivas(this.buildObrasActivasParams())
      .subscribe({
      next: (res) => {
        this.previewLoading = false;
        this.previewColumns = res.data.columns || [];
        this.previewRows = res.data.rows || [];
        this.metaPreview = res.data.meta || {};
        this.lastSearchAt = new Date();
        this.canExport = true;
      },
      error: (e) => {
        this.previewLoading = false;
        this.canExport = false;
        this.previewRows = [];
        this.metaPreview = {};
        const msg = e?.error?.message || 'No se pudo cargar el informe de obras activas.';
        void Swal.fire({
          icon: 'error',
          title: 'Error',
          text: msg,
          confirmButtonColor: '#20506A',
        });
      },
    });
  }

  nombreConstructoraFiltroCartera(): string | null {
    if (!this.selectedConstructoraId) {
      return null;
    }
    const o = this.constructorasOptions.find(
      (x) => x.value === this.selectedConstructoraId
    );
    return o?.label?.trim() ? o.label.trim() : null;
  }

  nombreProyectoFiltroCartera(): string | null {
    if (!this.selectedProyectoId) {
      return null;
    }
    const o = this.proyectosOptions.find(
      (x) => x.value === this.selectedProyectoId
    );
    return o?.label?.trim() ? o.label.trim() : null;
  }

  get labelEmpresaAsociadaCartera(): string {
    if (this.empresaAsociada == null || this.empresaAsociada === '') {
      return 'Todas';
    }
    const e = this.empresas.find((x) => x.value === this.empresaAsociada);
    return e?.label ?? String(this.empresaAsociada);
  }

  private cargarVistaPreviaCartera(): void {
    this.previewLoading = true;
    this.canExport = false;
    this.reportsService.previewCartera(this.buildFilterParams()).subscribe({
      next: (res) => {
        this.previewLoading = false;
        this.previewColumns = res.data.columns || [];
        this.previewRows = res.data.rows || [];
        this.metaPreview = res.data.meta || {};
        this.lastSearchAt = new Date();
        this.canExport = true;
      },
      error: (e) => {
        this.previewLoading = false;
        this.canExport = false;
        this.previewRows = [];
        this.metaPreview = {};
        const msg = e?.error?.message || 'No se pudo cargar la cartera.';
        void Swal.fire({
          icon: 'error',
          title: 'Error',
          text: msg,
          confirmButtonColor: '#20506A',
        });
      },
    });
  }

  private cargarVistaPreviaCostosPorInsumo(): void {
    this.previewLoading = true;
    this.canExport = false;
    this.costosBarrasChart = [];
    this.costosDonutChart = [];
    this.costosDonutSlices = [];
    this.reportsService.previewCostosPorInsumo(this.buildFilterParams()).subscribe({
      next: (res) => {
        this.previewLoading = false;
        this.previewColumns = res.data?.columns?.length
          ? res.data.columns
          : [...COLUMNAS_POR_INFORME['cost-by-input']];
        this.previewRows = res.data?.rows || [];
        this.metaPreview = res.data?.meta || {};
        this.refreshCostosBarrasChart();
        this.lastSearchAt = new Date();
        this.canExport = this.previewRows.length > 0;
        if (!this.previewRows.length) {
          void Swal.fire({
            icon: 'info',
            title: 'Sin datos',
            text: 'No se encontraron ítems con los filtros indicados.',
            confirmButtonColor: '#20506A',
          });
        }
      },
      error: (e) => {
        this.previewLoading = false;
        this.canExport = false;
        this.previewRows = [];
        this.metaPreview = {};
        this.costosBarrasChart = [];
        this.costosDonutChart = [];
        this.costosDonutSlices = [];
        const msg =
          e?.error?.message || 'No se pudo cargar costos por insumo.';
        void Swal.fire({
          icon: 'error',
          title: 'Error',
          text: msg,
          confirmButtonColor: '#20506A',
        });
      },
    });
  }

  /** Charts cacheados para preview/PDF (evita recrear en cada CD). */
  costosBarrasChart: Array<{
    label: string;
    valor: number;
    pct: number;
    color: string;
  }> = [];
  costosDonutChart: Array<{
    label: string;
    pct: number | null;
    valor: number | null;
    color: string;
    sin_dato?: boolean;
  }> = [];
  /** Rebanadas SVG del pastel (html2canvas no soporta conic-gradient). */
  costosDonutSlices: Array<{
    label: string;
    pct: number;
    valor: number;
    color: string;
    path: string;
  }> = [];

  /** Filas del PDF (tope para no congelar html2canvas). */
  private static readonly COSTOS_PDF_MAX_ROWS = 40;

  private get costosKpisMeta(): Record<string, unknown> {
    return (this.metaPreview?.['kpis'] as Record<string, unknown>) || {};
  }

  get costosKpiValorTotal(): string {
    const v = this.costosKpisMeta['valor_total_promedio'];
    return v == null || v === '' ? '—' : this.formatMoneyCOP(v);
  }

  get costosKpiMaterial(): string {
    const v = this.costosKpisMeta['costo_material_promedio'];
    return v == null || v === '' ? '—' : this.formatMoneyCOP(v);
  }

  get costosKpiMoFab(): string {
    const v = this.costosKpisMeta['mo_fabricacion_promedio'];
    return v == null || v === '' ? '—' : this.formatMoneyCOP(v);
  }

  get costosKpiMoInst(): string {
    const v = this.costosKpisMeta['mo_instalacion_promedio'];
    return v == null || v === '' ? '—' : this.formatMoneyCOP(v);
  }

  get costosKpiUtilidad(): string {
    const v = this.costosKpisMeta['utilidad_promedio'];
    return v == null || v === '' ? '—' : this.formatMoneyCOP(v);
  }

  get costosRangoFechasLabel(): string {
    const a = this.formatoDisplay(this.fechaDesde);
    const b = this.formatoDisplay(this.fechaHasta);
    if (a && b) return `${a} - ${b}`;
    if (a) return `Desde ${a}`;
    if (b) return `Hasta ${b}`;
    return 'Todas las fechas';
  }

  /** Filas incluidas en el template PDF (capadas). */
  get costosPdfRows(): Record<string, string | number | null>[] {
    return this.previewRows.slice(0, InformesComponent.COSTOS_PDF_MAX_ROWS);
  }

  get costosPdfTruncado(): boolean {
    return this.previewRows.length > InformesComponent.COSTOS_PDF_MAX_ROWS;
  }

  formatDonutLegendPct(
    slice: { pct: number | null; sin_dato?: boolean }
  ): string {
    if (slice.sin_dato || slice.pct == null) return '—';
    return `${slice.pct}%`;
  }

  private refreshCostosBarrasChart(): void {
    const charts = this.metaPreview?.['charts'] as
      | {
          barras_valor_unitario?: Array<{
            label: string;
            valor: number;
            pct?: number;
            color?: string;
          }>;
          donut_componentes?: Array<{
            label: string;
            pct: number | null;
            valor: number | null;
            color?: string;
            sin_dato?: boolean;
          }>;
          donut_slices?: Array<{
            label: string;
            pct: number;
            valor: number;
            color?: string;
          }>;
        }
      | undefined;
    const bars = charts?.barras_valor_unitario || [];
    const max = Math.max(...bars.map((b) => Number(b.valor) || 0), 1);
    this.costosBarrasChart = bars.map((b, i) => ({
      label: b.label,
      valor: Number(b.valor) || 0,
      pct: b.pct ?? Math.round(((Number(b.valor) || 0) / max) * 100),
      color: b.color || ['#1e3a5f', '#2e7d32', '#6a1b9a', '#ef6c00', '#c62828'][i % 5],
    }));
    this.costosDonutChart = (charts?.donut_componentes || []).map((d) => ({
      label: d.label,
      pct: d.pct == null ? null : Number(d.pct),
      valor: d.valor == null ? null : Number(d.valor),
      color: d.color || '#1e88e5',
      sin_dato: !!d.sin_dato || d.pct == null,
    }));
    this.costosDonutSlices = this.buildDonutSvgPaths(charts?.donut_slices || []);
  }

  /** Arcos SVG para pastel/dona (compatible con html2canvas / PDF). */
  private buildDonutSvgPaths(
    slices: Array<{ label: string; pct: number; valor: number; color?: string }>
  ): Array<{
    label: string;
    pct: number;
    valor: number;
    color: string;
    path: string;
  }> {
    const cx = 60;
    const cy = 60;
    const rOuter = 54;
    const rInner = 32;
    const total = slices.reduce((a, s) => a + (Number(s.pct) || 0), 0);
    if (!slices.length || total <= 0) {
      return [];
    }
    let angle = -Math.PI / 2;
    return slices.map((s, i) => {
      const pct = Number(s.pct) || 0;
      const sweep = (pct / total) * Math.PI * 2;
      const start = angle;
      const end = angle + sweep;
      angle = end;
      const large = sweep > Math.PI ? 1 : 0;
      const x1o = cx + rOuter * Math.cos(start);
      const y1o = cy + rOuter * Math.sin(start);
      const x2o = cx + rOuter * Math.cos(end);
      const y2o = cy + rOuter * Math.sin(end);
      const x1i = cx + rInner * Math.cos(end);
      const y1i = cy + rInner * Math.sin(end);
      const x2i = cx + rInner * Math.cos(start);
      const y2i = cy + rInner * Math.sin(start);
      const path =
        sweep >= Math.PI * 2 - 1e-6
          ? `M ${cx} ${cy - rOuter} A ${rOuter} ${rOuter} 0 1 1 ${cx - 0.01} ${cy - rOuter} A ${rOuter} ${rOuter} 0 1 1 ${cx} ${cy - rOuter} M ${cx} ${cy - rInner} A ${rInner} ${rInner} 0 1 0 ${cx - 0.01} ${cy - rInner} A ${rInner} ${rInner} 0 1 0 ${cx} ${cy - rInner} Z`
          : `M ${x1o} ${y1o} A ${rOuter} ${rOuter} 0 ${large} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${rInner} ${rInner} 0 ${large} 0 ${x2i} ${y2i} Z`;
      return {
        label: s.label,
        pct,
        valor: Number(s.valor) || 0,
        color: s.color || ['#90caf9', '#fb8c00', '#43a047', '#8e24aa'][i % 4],
        path,
      };
    });
  }

  /** Limpia estilos que html2pdf/html2canvas suelen dejar en body. */
  private cleanupAfterPdfCapture(): void {
    try {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('p-overflow-hidden');
    } catch {
      /* ignore */
    }
  }

  get costosFiltrosResumen(): string {
    const parts = [
      `Fechas: ${this.formatoDisplay(this.fechaDesde) || '—'} — ${this.formatoDisplay(this.fechaHasta) || '—'}`,
      `Categoría: ${
        this.categoriaOptions.find((c) => c.value === this.selectedCategoriaId)
          ?.label || 'Todos'
      }`,
      `Insumo: ${
        this.insumoOptions.find((i) => i.value === this.selectedInsumoCodigo)
          ?.label || 'Todos'
      }`,
      `Constructora: ${this.nombreConstructoraFiltroCartera() || 'Todas'}`,
      `Proyecto: ${this.nombreProyectoFiltroCartera() || 'Todos'}`,
    ];
    return parts.join(' · ');
  }

  private exportarCostosPorInsumoExcel(): void {
    this.generando = true;
    this.reportsService.exportCostosPorInsumo(this.buildFilterParams()).subscribe({
      next: (blob) => {
        this.generando = false;
        this.downloadBlob(blob, 'costos-por-insumo.xlsx');
      },
      error: (e) => {
        this.generando = false;
        void this.handleBlobError(e, 'exportar costos por insumo');
      },
    });
  }

  setFormato(fmt: 'xlsx' | 'pdf'): void {
    this.outputFormat = fmt;
  }

  generarInforme(): void {
    if (this.selectedType === 'movements') {
      if (this.canExport) {
        this.exportarMovimientoExcel();
      }
      return;
    }
    if (this.selectedType === 'cost-by-input') {
      if (!this.canExport) {
        return;
      }
      if (this.outputFormat === 'xlsx') {
        this.exportarCostosPorInsumoExcel();
        return;
      }
      // Usa la data ya cargada con Buscar (evitar re-fetch + canvas enorme).
      if (!this.previewRows.length) {
        void Swal.fire({
          icon: 'warning',
          title: 'Sin datos',
          text: 'Pulse Buscar antes de generar el PDF.',
          confirmButtonColor: '#20506A',
        });
        return;
      }
      this.generando = true;
      this.cdr.detectChanges();
      this.generarPdfCostosPorInsumo();
      return;
    }
    if (!this.canExport || (this.selectedType !== 'production-contract' && this.selectedType !== 'payment')) {
      if (this.selectedType !== 'production-contract' && this.selectedType !== 'payment') {
        void Swal.fire({
          icon: 'info',
          title: 'Próximamente',
          text: 'Este tipo de informe aún no genera archivo. Use Control General Contrato.',
          confirmButtonColor: '#20506A',
        });
      }
      return;
    }
    if (this.outputFormat === 'pdf') {
      this.generando = true;
      this.cdr.detectChanges();
      if (this.selectedType === 'production-contract') {
        if (this.tipoInformeContrato === 'obras-activas') {
          this.reportsService
            .previewObrasActivas(this.buildObrasActivasParams())
            .subscribe({
              next: (res) => {
                this.previewColumns = res.data.columns || [];
                this.previewRows = res.data.rows || [];
                this.metaPreview = res.data.meta || {};
                this.lastSearchAt = new Date();
                this.canExport = true;
                this.cdr.detectChanges();
                this.generarPdfObrasActivas();
              },
              error: (e) => {
                this.generando = false;
                const msg =
                  e?.error?.message || 'No se pudo cargar la información para el PDF.';
                void Swal.fire({
                  icon: 'error',
                  title: 'Error',
                  text: msg,
                  confirmButtonColor: '#20506A',
                });
              },
            });
        } else {
          // Asegurar data fresca (SP) y luego imprimir el template.
          this.reportsService
            .previewProduccionPorContrato(this.buildFilterParams())
            .subscribe({
              next: (res) => {
                this.previewColumns = [...COLUMNAS_POR_INFORME['production-contract']];
                this.previewRows = res.data.rows;
                this.metaPreview = res.data.meta || {};
                this.lastSearchAt = new Date();
                this.canExport = true;
                this.cdr.detectChanges();
                this.generarPdfProduccionContrato();
              },
              error: (e) => {
                this.generando = false;
                const msg =
                  e?.error?.message || 'No se pudo cargar la información para el PDF.';
                void Swal.fire({
                  icon: 'error',
                  title: 'Error',
                  text: msg,
                  confirmButtonColor: '#20506A',
                });
              },
            });
        }
        return;
      }
      if (this.selectedType === 'payment') {
        this.reportsService.previewCartera(this.buildFilterParams()).subscribe({
          next: (res) => {
            this.previewColumns = res.data.columns || [];
            this.previewRows = res.data.rows || [];
            this.metaPreview = res.data.meta || {};
            this.lastSearchAt = new Date();
            this.canExport = true;
            this.cdr.detectChanges();
            this.generarPdfCartera();
          },
          error: (e) => {
            this.generando = false;
            const msg =
              e?.error?.message || 'No se pudo cargar la información para el PDF.';
            void Swal.fire({
              icon: 'error',
              title: 'Error',
              text: msg,
              confirmButtonColor: '#20506A',
            });
          },
        });
      }
      return;
    }
    if (this.selectedType === 'payment') {
      this.generando = false;
      void Swal.fire({
        icon: 'info',
        title: 'Exportación',
        text: 'El informe de cartera está disponible en PDF. Seleccione PDF como formato de salida.',
        confirmButtonColor: '#20506A',
      });
      return;
    }
    if (
      this.selectedType === 'production-contract' &&
      this.tipoInformeContrato === 'obras-activas'
    ) {
      this.generando = false;
      void Swal.fire({
        icon: 'info',
        title: 'Próximamente',
        text: 'El Excel para «Obras Activas» se habilitará cuando el backend exponga la exportación. Use PDF por ahora.',
        confirmButtonColor: '#20506A',
      });
      return;
    }
    this.generando = true;
    this.cdr.detectChanges();
    this.reportsService
      .exportProduccionPorContrato(this.buildFilterParams(), 'xlsx')
      .subscribe({
        next: (blob) => {
          this.generando = false;
          const name = 'informe-control-general-contrato.xlsx';
          this.downloadBlob(blob, name);
        },
        error: (e) => {
          this.generando = false;
          void this.handleBlobError(e, 'exportar a Excel');
        },
      });
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private handleBlobError(e: unknown, action: string): void {
    const err = e as { error?: Blob; status?: number; message?: string };
    if (err?.error instanceof Blob) {
      err.error.text().then((text) => {
        let msg = text;
        try {
          const j = JSON.parse(text) as { message?: string };
          if (j?.message) {
            msg = j.message;
          }
        } catch {
          // usar texto
        }
        void Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#20506A' });
      });
      return;
    }
    void Swal.fire({
      icon: 'error',
      title: 'Error',
      text: err?.message || `No se pudo ${action}.`,
      confirmButtonColor: '#20506A',
    });
  }

  cancelar(): void {
    this.limpiarFiltros();
  }

  /**
   * Permite un ciclo de pintado antes de html2pdf (html2canvas bloquea el hilo principal).
   */
  private deferForUiPaint(fn: () => void): void {
    this.cdr.detectChanges();
    setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          fn();
        });
      });
    }, 32);
  }

  private generarPdfProduccionContrato(): void {
    const el = this.pdfContrato?.nativeElement;
    if (!el) {
      this.generando = false;
      void Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se encontró el contenido para generar el PDF.',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    const numeroContrato =
      String(this.contratoMeta?.['numero_contrato'] ?? this.numeroContrato ?? '')
        .trim() || 'CONTRATO';

    const options = {
      margin: 5,
      filename: `Informe_Produccion_Contrato_${numeroContrato}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: {
        unit: 'mm' as const,
        format: 'letter' as const,
        orientation: 'landscape' as const,
      },
    };

    // Fecha actual (consulta/generación)
    this.lastSearchAt = new Date();

    this.deferForUiPaint(() => {
      void html2pdf()
        .set(options)
        .from(el)
        .save()
        .finally(() => {
          this.generando = false;
          this.cdr.markForCheck();
        });
    });
  }

  /** Datos para tabla de Obras Activas (vía SP de cartera / endpoint dedicado). */
  get obrasActivasFilas(): Record<string, unknown>[] {
    return (this.previewRows as unknown as Record<string, unknown>[]) || [];
  }

  get obrasActivasGrupos(): { constructora: string; rows: Record<string, unknown>[] }[] {
    const groups = new Map<string, Record<string, unknown>[]>();
    for (const r of this.obrasActivasFilas || []) {
      const key = (String(r?.['constructora'] ?? '').trim() || 'CONSTRUCTORA');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    return Array.from(groups.entries()).map(([constructora, rows]) => ({
      constructora,
      rows,
    }));
  }

  private toNumber(value: unknown): number {
    const n = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  /** % ejecutado (entrega remisiones) acotado 0–100 para barra. */
  pctEjecutadoNum(value: unknown): number {
    const n = this.toNumber(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(100, Math.round(n * 100) / 100);
  }

  formatPctEjecutado(value: unknown): string {
    if (value == null || value === '') return '—';
    const n = this.pctEjecutadoNum(value);
    return `${n}%`;
  }

  get obrasActivasTotalSaldo(): string {
    const sum = (this.obrasActivasFilas || []).reduce(
      (acc, r) => acc + this.toNumber(r?.['saldo']),
      0
    );
    return this.formatMoneyCOP(sum);
  }

  private generarPdfObrasActivas(): void {
    const el = this.pdfObrasActivas?.nativeElement;
    if (!el) {
      this.generando = false;
      void Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se encontró el contenido para generar el PDF.',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    const options = {
      margin: 5,
      filename: `Informe_Obras_Activas.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: {
        unit: 'mm' as const,
        format: 'letter' as const,
        orientation: 'landscape' as const,
      },
    };

    this.lastSearchAt = new Date();
    this.deferForUiPaint(() => {
      void html2pdf()
        .set(options)
        .from(el)
        .save()
        .finally(() => {
          this.generando = false;
          this.cdr.markForCheck();
        });
    });
  }

  formatMoneyCOP(value: unknown): string {
    const n = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
    if (!Number.isFinite(n)) return '—';
    const fmt = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
    return `$ ${fmt.format(n)}`;
  }

  get carteraEmpresaLabel(): string {
    const emp = String(this.carteraEncabezado?.['empresa'] ?? '').trim();
    return emp ? `CONSTRUCTORA ${emp}` : 'CONSTRUCTORA';
  }

  get carteraProyectoLabel(): string {
    return String(this.carteraEncabezado?.['proyecto'] ?? '—');
  }

  get carteraNumeroContratoLabel(): string {
    return (String(this.carteraEncabezado?.['numero_contrato'] ?? (this.numeroContrato ?? '')).trim() || '—');
  }

  get carteraReteGarantia(): string {
    return this.formatMoneyCOP(this.carteraResumen?.['rete_garantia']);
  }

  get carteraSaldoContrato(): string {
    return this.formatMoneyCOP(this.carteraResumen?.['saldo_contrato']);
  }

  get carteraUltimoCorte(): string {
    const v = this.carteraResumen?.['ultimo_corte'];
    return v == null || v === '' ? '—' : String(v);
  }

  get carteraTotalFacturado(): string {
    return this.formatMoneyCOP(this.carteraResumen?.['total_facturado']);
  }

  get carteraTotalFacturacionTabla(): string {
    const sum = (this.carteraFacturacion || []).reduce((acc, r) => {
      const n = Number(String(r?.['valor'] ?? '').replace(/[^0-9.-]/g, ''));
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);
    return this.formatMoneyCOP(sum);
  }

  private generarPdfCartera(): void {
    const el = this.pdfCartera?.nativeElement;
    if (!el) {
      this.generando = false;
      void Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se encontró el contenido para generar el PDF.',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    const slug =
      this.numeroContrato.trim() ||
      this.carteraGruposMeta[0]?.constructora ||
      'CARTERA';
    const safe = String(slug).replace(/[^\w\-]+/g, '_').slice(0, 48);
    const options = {
      margin: 5,
      filename: `Informe_Cartera_${safe}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: {
        unit: 'mm' as const,
        format: 'letter' as const,
        orientation: 'landscape' as const,
      },
    };

    this.lastSearchAt = new Date();
    this.deferForUiPaint(() => {
      void html2pdf()
        .set(options)
        .from(el)
        .save()
        .finally(() => {
          this.generando = false;
          this.cdr.markForCheck();
        });
    });
  }

  private generarPdfCostosPorInsumo(): void {
    const el = this.pdfCostosInsumo?.nativeElement;
    if (!el) {
      this.generando = false;
      void Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se encontró el contenido para generar el PDF. Vuelva a seleccionar Costos por insumo e intente de nuevo.',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    // El sandbox usa width/height 0; html2canvas se cuelga con tablas grandes.
    const sandbox = el.closest('.inf-pdf-sandbox') as HTMLElement | null;
    const prevSandbox = sandbox
      ? {
          width: sandbox.style.width,
          height: sandbox.style.height,
          overflow: sandbox.style.overflow,
          left: sandbox.style.left,
        }
      : null;
    if (sandbox) {
      sandbox.style.width = 'auto';
      sandbox.style.height = 'auto';
      sandbox.style.overflow = 'visible';
      sandbox.style.left = '-12000px';
    }

    const options = {
      margin: [6, 6, 6, 6] as [number, number, number, number],
      filename: 'Analisis_Costos_Por_Insumo.pdf',
      image: { type: 'jpeg' as const, quality: 0.92 },
      html2canvas: {
        scale: 1.2,
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        backgroundColor: '#ffffff',
      },
      jsPDF: {
        unit: 'mm' as const,
        format: 'letter' as const,
        orientation: 'landscape' as const,
      },
      pagebreak: { mode: ['css', 'legacy'] as const },
    };

    this.lastSearchAt = new Date();

    const safetyMs = 45000;
    const safetyTimer = window.setTimeout(() => {
      if (!this.generando) return;
      this.restorePdfSandbox(sandbox, prevSandbox);
      this.cleanupAfterPdfCapture();
      this.generando = false;
      this.cdr.markForCheck();
      void Swal.fire({
        icon: 'warning',
        title: 'PDF cancelado',
        text: 'La generación tardó demasiado y se detuvo para no bloquear el sistema. Use Excel o filtre por constructora/proyecto.',
        confirmButtonColor: '#20506A',
      });
    }, safetyMs);

    this.deferForUiPaint(() => {
      void html2pdf()
        .set(options)
        .from(el)
        .save()
        .catch((err: unknown) => {
          console.error('PDF costos por insumo:', err);
          void Swal.fire({
            icon: 'error',
            title: 'Error al generar PDF',
            text: 'No se pudo generar el informe gráfico. Intente de nuevo o exporte a Excel.',
            confirmButtonColor: '#20506A',
          });
        })
        .finally(() => {
          window.clearTimeout(safetyTimer);
          this.restorePdfSandbox(sandbox, prevSandbox);
          this.cleanupAfterPdfCapture();
          this.generando = false;
          this.cdr.markForCheck();
        });
    });
  }

  private restorePdfSandbox(
    sandbox: HTMLElement | null,
    prev: {
      width: string;
      height: string;
      overflow: string;
      left: string;
    } | null
  ): void {
    if (!sandbox || !prev) return;
    sandbox.style.width = prev.width;
    sandbox.style.height = prev.height;
    sandbox.style.overflow = prev.overflow;
    sandbox.style.left = prev.left;
  }

  get estadoActualGeneral(): string {
    const estados = (this.previewRows || [])
      .map((r) => String(r?.['estado'] ?? '').trim())
      .filter(Boolean);
    if (!estados.length) return '—';
    const order = ['Excedido', 'En proceso', 'Pendiente', 'Completado'];
    for (const s of order) {
      if (estados.includes(s)) return s;
    }
    return estados[0] || '—';
  }

  get estadoContratoEtiqueta(): string {
    const raw = String(this.contratoMeta?.['estado'] ?? '').trim().toLowerCase();
    if (!raw) return '—';
    if (raw.includes('activo')) return 'Activo';
    if (raw.includes('final')) return 'Finalizado';
    if (raw.includes('cerr')) return 'Finalizado';
    return String(this.contratoMeta?.['estado'] ?? '—');
  }
}
