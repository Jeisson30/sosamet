import {
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

import Swal from 'sweetalert2';

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
  ],
  templateUrl: './informes.component.html',
  styleUrls: ['./informes.component.scss'],
})
export class InformesComponent implements OnInit {
  @ViewChild('typeScroll') typeScroll?: ElementRef<HTMLDivElement>;

  reportTypes: ReportTypeCard[] = [
    {
      id: 'payment',
      title: 'INFORME DE PAGOS',
      description:
        'Por contrato y constructoras: anticipos, actas, retegarantías, saldo, pago y avance de obra.',
      icon: 'pi pi-wallet',
    },
    {
      id: 'production-contract',
      title: 'PRODUCCIÓN POR CONTRATO',
      description:
        'Elementos contratados, fabricados, entregados y adicionales.',
      icon: 'pi pi-briefcase',
    },
    {
      id: 'production-plant',
      title: 'PRODUCCIÓN PLANTA Y OBRAS',
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
  empresaAsociada: string | null = null;
  empresas: EmpresaOption[] = [{ label: 'Todas', value: null }];
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
    const map: Record<ReportTypeId, string> = {
      payment: 'INFORME DE PAGOS (por contrato y constructoras)',
      'production-contract': 'INFORME DE PRODUCCIÓN POR CONTRATO',
      'production-plant': 'INFORME DE PRODUCCIÓN – PLANTA Y OBRAS',
      movements: 'MOVIMIENTO GENERAL',
    };
    return map[this.selectedType] ?? 'INFORME';
  }

  get subtituloDocumentoSpec(): string {
    return INFORME_SUBTITULO[this.selectedType] ?? '';
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

  private getVistaPreviaBranding(): { logo: string; nombre: string } {
    if (this.selectedType === 'movements' && this.empresaAsociada) {
      return (
        this.empresaDetalle.get(String(this.empresaAsociada)) ?? {
          logo: 'assets/images/logo.png',
          nombre: 'Empresa asociada',
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
      return {
        logo: 'assets/images/logo_principal.png',
        nombre: 'SOSAMET SAS',
      };
    }
    return { logo: 'assets/images/logo.png', nombre: '' };
  }

  get usuarioTexto(): string {
    return localStorage.getItem('nombreUsuario') ?? 'Usuario';
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
    private reportsService: ReportsService
  ) {}

  ngOnInit(): void {
    this.loadDocumentTypes();
    this.loadEmpresas();
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
          logo: 'assets/images/logo_principal.png',
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

  private logoForEmpresaId(id: string): string {
    if (id === '1') {
      return 'assets/images/logo_principal.png';
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
    this.selectedType = id;
    this.canExport = false;
    this.aplicarPlantillaVistaPrevia();
  }

  /**
   * Columnas fijas según CONSULTAS GENERAL (PDF). Filas vacías hasta SP / API.
   */
  private aplicarPlantillaVistaPrevia(): void {
    this.previewColumns = [...COLUMNAS_POR_INFORME[this.selectedType]];
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
    this.empresaAsociada = null;
    this.numeroContrato = '';
    this.trabajador = null;
    this.tipoCorteFiltro = null;
    this.selectedConstructoraId = null;
    this.selectedProyectoId = null;
    this.proyectosOptions = [];
    this.canExport = false;
    this.aplicarPlantillaVistaPrevia();
  }

  buscar(): void {
    if (
      this.selectedType === 'movements' ||
      this.selectedType === 'payment' ||
      this.selectedType === 'production-plant'
    ) {
      this.previewColumns = [...COLUMNAS_POR_INFORME[this.selectedType]];
      this.previewRows = [];
      this.lastSearchAt = new Date();
      this.canExport = false;
      this.previewLoading = false;
      return;
    }
    if (this.selectedType === 'production-contract') {
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

  private formatoDisplay(d: Date | null): string {
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
        documento: this.documento,
        tipo_corte: this.tipoCorteFiltro,
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

  setFormato(fmt: 'xlsx' | 'pdf'): void {
    this.outputFormat = fmt;
  }

  generarInforme(): void {
    if (!this.canExport || this.selectedType !== 'production-contract') {
      if (this.selectedType !== 'production-contract') {
        void Swal.fire({
          icon: 'info',
          title: 'Próximamente',
          text: 'Conectar el API/SP. Solo «Producción por contrato» genera Excel en esta fase.',
          confirmButtonColor: '#20506A',
        });
      }
      return;
    }
    if (this.outputFormat === 'pdf') {
      void Swal.fire({
        icon: 'info',
        title: 'Próximamente',
        text: 'La exportación a PDF se habilitará cuando se defina en el API.',
        confirmButtonColor: '#20506A',
      });
      return;
    }
    this.generando = true;
    this.reportsService
      .exportProduccionPorContrato(this.buildFilterParams(), 'xlsx')
      .subscribe({
        next: (blob) => {
          this.generando = false;
          this.downloadBlob(blob, 'informe-produccion-por-contrato.xlsx');
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
}
