import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';

import { ContractsService } from '../../shared/service/contracts.service';
import { ContractFullResponse } from '../../shared/interfaces/Response.interface';
import { ContractDetalleLineJson, UpdateContractFullRequest } from '../../shared/interfaces/Request.interface';
import { CatalogService, ConstructoraDto, ProyectoDto } from '../../../../shared/services/catalog.service';
import { GestionService } from '../../../gestion/shared/service/gestion.service';
import { GestionUser } from '../../../gestion/shared/interfaces/Response.interface';
import { TIPO_CONTRATO_DOCUMENTO_OPTIONS } from '../../shared/constants/tipo-contrato.constants';

interface EmpresaOption {
  label: string;
  value: string | null;
}

interface EstadoContratoOption {
  label: string;
  value: string | null;
}

@Component({
  selector: 'app-contracts-consult',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    DropdownModule,
    CalendarModule,
    TableModule,
    ButtonModule,
    DialogModule,
    MenuModule,
  ],
  templateUrl: './contracts-consult.component.html',
  styleUrls: ['./contracts-consult.component.scss'],
})
export class ContractsConsultComponent implements OnInit {
  buscar: string = '';
  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;
  /** Filtro SP: null = todos. */
  estado: string | null = null;
  estadosContratoFiltro: EstadoContratoOption[] = [
    { label: 'Todos', value: null },
    { label: 'Activo', value: 'Activo' },
    { label: 'Finalizado', value: 'Finalizado' },
    { label: 'Anulado', value: 'Anulado' },
  ];
  estadosContratoEdicion: { label: string; value: string }[] = [
    { label: 'Activo', value: 'Activo' },
    { label: 'Finalizado', value: 'Finalizado' },
  ];
  tipoContratoOptions: { label: string; value: string }[] = [
    { label: 'Suministro', value: 'Suministro' },
    { label: 'Instalación', value: 'Instalación' },
    { label: 'Suministro e Instalación', value: 'Suministro e Instalación' },
  ];
  /** Contrato / Cotizacion / Oferta… (catálogo N° documento). */
  tipoDocumentoOptions = TIPO_CONTRATO_DOCUMENTO_OPTIONS;
  numeroDocumentoOptions: { label: string; value: string }[] = [];
  loadingNumeroDocumento = false;
  empresaAsociada: string | null = null;

  empresas: EmpresaOption[] = [];
  empresasSoloSeleccion: EmpresaOption[] = [];
  private empresaMap = new Map<string, string>();

  constructorasOptions: { label: string; value: string }[] = [];
  proyectosOptions: { label: string; value: string }[] = [];
  selectedConstructoraId: string | null = null;
  selectedProyectoId: string | null = null;

  constructorasEditOptions: { label: string; value: string }[] = [];
  proyectosEditOptions: { label: string; value: string }[] = [];
  selectedEditConstructoraId: string | null = null;
  selectedEditProyectoId: string | null = null;

  workUsers: GestionUser[] = [];
  loadingUsers = false;
  selectedEditEncargadoId: number | null = null;

  private rawResults: ContractFullResponse[] = [];
  results: ContractFullResponse[] = [];
  loading = false;

  rowsPerPage = 10;
  rowsPerPageOptions = [10, 25, 50, 100];

  detailVisible = false;
  editMode = false;
  selectedHeader: ContractFullResponse | null = null;
  selectedItems: ContractFullResponse[] = [];

  editableHeader: ContractFullResponse | null = null;
  editableItems: ContractFullResponse[] = [];

  rowMenuItems: MenuItem[] = [];
  private menuRow: ContractFullResponse | null = null;

  get puedeEditarContrato(): boolean {
    return Number(localStorage.getItem('id_perfil')) === 1;
  }

  /** Campos editables solo en modo edición, admin y no anulado. */
  get canEditFields(): boolean {
    return (
      this.editMode &&
      this.puedeEditarContrato &&
      !this.isAnulado(this.editableHeader)
    );
  }

