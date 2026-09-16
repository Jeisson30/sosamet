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
  /** Contabilidad: solo informe Finanzas (`payment`). */
  private readonly PERFIL_CONTABILIDAD = 10;

  @ViewChild('typeScroll') typeScroll?: ElementRef<HTMLDivElement>;
  @ViewChild('pdfContrato') pdfContrato?: ElementRef<HTMLDivElement>;
  @ViewChild('pdfCartera') pdfCartera?: ElementRef<HTMLDivElement>;
  @ViewChild('pdfObrasActivas') pdfObrasActivas?: ElementRef<HTMLDivElement>;

  reportTypes: ReportTypeCard[] = [
    {
      id: 'payment',
      title: 'FINANZAS',
      description:
        'Por contrato y constructoras: anticipos, actas, retegarantías, saldo, pago y avance de obra.',
      icon: 'pi pi-wallet',
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

  /** Perfil contabilidad: únicamente tipo Finanzas. */
  get esContabilidadSoloFinanzas(): boolean {
    return Number(localStorage.getItem('id_perfil')) === this.PERFIL_CONTABILIDAD;
  }

  informeTipoHabilitado(id: ReportTypeId): boolean {
    if (!this.esContabilidadSoloFinanzas) {
      return true;
    }
    return id === 'payment';
  }

  get rangoFechasTexto(): string {
    if (this.selectedType !== 'movements') {
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
        this.selectedType === 'payment') &&
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
    return this.empresaDetalle.get(id)?.nombre ?? (id === '2' ? 'HS' : 'SOSAMET SAS');
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
    return id;
  }

  /** Celda de vista previa: formatea Obras Activas e Insumo (código - nombre). */
  formatPreviewCell(
    field: string,
    value: unknown,
    row?: Record<string, string | number | null>
  ): string {
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
    if (this.esContabilidadSoloFinanzas) {
      this.selectedType = 'payment';
    }
    this.loadDocumentTypes();
    this.loadEmpresas();
    this.loadContratos();
    this.loadConstructoras();
    this.loadTrabajadoresGestion();
    this.aplicarPlantillaVistaPrevia();
  }

  private loadDocumentTypes(): void {
    this.contractsService.getTypeContract().subscribe({
      next: (list: ContractTypeResponse[]) => {
        this.documentoOptions = [
          { label: 'Todos', value: null },
          ...list
            .filter((t) => t?.tipo_doc)
            .map((t) => ({
              label: String(t.tipo_doc).toUpperCase(),
              value: t.tipo_doc,
            })),
        ];
      },
      error: () => {
        this.documentoOptions = [{ label: 'Todos', value: null }];
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
    this.canExport = false;
    this.generando = false;
    this.aplicarPlantillaVistaPrevia();
  }

  buscar(): void {
    if (
      this.selectedType === 'movements' ||
      this.selectedType === 'production-plant'
    ) {
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
    if (this.selectedType === 'movements') {
      return {
        fecha_desde: this.toDateParam(this.fechaDesde),
        fecha_hasta: this.toDateParam(this.fechaHasta),
        documento: this.documento,
        empresa_asociada: this.empresaAsociada,
        constructora: this.selectedConstructoraId,
        proyecto: this.selectedProyectoId,
        numero_contrato: this.numeroContrato.trim() || null,
        trabajador: this.trabajador,
      };
    }
    return {};
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

  setFormato(fmt: 'xlsx' | 'pdf'): void {
    this.outputFormat = fmt;
  }

  generarInforme(): void {
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