  constructor(
    private contractsService: ContractsService,
    private catalogService: CatalogService,
    private gestionService: GestionService
  ) {}

  ngOnInit(): void {
    this.loadEmpresas();
    this.loadConstructorasCatalog();
    this.loadWorkUsers();
    this.loadNumeroDocumentoOptions();
  }

  private normalizeText(value: unknown): string {
    return String(value ?? '')
      .trim()
      .toLowerCase();
  }

  private loadEmpresas(): void {
    this.contractsService.getCompanies().subscribe({
      next: (companies) => {
        this.empresas = [
          { label: 'Todas', value: null },
          ...companies.map((c: any) => ({
            label: c.nombre_empresa,
            value: String(c.id),
          })),
        ];

        this.empresasSoloSeleccion = this.empresas.filter((e) => e.value !== null);

        this.empresaMap.clear();
        companies.forEach((c: any) => {
          this.empresaMap.set(String(c.id), c.nombre_empresa);
        });
        this.empresaMap.set('1', 'SOSAMET SAS');
        this.empresaMap.set('2', 'HIERROS Y SERVICIOS SAS');
      },
      error: () => {
        this.empresas = [{ label: 'Todas', value: null }];
      },
    });
  }

  private loadConstructorasCatalog(): void {
    this.catalogService.getConstructoras().subscribe({
      next: (list: ConstructoraDto[]) => {
        const mapped = list.map((c) => ({
          label: c.nombre,
          value: String(c.id),
        }));
        this.constructorasOptions = mapped;
        this.constructorasEditOptions = mapped;
        if (this.detailVisible && this.editableHeader) {
          this.syncEditConstructoraYProyecto();
        }
      },
      error: () => {
        this.constructorasOptions = [];
        this.constructorasEditOptions = [];
      },
    });
  }

  empresaDisplay(value: string | null): string {
    if (!value) return '';
    const key = String(value).trim();
    if (this.empresaMap.has(key)) return this.empresaMap.get(key) || '';
    if (key === '1') return 'SOSAMET SAS';
    if (key === '2') return 'HIERROS Y SERVICIOS SAS';
    return key;
  }

  private formatDate(date: Date | null): string | null {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private contractKey(row: ContractFullResponse): string {
    return String(row.numerodoc ?? '');
  }

  private groupByContract(data: ContractFullResponse[]): ContractFullResponse[] {
    const map = new Map<string, ContractFullResponse>();
    data.forEach((row) => {
      const key = this.contractKey(row);
      if (key && !map.has(key)) map.set(key, row);
    });
    return Array.from(map.values());
  }

  /** Más reciente primero por fecha_inicio. */
  private sortByFechaInicioDesc(
    rows: ContractFullResponse[]
  ): ContractFullResponse[] {
    return [...rows].sort((a, b) => {
      const ta = this.parseFechaInicioMs(a.fecha_inicio);
      const tb = this.parseFechaInicioMs(b.fecha_inicio);
      return tb - ta;
    });
  }

  private parseFechaInicioMs(value: string | null | undefined): number {
    if (!value) return 0;
    const gmtIdx = value.indexOf('GMT');
    const slice = gmtIdx > 0 ? value.substring(0, gmtIdx).trim() : String(value).trim();
    const d = new Date(slice);
    if (!isNaN(d.getTime())) return d.getTime();
    // dd/mm/yyyy o yyyy-mm-dd
    const m = slice.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      const day = Number(m[1]);
      const month = Number(m[2]) - 1;
      const year = Number(m[3]);
      const parsed = new Date(year, month, day).getTime();
      return Number.isFinite(parsed) ? parsed : 0;
    }
    const iso = slice.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      const parsed = new Date(
        Number(iso[1]),
        Number(iso[2]) - 1,
        Number(iso[3])
      ).getTime();
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  onConstructoraFilterChange(id: string | null): void {
    this.selectedConstructoraId = id;
    this.selectedProyectoId = null;
    this.proyectosOptions = [];

    if (!id) return;

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

  onProyectoFilterChange(id: string | null): void {
    this.selectedProyectoId = id;
  }

  proyectoNombreFiltro(): string {
    return this.proyectosOptions.find((p) => p.value === this.selectedProyectoId)?.label ?? '';
  }

  constructoraNombreFiltro(): string {
    return this.constructorasOptions.find((c) => c.value === this.selectedConstructoraId)?.label ?? '';
  }

  private syncEditConstructoraYProyecto(): void {
    if (!this.editableHeader) {
      this.selectedEditConstructoraId = null;
      this.selectedEditProyectoId = null;
      this.proyectosEditOptions = [];
      return;
    }

    const currentConstructora = this.normalizeText(this.editableHeader.empresa);
    const cons = this.constructorasEditOptions.find(
      (c) => this.normalizeText(c.label) === currentConstructora
    );
    this.selectedEditConstructoraId = cons?.value ?? null;

    if (!this.selectedEditConstructoraId) {
      this.proyectosEditOptions = [];
      this.selectedEditProyectoId = null;
      return;
    }

    this.onConstructoraEditChange(this.selectedEditConstructoraId, false);
  }

  onConstructoraEditChange(id: string | null, resetProyecto: boolean = true): void {
    this.selectedEditConstructoraId = id;
    this.selectedEditProyectoId = null;
    this.proyectosEditOptions = [];

    if (!this.editableHeader) return;

    if (!id) {
      this.editableHeader.empresa = '';
      this.editableHeader.proyecto = '';
      return;
    }

    const cons = this.constructorasEditOptions.find((c) => c.value === id);
    this.editableHeader.empresa = cons?.label ?? '';

    this.catalogService.getProyectosByConstructora(id).subscribe({
      next: (list: ProyectoDto[]) => {
        this.proyectosEditOptions = list.map((p) => ({
          label: p.nombre,
          value: String(p.id),
        }));

        if (!resetProyecto) {
          const currentProyecto = this.normalizeText(this.editableHeader!.proyecto);
          const match = this.proyectosEditOptions.find(
            (p) => this.normalizeText(p.label) === currentProyecto
          );
          if (match) this.selectedEditProyectoId = match.value;
        }
      },
      error: () => {
        this.proyectosEditOptions = [];
      },
    });
  }

  onProyectoEditChange(id: string | null): void {
    this.selectedEditProyectoId = id;
    if (!this.editableHeader) return;
    this.editableHeader.proyecto =
      this.proyectosEditOptions.find((p) => p.value === id)?.label ?? '';
  }

  onBuscar(): void {
    this.loading = true;
    this.contractsService
      .consultContractsFull({
        buscar: this.buscar?.trim() || null,
        estado: this.estado,
        fecha_desde: this.formatDate(this.fechaDesde),
        fecha_hasta: this.formatDate(this.fechaHasta),
        empresa_asociada: this.empresaAsociada,
        constructora: this.constructoraNombreFiltro()?.trim() || null,
        proyecto: this.proyectoNombreFiltro()?.trim() || null,
      })
      .subscribe({
        next: (res) => {
          this.rawResults = res.data || [];
          this.results = this.sortByFechaInicioDesc(
            this.groupByContract(this.rawResults)
          );
          this.loading = false;
        },
        error: () => {
          this.rawResults = [];
          this.results = [];
          this.loading = false;
        },
      });
  }

  onLimpiar(): void {
    this.buscar = '';
    this.fechaDesde = null;
    this.fechaHasta = null;
    this.estado = null;
    this.empresaAsociada = null;
    this.selectedConstructoraId = null;
    this.selectedProyectoId = null;
    this.proyectosOptions = [];
    this.rawResults = [];
    this.results = [];
  }

  formatDateForDisplay(value: string | null): string {
    return this.toDdMmYyyy(value) || '';
  }

  /** Normaliza cualquier fecha de consulta a DD/MM/AAAA. */
  private toDdMmYyyy(value: string | null | undefined): string {
    if (value == null || String(value).trim() === '') return '';
    const raw = String(value).trim();
    const already = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (already) return raw;

    const gmtIdx = raw.indexOf('GMT');
    const slice = gmtIdx > 0 ? raw.substring(0, gmtIdx).trim() : raw;
    const d = new Date(slice);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = String(d.getFullYear());
      return `${day}/${month}/${year}`;
    }

    const iso = slice.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

    const dmy = slice.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmy) {
      return `${dmy[1].padStart(2, '0')}/${dmy[2].padStart(2, '0')}/${dmy[3]}`;
    }
    return raw;
  }

  private formatMoneyCop(value: unknown): string {
    if (value == null || String(value).trim() === '') return '';
    const n = this.parseMoneyNumber(value);
    if (!Number.isFinite(n)) return String(value);
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
  }

  private parseMoneyNumber(value: unknown): number {
    let s = String(value ?? '').trim();
    if (!s) return NaN;
    s = s.replace(/[$\s]/g, '');
    // $ 1.234.567,89 → 1234567.89
    if (s.includes(',') && s.includes('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
      s = s.replace(',', '.');
    } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, '');
    }
    return Number(s);
  }

  private moneyToRaw(value: unknown): string | null {
    if (value == null || String(value).trim() === '') return null;
    const n = this.parseMoneyNumber(value);
    if (!Number.isFinite(n)) return String(value).trim();
    return String(n);
  }

  private loadNumeroDocumentoOptions(): void {
    this.loadingNumeroDocumento = true;
    this.contractsService.consultarContratos().subscribe({
      next: (res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.numeroDocumentoOptions = list
          .map((c) => {
            const value = String(c.value || c.numero_contrato || '').trim();
            const label = String(c.label || value).trim();
            return value ? { label: label || value, value } : null;
          })
          .filter((x): x is { label: string; value: string } => !!x);
        this.loadingNumeroDocumento = false;
      },
      error: () => {
        this.numeroDocumentoOptions = [];
        this.loadingNumeroDocumento = false;
      },
    });
  }

  /** Ajusta cabecera/ítems al abrir ver/editar (fechas, dinero, tipo documento). */
  private prepareEditableSnapshot(row: ContractFullResponse): ContractFullResponse {
    const h: ContractFullResponse = { ...row };

    // Si tipo_doc_catalogo trae Suministro/Instalación (legado), pasar a tipo_contrato.
    const catalogo = String(h.tipo_doc_catalogo ?? '').trim();
    const esTipoContratoServicio = this.tipoContratoOptions.some(
      (o) => o.value.toLowerCase() === catalogo.toLowerCase()
    );
    if (esTipoContratoServicio) {
      if (!String(h.tipo_contrato ?? '').trim()) {
        h.tipo_contrato = catalogo;
      }
      h.tipo_doc_catalogo = 'Contrato';
    } else if (!catalogo) {
      h.tipo_doc_catalogo = 'Contrato';
    }

    h.fecha_inicio = this.toDdMmYyyy(h.fecha_inicio) || null;
    h.fecha_fin = this.toDdMmYyyy(h.fecha_fin) || null;

    h.valor_anticipo = this.formatMoneyCop(h.valor_anticipo) || null;
    h.valor_r_garantia = this.formatMoneyCop(h.valor_r_garantia) || null;
    h.valor_polizas_in = this.formatMoneyCop(h.valor_polizas_in) || null;
    h.valor_polizas_fin = this.formatMoneyCop(h.valor_polizas_fin) || null;
    h.valor_contrato = this.formatMoneyCop(h.valor_contrato) || null;

    return h;
  }

  private prepareEditableItem(it: ContractFullResponse): ContractFullResponse {
    return {
      ...it,
      valor_base: this.formatMoneyCop(it.valor_base) || null,
      vr_adm: this.formatMoneyCop(it.vr_adm) || null,
      vr_imp: this.formatMoneyCop(it.vr_imp) || null,
      vr_ut: this.formatMoneyCop(it.vr_ut) || null,
      vr_iva: this.formatMoneyCop(it.vr_iva) || null,
      vr_total: this.formatMoneyCop(it.vr_total) || null,
    };
  }

  onAbrir(row: ContractFullResponse): void {
    this.openDetail(row, false);
  }

  isAnulado(row: ContractFullResponse | null | undefined): boolean {
    return (
      String(row?.estado ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') === 'anulado'
    );
  }

  private openDetail(row: ContractFullResponse, edit: boolean): void {
    const key = this.contractKey(row);
    this.selectedHeader = row;
    this.selectedItems = this.rawResults.filter(
      (item) => this.contractKey(item) === key
    );
    this.editableHeader = this.prepareEditableSnapshot(row);
    this.editableItems = this.selectedItems.map((i) => this.prepareEditableItem(i));
    this.ensureNumeroDocumentoOption(this.editableHeader.numero_contrato);
    this.editMode = edit && !this.isAnulado(row);
    this.syncEditConstructoraYProyecto();
    this.syncEditEncargado();
    this.detailVisible = true;
  }

  /** Si el N° actual no está en la lista, lo agrega para que el dropdown lo muestre. */
  private ensureNumeroDocumentoOption(numero: string | null | undefined): void {
    const value = String(numero ?? '').trim();
    if (!value) return;
    const exists = this.numeroDocumentoOptions.some((o) => o.value === value);
    if (!exists) {
      this.numeroDocumentoOptions = [
        { label: value, value },
        ...this.numeroDocumentoOptions,
      ];
    }
  }

  onVer(row: ContractFullResponse): void {
    this.openDetail(row, false);
  }

  onEditar(row: ContractFullResponse): void {
    if (this.isAnulado(row)) {
      Swal.fire(
        'Contrato anulado',
        'No se puede editar un contrato anulado.',
        'warning'
      );
      return;
    }
    if (!this.puedeEditarContrato) {
      Swal.fire(
        'Sin permiso',
        'Solo un administrador puede editar contratos.',
        'warning'
      );
      return;
    }
    this.openDetail(row, true);
  }

  openRowMenu(
    event: Event,
    menu: { toggle: (e: Event) => void },
    row: ContractFullResponse
  ): void {
    if (!this.puedeEditarContrato) {
      Swal.fire(
        'Sin permiso',
        'Solo un administrador puede usar estas opciones.',
        'warning'
      );
      return;
    }
    this.menuRow = row;
    const anulado = this.isAnulado(row);
    this.rowMenuItems = [
      {
        label: 'Editar',
        icon: 'pi pi-pencil',
        disabled: anulado,
        command: () => this.menuRow && this.onEditar(this.menuRow),
      },
      {
        label: 'Eliminar',
        icon: 'pi pi-trash',
        command: () => this.menuRow && this.onEliminar(this.menuRow),
      },
      {
        label: 'Anular',
        icon: 'pi pi-ban',
        disabled: anulado,
        command: () => this.menuRow && this.onAnular(this.menuRow),
      },
    ];
    menu.toggle(event);
  }

  onEliminar(row: ContractFullResponse): void {
    if (!this.puedeEditarContrato) {
      Swal.fire(
        'Sin permiso',
        'Solo un administrador puede eliminar contratos.',
        'warning'
      );
      return;
    }
    const numerodoc = String(row.numerodoc || '').trim();
    if (!numerodoc) {
      Swal.fire('Atención', 'No se encontró el número de documento.', 'warning');
      return;
    }

    Swal.fire({
      icon: 'warning',
      title: 'Eliminar contrato',
      html: `
        <p>Se eliminará el contrato <strong>${numerodoc}</strong>.</p>
        <p>Se borrarán cabecera y detalle (AIU / IVA).</p>
        <p>Esta operación es <strong>irreversible</strong>.</p>
        <p>¿Está seguro de continuar?</p>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c0392b',
      cancelButtonColor: '#6c757d',
      reverseButtons: true,
    }).then((result) => {
      if (!result.isConfirmed) return;
      Swal.fire({
        title: 'Eliminando...',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(null),
      });
      this.contractsService.deleteContrato(numerodoc).subscribe({
        next: (res) => {
          Swal.fire(
            'Eliminado',
            res?.mensaje || 'Contrato eliminado correctamente.',
            'success'
          );
          this.onCerrarDetalle();
          this.onBuscar();
        },
        error: (err) => {
          Swal.fire(
            'Error',
            err?.error?.error || 'No se pudo eliminar el contrato.',
            'error'
          );
        },
      });
    });
  }

  onAnular(row: ContractFullResponse): void {
    if (!this.puedeEditarContrato) {
      Swal.fire(
        'Sin permiso',
        'Solo un administrador puede anular contratos.',
        'warning'
      );
      return;
    }
    if (this.isAnulado(row)) {
      Swal.fire('Atención', 'Este contrato ya está anulado.', 'info');
      return;
    }
    const numerodoc = String(row.numerodoc || '').trim();
    if (!numerodoc) {
      Swal.fire('Atención', 'No se encontró el número de documento.', 'warning');
      return;
    }

    Swal.fire({
      icon: 'warning',
      title: 'Anular contrato',
      html: `
        <p>Se anulará el contrato <strong>${numerodoc}</strong>.</p>
        <p>Una vez anulado <strong>no podrá editarse</strong>.</p>
        <p>¿Está seguro de continuar?</p>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c0392b',
      cancelButtonColor: '#6c757d',
      reverseButtons: true,
    }).then((result) => {
      if (!result.isConfirmed) return;
      Swal.fire({
        title: 'Anulando...',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(null),
      });
      this.contractsService.anularContrato(numerodoc).subscribe({
        next: (res) => {
          Swal.fire(
            'Anulado',
            res?.mensaje || 'Contrato anulado correctamente.',
            'success'
          );
          this.onCerrarDetalle();
          this.onBuscar();
        },
        error: (err) => {
          Swal.fire(
            'Error',
            err?.error?.error || 'No se pudo anular el contrato.',
            'error'
          );
        },
      });
    });
  }

  private loadWorkUsers(): void {
    this.loadingUsers = true;
    this.gestionService.getAllUsers().subscribe({
      next: (res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.workUsers = list
          .filter((u) => String(u.estado || '').toUpperCase() === 'ACTIVO')
          .map((user) => ({
            ...user,
            displayName: `${user.nombre} ${user.apellido} - ${user.perfil}`,
          }));
        this.loadingUsers = false;
      },
      error: () => {
        this.workUsers = [];
        this.loadingUsers = false;
      },
    });
  }

  private syncEditEncargado(): void {
    if (!this.editableHeader) {
      this.selectedEditEncargadoId = null;
      return;
    }
    const id = Number(this.editableHeader.encargado_contrato);
    this.selectedEditEncargadoId =
      Number.isFinite(id) && id > 0 ? id : null;
  }

  onEncargadoEditChange(id: number | null): void {
    this.selectedEditEncargadoId = id;
    if (!this.editableHeader) return;
    this.editableHeader.encargado_contrato =
      id != null && Number.isFinite(Number(id)) ? String(id) : null;
  }

  encargadoDisplay(id: string | null | undefined): string {
    const key = String(id ?? '').trim();
    if (!key) return '—';
    const user = this.workUsers.find(
      (u) => String(u.id_usuario) === key
    );
    return user?.displayName?.trim() || key;
  }

  onCerrarDetalle(): void {
    this.detailVisible = false;
    this.editMode = false;
    this.selectedHeader = null;
    this.selectedItems = [];
    this.editableHeader = null;
    this.editableItems = [];
    this.selectedEditConstructoraId = null;
    this.selectedEditProyectoId = null;
    this.selectedEditEncargadoId = null;
  }

  private buildCabeceraPayload(h: ContractFullResponse): Record<string, string | null> {
    return {
      tipo_doc_contratista: h.tipo_doc_contratista ?? null,
      tipo_doc_catalogo: h.tipo_doc_catalogo ?? null,
      numero_contrato: h.numero_contrato ?? null,
      empresa_asociada: h.empresa_asociada ?? null,
      empresa: h.empresa ?? null,
      nit_empresa: h.nit_empresa ?? null,
      proyecto: h.proyecto ?? null,
      ciudad_empresa: h.ciudad_empresa ?? null,
      tipo_contrato: h.tipo_contrato ?? null,
      estado: h.estado ?? null,
      fecha_inicio: this.toDdMmYyyy(h.fecha_inicio) || null,
      fecha_fin: this.toDdMmYyyy(h.fecha_fin) || null,
      descripcion: h.descripcion ?? null,
      porcentaje_anticipo: h.porcentaje_anticipo ?? null,
      valor_anticipo: this.moneyToRaw(h.valor_anticipo),
      estado_pago_anticipo: h.estado_pago_anticipo ?? null,
      rete_garantia: h.rete_garantia ?? null,
      valor_r_garantia: this.moneyToRaw(h.valor_r_garantia),
      estado_pago_r_garantia: h.estado_pago_r_garantia ?? null,
      polizas: h.polizas ?? null,
      valor_polizas_in: this.moneyToRaw(h.valor_polizas_in),
      estado_polizas_in: h.estado_polizas_in ?? null,
      polizas_finales: h.polizas_finales ?? null,
      valor_polizas_fin: this.moneyToRaw(h.valor_polizas_fin),
      estado_polizas_fin: h.estado_polizas_fin ?? null,
      valor_contrato: this.moneyToRaw(h.valor_contrato),
      encargado_contrato:
        this.selectedEditEncargadoId != null
          ? String(this.selectedEditEncargadoId)
          : h.encargado_contrato ?? null,
    };
  }

  private mapItemToDetalleJson(it: ContractFullResponse): ContractDetalleLineJson {
    return {
      tipo_detalle: String(it.tipo_detalle || 'AIU'),
      item: it.item ?? null,
      empresa: it.empresa_detalle ?? null,
      ref: it.ref ?? null,
      cant: it.cant != null ? String(it.cant) : null,
      und: it.und ?? null,
      ancho: it.ancho != null ? String(it.ancho) : null,
      alto: it.alto != null ? String(it.alto) : null,
      descripcion: it.descripcion_detalle ?? null,
      insumo: it.insumo ?? null,
      valor_base: this.moneyToRaw(it.valor_base),
      porc_adm: it.porc_adm != null ? String(it.porc_adm) : null,
      vr_adm: this.moneyToRaw(it.vr_adm),
      porc_imp: it.porc_imp != null ? String(it.porc_imp) : null,
      vr_imp: this.moneyToRaw(it.vr_imp),
      porc_ut: it.porc_ut != null ? String(it.porc_ut) : null,
      vr_ut: this.moneyToRaw(it.vr_ut),
      porc_iva: it.porc_iva != null ? String(it.porc_iva) : null,
      vr_iva: this.moneyToRaw(it.vr_iva),
      vr_total: this.moneyToRaw(it.vr_total),
    };
  }

  actualizarContrato(): void {
    if (!this.editableHeader) return;
    if (this.isAnulado(this.editableHeader)) {
      Swal.fire(
        'Contrato anulado',
        'No se puede editar un contrato anulado.',
        'warning'
      );
      return;
    }
    if (!this.puedeEditarContrato) {
      Swal.fire('Sin permiso', 'Solo un administrador puede actualizar contratos.', 'warning');
      return;
    }

    const numerodoc = String(this.editableHeader.numerodoc ?? '').trim();
    if (!numerodoc) return;

    const payload: UpdateContractFullRequest = {
      numerodoc,
      cabecera: this.buildCabeceraPayload(this.editableHeader),
      detalle:
        this.editableItems.length > 0
          ? this.editableItems.map((it) => this.mapItemToDetalleJson(it))
          : null,
    };

    Swal.fire({
      title: 'Actualizando...',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(null),
    });

    this.contractsService.updateContractFull(payload).subscribe({
      next: () => {
        this.onCerrarDetalle();
        this.onBuscar();
        Swal.fire('Actualizado', 'El contrato se actualizó correctamente.', 'success');
      },
      error: (err) => {
        const msg =
          err?.error?.error || err?.error?.message || 'Ocurrió un error al actualizar el contrato.';
        Swal.fire('Error', msg, 'error');
      },
    });
  }

  descargarPdf(): void {
    const header = this.selectedHeader;
    if (!header) return;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = 297;
    let y = 12;

    doc.setFontSize(14);
    doc.text('Contrato', pageW / 2, y, { align: 'center' });
    y += 9;

    doc.setFontSize(9);
    const labelStartX = 10;
    const valueStartX = 52;
    const cabecera: [string, string][] = [
      ['Tipo Documento', String(header.tipo_doc_catalogo || '')],
      ['Nº documento', String(header.numerodoc || '')],
      ['N° Documento', String(header.numero_contrato || '')],
      ['Documento Vínculo', String(header.tipo_doc_contratista || '')],
      ['Constructora', String(header.empresa || '')],
      ['Proyecto', String(header.proyecto || '')],
      ['Ciudad Proyecto', String(header.ciudad_empresa || '')],
      ['Tipo contrato', String(header.tipo_contrato || '')],
      ['Estado', String(header.estado || '')],
      ['Fecha inicio', this.formatDateForDisplay(header.fecha_inicio)],
      ['Fecha fin', this.formatDateForDisplay(header.fecha_fin)],
      ['Empresa asociada', this.empresaDisplay(header.empresa_asociada)],
      ['Descripción', String(header.descripcion || '').substring(0, 120)],
      ['Valor contrato', String(header.valor_contrato || '')],
      ['Encargado', this.encargadoDisplay(header.encargado_contrato)],
    ];

    cabecera.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label + ':', labelStartX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, valueStartX, y);
      y += 5;
      if (y > 185) {
        doc.addPage();
        y = 12;
      }
    });
    y += 4;

    const items = this.selectedItems;
    const tableHeaders = [
      [
        'Tipo',
        'Item',
        'Ref',
        'Cant',
        'Und',
        'Ancho',
        'Alto',
        'Descripción',
        'Insumo',
        'V.Base',
        '%Adm',
        'VrAdm',
        '%Imp',
        'VrImp',
        '%Ut',
        'VrUt',
        '%Iva',
        'VrIva',
        'VrTot',
      ],
    ];
    const tableBody =
      items.length > 0
        ? items.map((it) => [
            String(it.tipo_detalle ?? ''),
            String(it.item ?? ''),
            String(it.ref ?? ''),
            String(it.cant ?? ''),
            String(it.und ?? ''),
            String(it.ancho ?? ''),
            String(it.alto ?? ''),
            String(it.descripcion_detalle ?? '').substring(0, 28),
            String(it.insumo ?? '').substring(0, 14),
            String(it.valor_base ?? ''),
            String(it.porc_adm ?? ''),
            String(it.vr_adm ?? ''),
            String(it.porc_imp ?? ''),
            String(it.vr_imp ?? ''),
            String(it.porc_ut ?? ''),
            String(it.vr_ut ?? ''),
            String(it.porc_iva ?? ''),
            String(it.vr_iva ?? ''),
            String(it.vr_total ?? ''),
          ])
        : [['—', 'Sin ítems', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']];

    autoTable(doc, {
      head: tableHeaders,
      body: tableBody,
      startY: y,
      margin: { left: 10, right: 10 },
      styles: { fontSize: 7 },
      headStyles: { fillColor: [70, 130, 180] },
    });

    const fileName = `contrato-${(header.numerodoc || header.numero_contrato || 'doc').replace(/\s/g, '-')}.pdf`;
    doc.save(fileName);
  }
}
