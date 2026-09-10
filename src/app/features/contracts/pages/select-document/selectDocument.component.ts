import { Component, HostListener, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { CalendarModule } from 'primeng/calendar';
import { Subscription, timeout, finalize } from 'rxjs';
import { ContractsService } from '../../shared/service/contracts.service';
import { CatalogService, ConstructoraDto, ProyectoDto } from '../../../../shared/services/catalog.service';
import { AdministracionService } from '../../../administracion/shared/service/administracion.service';
import {
  TIPO_CONTRATO_DOCUMENTO_OPTIONS,
  labelTipoContratoDocumento,
} from '../../shared/constants/tipo-contrato.constants';
import { GestionService } from '../../../gestion/shared/service/gestion.service';
import { GestionUser } from '../../../gestion/shared/interfaces/Response.interface';
import { FloatLabelModule } from 'primeng/floatlabel';
import {
  ContractTypeResponse,
  ContractFieldResponse,
  ContratoFiltradoResponse,
  ContextoActaMedidaResponse,
  ActaMedidaAnteriorResponse,
} from '../../shared/interfaces/Response.interface';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { InsertContractRequest } from '../../shared/interfaces/Request.interface';
import html2pdf from 'html2pdf.js';
import { PaymentCertificateComponent } from './payment-certificate/payment-certificate.component';
import { CanComponentDeactivate } from '../../../../core/auth/unsaved-document.guard';
import { BASE_URL } from '../../../../core/url-constants';

/** Fila de la grilla de Actas de Medida (contrato o manual). */
interface ActaMedidaGridRow {
  item: string;
  detalle: string;
  cantidad: number | null;
  cantidadContratada: number | null;
  cantidadAcumulada: number;
  um: string;
  anchoContrato: number | null;
  altoContrato: number | null;
  ancho: number | null;
  alto: number | null;
  fondo: number | null;
  observaciones: string;
  esManual: boolean;
  categoriaId: number | null;
  categoriaNombre?: string;
  categoriaPrefijo?: string;
  insumoId: number | null;
  insumoCodigo: string;
  catalogoOk?: boolean;
  evidencia: File | null;
  evidenciaNombre: string;
  evidenciaUrl: string | null;
}

@Component({
  selector: 'app-contract-select-type',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DropdownModule,
    ReactiveFormsModule,
    InputTextModule,
    CalendarModule,
    FloatLabelModule,
    PaymentCertificateComponent,
  ],
  templateUrl: './selectDocument.component.html',
  styleUrls: ['./selectDocument.component.scss'],
})
export class ContractSelectTypeComponent implements OnInit, OnDestroy, CanComponentDeactivate {
  @ViewChild(PaymentCertificateComponent)
  paymentCertificate?: PaymentCertificateComponent;
  contractTypes: ContractTypeResponse[] = [];
  selectedType: string = '';
  fields: ContractFieldResponse[] = [];
  form: FormGroup = new FormGroup({});
  aiuFile: File | null = null;
  ivaFile: File | null = null;
  ocFile: File | null = null;
  /** Si en esta sesión ya se guardó el Excel de Orden de Compra (para permitir guardar formulario después). */
  ocFileAlreadySaved: boolean = false;
  ordenCompraData: any[] = [];
  companies: any[] = [];

  // Previews independientes
  showPreviewContrato: boolean = false;
  showPreviewVisita: boolean = false;
  showPreviewActa: boolean = false;
  showPreviewOC: boolean = false;
  showPreviewRemision: boolean = false;
  remisionWasPreviewed: boolean = false;
  generatingRemisionPdf = false;

  // Campos a ocultar por tipo (ej: fecha en Visita)
  hiddenFields = new Set<string>();
  userProfile: string = "";
  filteredContractTypes: any[] = [];
  /** Si el tipo viene del hub de tarjetas (?tipo=...), se oculta el select. */
  typeFromHub = false;

  fechaDia: string = '';
  fechaMes: string = '';
  fechaAnio: string = '';
  empresaImpresion: string = '';
  logoEmpresa: string = '';
  nitEmpresa: string = '';
  webEmpresa: string = '';
  colorWebEmpresa: string = '';
  remisionFile: File | null = null;

  remisionData: {
    item: string;
    cantidad: number;
    um: string;
    detalle: string;
    observaciones: string;
  }[] = [
    {
      item: '',
      cantidad: 0,
      um: '',
      detalle: '',
      observaciones: ''
    }
  ];

  /** Filas de detalle para Actas de Medida. */
  actasMedidaData: ActaMedidaGridRow[] = [];

  /** Categorías expandidas en la grilla de contrato (clave = categoriaId|nombre). */
  actaCategoriasExpandidas = new Set<string>();

  /**
   * Grupos cacheados (NO getter): un getter + *ngFor recreaba el DOM en cada CD
   * y congelaba la UI al cargar el contrato.
   */
  actasContratoGrupos: Array<{
    key: string;
    categoriaId: number | null;
    categoriaNombre: string;
    prefijo: string;
    items: ActaMedidaGridRow[];
    expanded: boolean;
    /** Captura editable a nivel categoría (TOTAL INSUMO). */
    cantidadActa: number | null;
    ancho: number | null;
    alto: number | null;
    fondo: number | null;
    observaciones: string;
  }> = [];

  /** Aviso inline (sin Swal) tras cargar contexto. */
  actaContextoAviso: string | null = null;

  /** Catálogo activos para selects de ítems manuales. */
  insumosCategoriasOptions: { label: string; value: number }[] = [];
  insumosCatalog: Array<{
    id_insumo: number;
    id_categoria: number;
    codigo: string;
    nombre: string;
    prefijo: string;
  }> = [];
  loadingInsumosCatalog = false;

  /**
   * Filtra las filas vacías para impresión/previsualización,
   * de modo que solo se muestren ítems con información real.
   */
  get remisionDataPrint() {
    return this.remisionData.filter((row) => {
      const hasItem = row.item && String(row.item).trim().length > 0;
      const hasCantidad = !!row.cantidad && row.cantidad > 0;
      const hasUm = row.um && String(row.um).trim().length > 0;
      const hasDetalle = row.detalle && String(row.detalle).trim().length > 0;
      const hasObs = row.observaciones && String(row.observaciones).trim().length > 0;
      return hasItem || hasCantidad || hasUm || hasDetalle || hasObs;
    });
  }

  getRemisionNumberDisplay(): string {
    const raw = this.form?.getRawValue?.()?.['remision_material']
      ?? this.form?.value?.['remision_material'];
    const empresa = this.form?.getRawValue?.()?.['empresa_asociada']
      ?? this.form?.value?.['empresa_asociada'];

    let prefix = 'SM';
    if (Number(empresa) === 2 || String(empresa) === '2') {
      prefix = 'HS';
    }

    if (raw === null || raw === undefined) {
      return prefix;
    }

    const str = String(raw).trim();
    if (!str) {
      return prefix;
    }
    // Si ya viene con el prefijo correcto, no lo duplicamos
    return str.startsWith(prefix) ? str : `${prefix}${str}`;
  }

  getOrdenCompraDisplay(): string {
    const tipo = labelTipoContratoDocumento(
      this.selectedTipoConsecutivo || this.form?.value?.['tipo_contrato']
    );
    const numeroDoc = String(this.form?.value?.['tipo_doc_rem'] ?? '').trim();
    const parts = [tipo, numeroDoc].filter(Boolean);
    if (parts.length) return parts.join(' ');
    const ordenCompra = String(this.form?.value?.['numero_contrato'] ?? '').trim();
    return ordenCompra;
  }

  private DOCUMENTS_BY_PROFILE: Record<string, string[]> = {
    ADMINISTRADOR: [
      "CONTRATO",
      "ASISTENCIA",
      "ACTAS DE MEDIDA",
      "ORDEN DE COMPRA",
      "REMISIONES",
      "ACTAS DE PAGO"
    ],
    AUXILIAR: [
      "CONTRATO",
      "ASISTENCIA",
      "ACTAS DE MEDIDA",
      "ORDEN DE COMPRA",
      "REMISIONES",
      "ACTAS DE PAGO"
    ],
    "SUPERVISOR DE PROYECTOS": [
      "CONTRATO",
      "ASISTENCIA",
      "ACTAS DE MEDIDA",
      "ORDEN DE COMPRA",
      "REMISIONES",
      "ACTAS DE PAGO"
    ],
    "RESIDENTE DE OBRA": [
      "ASISTENCIA",
      "ACTAS DE MEDIDA",
      "ACTAS DE PAGO"
    ],
    "DELINEANTE DE ARQUITECTURA": [
      "ASISTENCIA"
    ],
    "COORDINADOR DE PRODUCCION": [
      "ASISTENCIA",
      "ACTAS DE MEDIDA",
      "ORDEN DE COMPRA",
      "REMISIONES"
    ],
    CONTRATISTA: [
      "ASISTENCIA",
      "ACTAS DE MEDIDA"
    ],
    "COORDINADOR DE COMPRAS": [
      "ASISTENCIA",
      "ORDEN DE COMPRA"
    ],
    ALMACENISTA: [
      "ASISTENCIA",
      "REMISIONES"
    ],
    CONTABILIDAD: [
      "CONTRATO",
      "ASISTENCIA",
      "ACTAS DE PAGO"
    ],
    OFICINA: ["ASISTENCIA"],
    OBRA: ["ASISTENCIA"],
    ARMADOR: ["ASISTENCIA", "ACTAS DE MEDIDA"],
    PINTOR: ["ASISTENCIA"],
    INSTALADOR: ["ASISTENCIA"],
    TRANSPORTE: ["ASISTENCIA"]
  };


  contractTypeOptions = [
    { label: 'Suministro', value: 'Suministro' },
    { label: 'Instalación', value: 'Instalación' },
    { label: 'Suministro e instalación', value: 'Suministro e instalación' },
  ];

  typecontractDocumentOptions = TIPO_CONTRATO_DOCUMENTO_OPTIONS;

// * Controlamos todos los valores de estado según el tipo de documento
  statusOptionsByType: { [key: string]: { label: string; value: string }[] } = {
    CONTRATO: [
      { label: 'Activo', value: 'Activo' },
      { label: 'Finalizado', value: 'Finalizado' },
    ],
    'ACTAS DE MEDIDA': [
      { label: 'En Revisión', value: 'En Revisión' },
      { label: 'Asignada', value: 'Asignada' },
      { label: 'Finalizada', value: 'Finalizada' },
    ],
    'ORDEN DE COMPRA': [
      { label: 'En Revisión', value: 'En Revisión' },
      { label: 'Aprobado', value: 'Aprobado' },
      { label: 'Procesado', value: 'Procesado' },
    ],
    'ACTAS DE PAGO': [
      { label: 'En Revisión', value: 'En Revisión' },
      { label: 'Facturado', value: 'Facturado' },
      { label: 'Pago', value: 'Pago' }
    ]
  };

  yesNoOptions = [
    { label: 'Sí', value: 'Si' },
    { label: 'No', value: 'No' },
  ];

  expectedOrdenCompraHeaders: string[] = [
    "CONTRATO",
    "ITEM",
    "ELEMENTO",
    "DESCRIPCION",
    "UM",
    "CANTIDAD",
    "PROVEEDOR"
  ];

  // Catálogo de constructoras/proyectos para formularios
  constructorasOptions: { label: string; value: string }[] = [];
  proyectosOptions: { label: string; value: string }[] = [];
  selectedConstructoraId: string | null = null;
  selectedProyectoId: string | null = null;

  /** Usuarios activos (Diseñador encargado), mismo origen que Orden de Trabajo. */
  workUsers: GestionUser[] = [];
  loadingUsers = false;

  /** Contratos para select N°. Contrato (Actas / Remisiones / OC). Independiente del catálogo N° documento. */
  contratosOptions: { label: string; value: string }[] = [];
  loadingContratos = false;

  /**
   * N° documento (documento raíz) desde Administración.
   * Alimenta el campo Tipo Documento — NO el de contrato/cotización.
   */
  documentoNumeroOptions: { label: string; value: string }[] = [];
  /** Filtro tipo_contrato (Contrato, Cotizacion, OfertaM…) para cargar consecutivos */
  selectedTipoConsecutivo: string | null = null;
  loadingDocumentoNumero = false;

  /**
   * Sin contrato → N° Cotización obligatorio (clave de amarre).
   * La clave se guarda en numero_contrato / amd_numero_contrato / ot_contrato.
   */
  sinContrato = false;
  numeroCotizacion = '';

  /** Actas de Medida: tarjeta y contexto del contrato seleccionado. */
  actaContratoCabecera: ContratoFiltradoResponse | null = null;
  actasAnteriores: ActaMedidaAnteriorResponse[] = [];
  /** Archivo general del acta (PDF/imagen), no por ítem. */
  actaArchivoAdjunto: File | null = null;
  actaArchivoNombre = '';
  actaArchivoPreviewUrl: string | null = null;
  loadingContextoActa = false;
  /** Contrato cuya carga de contexto está en curso. */
  private pendingActaContratoClave: string | null = null;
  private contextoActaSub: Subscription | null = null;
  private actaGrillaSaveTimer: ReturnType<typeof setTimeout> | null = null;

  /** Ítems del contrato (tabla) vs manuales (cards). */
  get actasMedidaContratoRows() {
    return (this.actasMedidaData || []).filter((r) => !r.esManual);
  }

  get actasMedidaManualRows() {
    return (this.actasMedidaData || []).filter((r) => r.esManual);
  }

  /** Manuales solo en Actas con Tipo documento = Cotizacion. */
  get mostrarItemsManualesActa(): boolean {
    return this.esTipoCotizacionActa();
  }

  /** Actas: Cotizacion (catálogo) — permite ítems manuales. */
  esTipoCotizacionActa(): boolean {
    if (this.selectedType !== 'ACTAS DE MEDIDA') return false;
    return this.isTipoConsecutivoCotizacion(this.selectedTipoConsecutivo);
  }

  /** Remisiones: Cotizacion en tipo documento del catálogo. */
  esTipoCotizacionRemision(): boolean {
    if (this.selectedType !== 'REMISIONES') return false;
    return this.isTipoConsecutivoCotizacion(this.selectedTipoConsecutivo);
  }

  private isTipoConsecutivoCotizacion(raw: string | null | undefined): boolean {
    const t = String(raw || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return t === 'cotizacion';
  }

  private rebuildActasContratoGrupos(): void {
    const prevByKey = new Map(
      (this.actasContratoGrupos || []).map((g) => [g.key, g] as const)
    );
    const map = new Map<
      string,
      {
        key: string;
        categoriaId: number | null;
        categoriaNombre: string;
        prefijo: string;
        items: ActaMedidaGridRow[];
      }
    >();

    for (const row of this.actasMedidaContratoRows) {
      const nombre = String(row.categoriaNombre ?? '').trim() || 'Sin categoría';
      const id = row.categoriaId != null ? Number(row.categoriaId) : null;
      const key = id != null && id > 0 ? `id:${id}` : `name:${nombre}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          categoriaId: id,
          categoriaNombre: nombre,
          prefijo: String(row.categoriaPrefijo ?? '').trim(),
          items: [],
        });
      }
      map.get(key)!.items.push(row);
    }

    this.actasContratoGrupos = Array.from(map.values())
      .sort((a, b) =>
        a.categoriaNombre.localeCompare(b.categoriaNombre, 'es')
      )
      .map((g) => {
        const prev = prevByKey.get(g.key);
        return {
          ...g,
          expanded: this.actaCategoriasExpandidas.has(g.key),
          cantidadActa: prev?.cantidadActa ?? null,
          ancho: prev?.ancho ?? null,
          alto: prev?.alto ?? null,
          fondo: prev?.fondo ?? null,
          observaciones: prev?.observaciones ?? '',
        };
      });
  }

  toggleActaCategoria(key: string): void {
    if (this.actaCategoriasExpandidas.has(key)) {
      this.actaCategoriasExpandidas.delete(key);
    } else {
      this.actaCategoriasExpandidas.add(key);
    }
    this.actaCategoriasExpandidas = new Set(this.actaCategoriasExpandidas);
    this.rebuildActasContratoGrupos();
  }

  trackActaGrupo(
    _index: number,
    grupo: { key: string }
  ): string {
    return grupo.key;
  }

  trackActaRow(_index: number, row: ActaMedidaGridRow): string {
    return `${row.item}|${row.insumoCodigo || ''}|${row.esManual ? 'm' : 'c'}`;
  }

  /** Deja categorías colapsadas (evita pintar tablas enormes de golpe). */
  private collapseActaCategorias(): void {
    this.actaCategoriasExpandidas = new Set();
    this.rebuildActasContratoGrupos();
  }

  constructor(
    private contractsService: ContractsService,
    private fb: FormBuilder,
    private catalogService: CatalogService,
    private administracionService: AdministracionService,
    private gestionService: GestionService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userProfile = localStorage.getItem("nombre_perfil") || ""; 
    this.loadContractTypes();
    this.loadCompanies();
    this.loadConstructorasCatalog();
    this.loadWorkUsers();
    this.loadInsumosCatalog();
  }

  ngOnDestroy(): void {
    this.contextoActaSub?.unsubscribe();
    this.contextoActaSub = null;
    if (this.actaGrillaSaveTimer) {
      clearTimeout(this.actaGrillaSaveTimer);
      this.actaGrillaSaveTimer = null;
    }
  }

  loadInsumosCatalog(): void {
    this.loadingInsumosCatalog = true;
    this.catalogService.getInsumosActivos().subscribe({
      next: (res) => {
        this.insumosCategoriasOptions = (res.categorias || []).map((c) => ({
          label: this.formatInsumoCategoriaLabel(c.nombre, c.prefijo),
          value: c.id_categoria,
        }));
        this.insumosCatalog = res.insumos || [];
        this.loadingInsumosCatalog = false;
      },
      error: () => {
        this.insumosCategoriasOptions = [];
        this.insumosCatalog = [];
        this.loadingInsumosCatalog = false;
      },
    });
  }

  /** CP: "INSUMO" (sin Concepto). Resto: nombre de categoría. */
  private formatInsumoCategoriaLabel(nombre: string, prefijo?: string): string {
    const name = String(nombre ?? '').trim();
    const prefix = String(prefijo ?? '').trim().toUpperCase();
    if (prefix === 'CP' || /^insumo\s+concepto$/i.test(name)) {
      return 'INSUMO';
    }
    return name || prefix;
  }

  insumosOptionsByCategoria(categoriaId: number | null | undefined) {
    if (!categoriaId) return [];
    return this.insumosCatalog
      .filter((i) => i.id_categoria === categoriaId)
      .map((i) => ({
        label: `${i.codigo} - ${i.nombre}`,
        value: i.id_insumo,
      }));
  }

  onActaManualCategoriaChange(row: {
    categoriaId: number | null;
    insumoId: number | null;
    insumoCodigo: string;
    detalle: string;
  }): void {
    row.insumoId = null;
    row.insumoCodigo = '';
    row.detalle = '';
  }

  onActaManualInsumoChange(row: {
    insumoId: number | null;
    insumoCodigo: string;
    detalle: string;
  }): void {
    const found = this.insumosCatalog.find((i) => i.id_insumo === row.insumoId);
    if (!found) {
      row.insumoCodigo = '';
      row.detalle = '';
      return;
    }
    row.insumoCodigo = found.codigo;
    row.detalle = found.nombre;
  }

  volverAlHub(): void {
    this.router.navigate(['/dashboard/contracts']);
  }

  /** Aviso del navegador al cerrar/recargar pestaña con cambios pendientes. */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  /**
   * Usado por unsavedDocumentGuard al navegar a otro módulo.
   * No altera la lógica de guardado del documento.
   */
  async canDeactivate(): Promise<boolean> {
    if (!this.hasUnsavedChanges()) {
      return true;
    }

    const result = await Swal.fire({
      title: '¿Desea salir sin guardar los cambios?',
      text: 'Los cambios realizados en este documento no se han guardado y podrían perderse.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Salir sin guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#20506A',
      allowOutsideClick: false,
    });

    return result.isConfirmed;
  }

  hasUnsavedChanges(): boolean {
    if (!this.selectedType) {
      return false;
    }

    if (this.selectedType === 'ACTAS DE PAGO') {
      return this.paymentCertificate?.hasUnsavedChanges() ?? false;
    }

    if (this.aiuFile || this.ivaFile || this.ocFile || this.remisionFile) {
      return true;
    }

    if (this.actaArchivoAdjunto) {
      return true;
    }

    if (this.selectedConstructoraId || this.selectedProyectoId) {
      return true;
    }

    if (this.remisionDataHasUserContent()) {
      return true;
    }

    if (this.actasMedidaDataHasUserContent()) {
      return true;
    }

    if (this.form) {
      const skipKeys = new Set(['elaboro']);
      return Object.entries(this.form.value).some(([key, value]) => {
        if (skipKeys.has(key)) return false;
        if (value instanceof File) return true;
        if (value instanceof Date) return true;
        return String(value ?? '').trim().length > 0;
      });
    }

    return false;
  }

  private remisionDataHasUserContent(): boolean {
    return (this.remisionData || []).some(
      (row) =>
        String(row?.item ?? '').trim() ||
        Number(row?.cantidad) > 0 ||
        String(row?.um ?? '').trim() ||
        String(row?.detalle ?? '').trim() ||
        String(row?.observaciones ?? '').trim()
    );
  }

  private createEmptyActaMedidaRow(esManual = true) {
    return {
      item: '',
      detalle: '',
      cantidad: null as number | null,
      cantidadContratada: null as number | null,
      cantidadAcumulada: 0,
      um: '',
      anchoContrato: null as number | null,
      altoContrato: null as number | null,
      ancho: null as number | null,
      alto: null as number | null,
      fondo: null as number | null,
      observaciones: '',
      esManual,
      categoriaId: null as number | null,
      categoriaNombre: '',
      categoriaPrefijo: '',
      insumoId: null as number | null,
      insumoCodigo: '',
      catalogoOk: esManual ? true : false,
      evidencia: null as File | null,
      evidenciaNombre: '',
      evidenciaUrl: null as string | null,
    };
  }

  getActaDiferencia(row: {
    cantidadContratada: number | null;
    cantidadAcumulada: number;
    cantidad: number | null;
  }): number | null {
    if (row.cantidadContratada == null) return null;
    const acum = Number(row.cantidadAcumulada ?? 0);
    const acta = Number(row.cantidad ?? 0);
    if (!Number.isFinite(acum) || !Number.isFinite(acta)) return null;
    return row.cantidadContratada - acum - acta;
  }

  /**
   * Pendiente por ejecutar = cant. contratada − acum. actas anteriores − cant. acta.
   * No bloquea si queda negativo (solo se muestra en rojo).
   */
  getActaPendiente(row: {
    cantidadContratada: number | null;
    cantidadAcumulada: number;
    cantidad: number | null;
  }): number | null {
    return this.getActaDiferencia(row);
  }

  getActaGrupoTotales(
    items: ActaMedidaGridRow[],
    cantidadActaCategoria: number | null = null
  ): {
    cantidadContratada: number;
    cantidadAcumulada: number;
    cantidadActa: number;
    pendiente: number | null;
  } {
    let contratada = 0;
    let acumulada = 0;
    let actaFilas = 0;
    let tieneContratada = false;

    for (const row of items || []) {
      if (row.cantidadContratada != null && Number.isFinite(Number(row.cantidadContratada))) {
        contratada += Number(row.cantidadContratada);
        tieneContratada = true;
      }
      acumulada += Number(row.cantidadAcumulada ?? 0) || 0;
      const c = Number(row.cantidad);
      if (row.cantidad != null && String(row.cantidad).trim() !== '' && Number.isFinite(c)) {
        actaFilas += c;
      }
    }

    const catCant =
      cantidadActaCategoria != null &&
      String(cantidadActaCategoria).trim() !== '' &&
      Number.isFinite(Number(cantidadActaCategoria))
        ? Number(cantidadActaCategoria)
        : null;
    const acta =
      actaFilas > 0 ? actaFilas : catCant != null ? catCant : actaFilas;

    return {
      cantidadContratada: contratada,
      cantidadAcumulada: acumulada,
      cantidadActa: acta,
      pendiente: tieneContratada ? contratada - acumulada - acta : null,
    };
  }

  formatActaNumero(value: number | null | undefined): string {
    if (value == null || Number.isNaN(Number(value))) return '—';
    return Number(value).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  /** Campos monetarios del formulario (solo formato visual). */
  private readonly MONETARY_FIELD_NAMES = new Set([
    'valor_contrato',
    'Valor anticipo',
    'valor_r_garantia',
    'valor_polizas',
    'valor_polizas_in',
    'valor_polizas_fin',
    'facturado',
    'saldo_contrato',
  ]);

  isMonetaryValueField(name: string | null | undefined): boolean {
    const n = String(name ?? '').trim();
    if (!n) return false;
    if (this.MONETARY_FIELD_NAMES.has(n)) return true;
    return /^valor[\s_]/i.test(n) || n.toLowerCase().startsWith('valor_');
  }

  /** Quita separadores de miles; deja número plano para BD. */
  parseMonedaInput(value: unknown): string {
    const s = String(value ?? '').trim();
    if (!s) return '';
    const normalized = s.replace(/\./g, '').replace(',', '.');
    const num = Number(normalized);
    if (!Number.isFinite(num)) {
      return s.replace(/\./g, '');
    }
    return Number.isInteger(num) ? String(num) : String(num);
  }

  /** Muestra 1.000.000 (es-CO) sin alterar el valor guardado. */
  formatMonedaDisplay(value: unknown): string {
    const raw = this.parseMonedaInput(value);
    if (!raw) return '';
    const num = Number(raw);
    if (!Number.isFinite(num)) return String(value ?? '');
    return num.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  onMonetaryFieldBlur(fieldName: string): void {
    const ctrl = this.form?.get(fieldName);
    if (!ctrl) return;
    const formatted = this.formatMonedaDisplay(ctrl.value);
    ctrl.setValue(formatted, { emitEvent: false });
  }

  /** Al editar, muestra el número sin puntos para facilitar cambios. */
  onMonetaryFieldFocus(fieldName: string): void {
    const ctrl = this.form?.get(fieldName);
    if (!ctrl) return;
    const raw = this.parseMonedaInput(ctrl.value);
    if (raw) ctrl.setValue(raw, { emitEvent: false });
  }

  private serializeCampoValor(nombre: string, valor: unknown): string {
    if (valor instanceof File) return valor.name;
    if (this.isMonetaryValueField(nombre)) {
      return this.parseMonedaInput(valor);
    }
    return String(valor ?? '');
  }

  private formatMonetaryFieldsInForm(): void {
    if (!this.form) return;
    for (const field of this.fields || []) {
      if (!this.isMonetaryValueField(field.nombre_campo_doc)) continue;
      this.onMonetaryFieldBlur(field.nombre_campo_doc);
    }
  }

  formatActaFecha(value: string | null | undefined): string {
    const v = String(value ?? '').trim();
    if (!v) return '—';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleDateString('es-CO');
  }

  private resolveActaAdjuntoUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    const clean = String(path).replace(/\\/g, '/').replace(/^\/+/, '');
    if (/^https?:\/\//i.test(clean)) return clean;
    const filesBase = BASE_URL.replace(/\/api\/?$/, '');
    return `${filesBase}/${clean}`;
  }

  abrirAdjuntoActa(path: string | null | undefined): void {
    const url = this.resolveActaAdjuntoUrl(path);
    if (!url) {
      Swal.fire({
        icon: 'info',
        title: 'Sin adjunto',
        text: 'Esta acta no tiene archivo adjunto.',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    if (/\.(jpe?g|png|gif|webp|bmp|heic)$/i.test(String(path))) {
      Swal.fire({
        title: 'Archivo del acta',
        imageUrl: url,
        imageAlt: 'Archivo del acta',
        width: 'auto',
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#20506A',
        imageHeight: 420,
      });
      return;
    }

    window.open(url, '_blank');
  }

  resolveEmpresaAsociadaLabel(id: string | null | undefined): string {
    const key = String(id ?? '').trim();
    if (!key) return '—';
    const found = (this.companies || []).find(
      (c) => String(c?.id ?? c?.value ?? '') === key
    );
    return (
      found?.nombre_empresa ??
      found?.nombre ??
      found?.label ??
      '—'
    );
  }

  /** Encargado del contrato (id usuario en EAV encargado_contrato). */
  resolveEncargadoContratoLabel(id: string | null | undefined): string {
    const key = String(id ?? '').trim();
    if (!key) return 'Sin encargado';
    const user = this.workUsers.find(
      (u) => String(u.id_usuario) === key
    );
    return user?.displayName?.trim() || 'Sin encargado';
  }

  onActaArchivoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (this.actaArchivoPreviewUrl) {
      URL.revokeObjectURL(this.actaArchivoPreviewUrl);
      this.actaArchivoPreviewUrl = null;
    }
    this.actaArchivoAdjunto = file;
    this.actaArchivoNombre = file?.name ?? '';
    this.actaArchivoPreviewUrl =
      file && String(file.type || '').startsWith('image/')
        ? URL.createObjectURL(file)
        : null;
    input.value = '';
  }

  clearActaArchivo(): void {
    if (this.actaArchivoPreviewUrl) {
      URL.revokeObjectURL(this.actaArchivoPreviewUrl);
      this.actaArchivoPreviewUrl = null;
    }
    this.actaArchivoAdjunto = null;
    this.actaArchivoNombre = '';
  }

  private getActaConstructoraNombre(): string {
    if (this.selectedConstructoraId) {
      return (
        this.constructorasOptions.find((c) => c.value === this.selectedConstructoraId)
          ?.label ?? ''
      );
    }
    const f = this.getActaField('constructora');
    if (f && this.form) {
      return String(this.form.get(f.nombre_campo_doc)?.value ?? '').trim();
    }
    return '';
  }

  private getActaProyectoNombre(): string {
    if (this.selectedProyectoId) {
      return (
        this.proyectosOptions.find((p) => p.value === this.selectedProyectoId)?.label ??
        ''
      );
    }
    const f = this.getActaField('proyecto');
    if (f && this.form) {
      return String(this.form.get(f.nombre_campo_doc)?.value ?? '').trim();
    }
    return '';
  }

  /** Solo Actas: contratos de la obra seleccionada (no lista global). */
  private loadContratosFiltradosActa(): void {
    if (this.selectedType !== 'ACTAS DE MEDIDA' || this.sinContrato) {
      return;
    }

    const constructora = this.getActaConstructoraNombre();
    const proyecto = this.getActaProyectoNombre();

    if (!constructora || !proyecto) {
      this.contratosOptions = [];
      this.clearActaContratoContext(false);
      return;
    }

    this.loadingContratos = true;
    this.contractsService
      .consultarContratosFiltrados({ constructora, proyecto })
      .subscribe({
        next: (res) => {
          const list = Array.isArray(res?.data) ? res.data : [];
          this.contratosOptions = list.map((c) => ({
            label: c.label || c.numero_contrato,
            value: c.value || c.numero_contrato,
          }));
          this.loadingContratos = false;

          const ctrl = this.getContratoFormControl();
          const current = String(ctrl?.value ?? '').trim();
          if (
            current &&
            !this.contratosOptions.some((o) => o.value === current)
          ) {
            ctrl?.setValue(null, { emitEvent: false });
            this.clearActaContratoContext(false);
          }
        },
        error: () => {
          this.contratosOptions = [];
          this.loadingContratos = false;
        },
      });
  }

  onActaNumeroDocumentoSelected(numero: string | null): void {
    if (this.selectedType !== 'ACTAS DE MEDIDA') {
      return;
    }

    const clave = String(numero ?? '').trim();
    if (!clave) {
      if (this.loadingContextoActa || this.pendingActaContratoClave) {
        return;
      }
      const actual = this.resolveNumeroDocumentoPersistido();
      if (actual) {
        return;
      }
      this.contextoActaSub?.unsubscribe();
      this.contextoActaSub = null;
      this.pendingActaContratoClave = null;
      this.loadingContextoActa = false;
      this.clearActaContratoContext();
      return;
    }

    this.applyVinculoToForm(clave);
    this.loadActaContextoDesdeNumero(clave);
  }

  /** Remisiones: N° Documento (= contrato) → guarda EAV oculto + tarjeta informativa. */
  onRemisionNumeroDocumentoSelected(numero: string | null): void {
    if (this.selectedType !== 'REMISIONES') {
      return;
    }

    const clave = String(numero ?? '').trim();
    if (!clave) {
      this.applyVinculoToForm('');
      this.clearRemisionContratoCard();
      return;
    }

    this.applyVinculoToForm(clave);
    this.loadRemisionContratoCard(clave);
  }

  /** Solo cabecera del documento (sin grilla de actas). */
  private loadRemisionContratoCard(claveRaw: string): void {
    const clave = String(claveRaw ?? '').trim();
    if (!clave || this.selectedType !== 'REMISIONES') {
      return;
    }

    if (
      this.loadingContextoActa &&
      this.pendingActaContratoClave === clave
    ) {
      return;
    }

    const tipoVinculo: 'CONTRATO' | 'COTIZACION' = this.esTipoCotizacionRemision()
      ? 'COTIZACION'
      : 'CONTRATO';

    this.contextoActaSub?.unsubscribe();
    this.pendingActaContratoClave = clave;
    this.loadingContextoActa = true;
    this.actaContextoAviso = null;

    this.contextoActaSub = this.contractsService
      .getContextoActaMedida({
        numero_contrato: clave,
        tipo_vinculo: tipoVinculo,
      })
      .pipe(
        timeout(20000),
        finalize(() => {
          if (this.pendingActaContratoClave === clave) {
            this.pendingActaContratoClave = null;
            this.loadingContextoActa = false;
          }
        })
      )
      .subscribe({
        next: (ctx) => {
          if (this.pendingActaContratoClave !== clave) {
            return;
          }
          const cab = (ctx?.cabecera as ContratoFiltradoResponse) ?? null;
          const hasRealCab =
            !!cab &&
            (!!String(cab.numerodoc ?? '').trim() ||
              !!String(cab.proyecto ?? '').trim() ||
              !!String(cab.constructora ?? '').trim() ||
              !!String(cab.numero_contrato ?? '').trim());
          this.actaContratoCabecera = hasRealCab ? cab : null;
          if (!hasRealCab) {
            this.actaContextoAviso =
              'Documento seleccionado sin cabecera asociada en contratos.';
          } else {
            this.actaContextoAviso = null;
            // Prefill constructora/proyecto del documento si el form los trae vacíos.
            this.prefillerRemisionDesdeCabecera(cab);
          }
        },
        error: (err) => {
          if (this.pendingActaContratoClave !== clave) {
            return;
          }
          this.actaContratoCabecera = null;
          if (err?.name === 'TimeoutError') {
            this.actaContextoAviso =
              'Tiempo de espera agotado al cargar el documento. Intente de nuevo.';
          } else {
            this.actaContextoAviso =
              err?.error?.mensaje ||
              'No se pudo cargar la información del documento seleccionado.';
          }
        },
      });
  }

  private clearRemisionContratoCard(): void {
    this.actaContratoCabecera = null;
    this.actaContextoAviso = null;
    this.pendingActaContratoClave = null;
    this.loadingContextoActa = false;
    this.contextoActaSub?.unsubscribe();
    this.contextoActaSub = null;
  }

  /** Completa cliente/proyecto desde la tarjeta si el usuario ya eligió obra. */
  private prefillerRemisionDesdeCabecera(cab: ContratoFiltradoResponse): void {
    if (!this.form || !cab) return;
    const patch: Record<string, string> = {};
    const cons = String(cab.constructora ?? '').trim();
    const proy = String(cab.proyecto ?? '').trim();
    if (cons && this.form.contains('cliente')) {
      const cur = String(this.form.get('cliente')?.value ?? '').trim();
      if (!cur) patch['cliente'] = cons;
    }
    if (cons && this.form.contains('constructora')) {
      const cur = String(this.form.get('constructora')?.value ?? '').trim();
      if (!cur) patch['constructora'] = cons;
    }
    if (proy && this.form.contains('proyecto')) {
      const cur = String(this.form.get('proyecto')?.value ?? '').trim();
      if (!cur) patch['proyecto'] = proy;
    }
    if (Object.keys(patch).length) {
      this.form.patchValue(patch, { emitEvent: false });
    }
  }

  /** Carga tarjeta + ítems (y historial) usando el N° Documento como clave. */
  private loadActaContextoDesdeNumero(claveRaw: string): void {
    const clave = String(claveRaw ?? '').trim();
    if (!clave || this.selectedType !== 'ACTAS DE MEDIDA') {
      return;
    }

    if (
      this.loadingContextoActa &&
      this.pendingActaContratoClave === clave
    ) {
      return;
    }

    const tipoVinculo: 'CONTRATO' | 'COTIZACION' = this.esTipoCotizacionActa()
      ? 'COTIZACION'
      : 'CONTRATO';

    this.contextoActaSub?.unsubscribe();
    this.pendingActaContratoClave = clave;
    this.loadingContextoActa = true;
    this.actaContextoAviso = null;

    this.contextoActaSub = this.contractsService
      .getContextoActaMedida({
        numero_contrato: clave,
        tipo_vinculo: tipoVinculo,
      })
      .pipe(
        timeout(20000),
        finalize(() => {
          if (this.pendingActaContratoClave === clave) {
            this.pendingActaContratoClave = null;
            this.loadingContextoActa = false;
          }
        })
      )
      .subscribe({
        next: (ctx) => {
          if (this.pendingActaContratoClave !== clave) {
            return;
          }
          try {
            this.applyContextoActaMedida(ctx);
          } catch (err) {
            console.error('applyContextoActaMedida:', err);
            this.clearActaContratoContext(false);
            this.ensureActaManualesSiCotizacion();
            this.actaContextoAviso =
              'No se pudo procesar la información del documento seleccionado.';
          }
        },
        error: (err) => {
          if (this.pendingActaContratoClave !== clave) {
            return;
          }
          this.clearActaContratoContext();
          this.ensureActaManualesSiCotizacion();
          if (err?.name === 'TimeoutError') {
            this.actaContextoAviso =
              'Tiempo de espera agotado al cargar el documento. Intente de nuevo.';
          } else {
            this.actaContextoAviso =
              err?.error?.mensaje ||
              'No se pudo cargar la información del documento seleccionado.';
          }
        },
      });
  }

  /** @deprecated Usar onActaNumeroDocumentoSelected — se mantiene por compatibilidad. */
  onActaContratoSelected(numero: string | null): void {
    this.onActaNumeroDocumentoSelected(numero);
  }

  private applyContextoActaMedida(ctx: ContextoActaMedidaResponse): void {
    const cab = (ctx?.cabecera as ContratoFiltradoResponse) ?? null;
    const itemsContrato = ctx?.items_contrato ?? [];
    const hasRealCab =
      !!cab &&
      (!!String(cab.numerodoc ?? '').trim() ||
        !!String(cab.proyecto ?? '').trim() ||
        !!String(cab.constructora ?? '').trim() ||
        itemsContrato.length > 0);
    this.actaContratoCabecera = hasRealCab ? cab : null;
    this.actasAnteriores = ctx?.actas_anteriores ?? [];

    const acumMap = new Map<string, number>();
    for (const a of ctx?.acumulado_actas ?? []) {
      const key = String(a.item ?? '').trim();
      if (!key) continue;
      const n = Number(a.cantidad_acumulada);
      acumMap.set(key, Number.isFinite(n) ? n : 0);
    }

    const contractRows = itemsContrato.map((it) => {
      const itemKey = String(it.item ?? '').trim();
      const codigo = String(it.insumo ?? '').trim().toUpperCase();
      return {
        item: itemKey,
        detalle: String(it.detalle ?? it.insumo_nombre ?? '').trim(),
        cantidad: null as number | null,
        cantidadContratada:
          it.cantidad_contratada != null ? Number(it.cantidad_contratada) : null,
        cantidadAcumulada: acumMap.get(itemKey) ?? 0,
        um: String(it.um ?? '').trim(),
        anchoContrato:
          it.ancho_contrato != null ? Number(it.ancho_contrato) : null,
        altoContrato:
          it.alto_contrato != null ? Number(it.alto_contrato) : null,
        // Captura limpia: no rehidratar mediciones previas (van en cada acta / acum. categoría).
        ancho: null as number | null,
        alto: null as number | null,
        fondo: null as number | null,
        observaciones: '',
        esManual: false,
        categoriaId:
          it.categoria_id != null ? Number(it.categoria_id) : (null as number | null),
        categoriaNombre: String(it.categoria ?? '').trim() || 'Sin categoría',
        categoriaPrefijo: String(it.categoria_prefijo ?? '').trim(),
        insumoId: it.insumo_id != null ? Number(it.insumo_id) : (null as number | null),
        insumoCodigo: codigo,
        catalogoOk: it.catalogo_ok === true,
        evidencia: null as File | null,
        evidenciaNombre: '',
        evidenciaUrl: null as string | null,
      };
    });

    // Plano contratado si existe; en Cotización además se permiten manuales.
    if (this.esTipoCotizacionActa()) {
      this.actasMedidaData = [
        ...contractRows,
        this.createEmptyActaMedidaRow(true),
      ];
    } else {
      this.actasMedidaData = contractRows;
    }
    // Colapsado por defecto: evita congelar la UI pintando todas las tablas a la vez.
    this.collapseActaCategorias();

    const invalidos = contractRows.filter((r) => !r.catalogoOk);
    if (invalidos.length) {
      const sample = invalidos
        .slice(0, 8)
        .map((r) => `${r.item}:${r.insumoCodigo || '(vacío)'}`)
        .join(', ');
      this.actaContextoAviso = `Hay ${invalidos.length} ítem(s) con insumo fuera del catálogo (${sample}${
        invalidos.length > 8 ? '…' : ''
      }). Puede ver la grilla; para guardar el acta debe registrarlos en Administración → Insumos.`;
    } else if (this.esTipoCotizacionActa() && !contractRows.length) {
      this.actaContextoAviso =
        'Cotización sin plano contratado asociado: agregue ítems manuales.';
    } else {
      this.actaContextoAviso = null;
    }
  }

  /** Si es Cotización y no hay filas manuales, deja una lista para capturar. */
  private ensureActaManualesSiCotizacion(): void {
    if (!this.esTipoCotizacionActa()) {
      return;
    }
    const hasManual = (this.actasMedidaData || []).some((r) => r.esManual);
    if (!hasManual) {
      this.actasMedidaData = [
        ...(this.actasMedidaData || []).filter((r) => !r.esManual),
        this.createEmptyActaMedidaRow(true),
      ];
      this.rebuildActasContratoGrupos();
    }
  }

  private clearActaContratoContext(resetGrid = true): void {
    this.actaContratoCabecera = null;
    this.actasAnteriores = [];
    this.pendingActaContratoClave = null;
    this.loadingContextoActa = false;
    this.actaContextoAviso = null;
    this.actasContratoGrupos = [];
    this.clearActaArchivo();
    if (resetGrid) {
      this.resetActasMedidaData();
    }
  }

  private resetActasMedidaData(): void {
    (this.actasMedidaData || []).forEach((row) => {
      if (row.evidenciaUrl) URL.revokeObjectURL(row.evidenciaUrl);
    });
    // Cotización: siempre al menos una fila manual; otros tipos: solo plano al cargar contexto.
    this.actasMedidaData = this.esTipoCotizacionActa()
      ? [this.createEmptyActaMedidaRow(true)]
      : [];
    this.actaCategoriasExpandidas = new Set();
    this.rebuildActasContratoGrupos();
  }

  private actasMedidaDataHasUserContent(): boolean {
    return (this.actasMedidaData || []).some((row) => {
      if (row.esManual) {
        return this.actaMedidaRowHasAnyContent(row);
      }
      return this.actaRowHasActaMeasurement(row);
    });
  }

  /** Medición de esta acta (solo Cant. acta > 0 va a actas_medida_detalle). */
  private actaRowHasActaMeasurement(row: {
    cantidad: number | null;
  }): boolean {
    const cant = Number(row.cantidad);
    return (
      row.cantidad != null &&
      String(row.cantidad).trim() !== '' &&
      !Number.isNaN(cant) &&
      cant > 0
    );
  }

  onActaGrillaFieldBlur(): void {
    this.schedulePersistirGrillaContrato();
  }

  private schedulePersistirGrillaContrato(): void {
    if (this.actaGrillaSaveTimer) {
      clearTimeout(this.actaGrillaSaveTimer);
    }
    this.actaGrillaSaveTimer = setTimeout(() => {
      this.persistirGrillaContrato();
    }, 600);
  }

  private actaRowHasGrillaContent(row: {
    ancho: number | null;
    alto: number | null;
    fondo?: number | null;
    observaciones: string;
  }): boolean {
    const hasNum = (v: number | null | undefined) =>
      v != null && String(v).trim() !== '' && !Number.isNaN(Number(v));
    return (
      hasNum(row.ancho) ||
      hasNum(row.alto) ||
      hasNum(row.fondo ?? null) ||
      String(row.observaciones ?? '').trim().length > 0
    );
  }

  private persistirGrillaContrato(): void {
    if (this.selectedType !== 'ACTAS DE MEDIDA') return;

    const vinculo = this.resolveVinculo();
    if (!vinculo.ok) return;

    const filas = this.actasMedidaContratoRows
      .filter(
        (r) =>
          String(r.item ?? '').trim() && this.actaRowHasGrillaContent(r)
      )
      .map((r) => ({
        item: String(r.item).trim(),
        detalle: String(r.detalle ?? '').trim(),
        um: String(r.um ?? '').trim(),
        ancho: r.ancho,
        alto: r.alto,
        fondo: r.fondo,
        observaciones: String(r.observaciones ?? '').trim(),
      }));

    if (!filas.length) return;

    this.contractsService
      .upsertGrillaActaContrato({
        numero_contrato: vinculo.clave,
        filas,
      })
      .subscribe({ error: () => {} });
  }

  private actaMedidaRowHasMeasureInput(row: {
    cantidad: number | null;
    ancho: number | null;
    alto: number | null;
    fondo?: number | null;
    observaciones: string;
  }): boolean {
    const hasNum = (v: number | null | undefined) =>
      v != null && String(v).trim() !== '' && !Number.isNaN(Number(v));
    return (
      hasNum(row.cantidad) ||
      hasNum(row.ancho) ||
      hasNum(row.alto) ||
      hasNum(row.fondo ?? null) ||
      String(row.observaciones ?? '').trim().length > 0
    );
  }

  private actaMedidaRowHasAnyContent(row: {
    item: string;
    detalle: string;
    cantidad: number | null;
    um: string;
    ancho: number | null;
    alto: number | null;
    fondo: number | null;
    observaciones: string;
    evidencia: File | null;
    esManual?: boolean;
    categoriaId?: number | null;
    insumoId?: number | null;
  }): boolean {
    // Ítems del contrato: solo cuenta Cant. acta (la grilla persiste aparte).
    if (row.esManual === false) {
      return this.actaRowHasActaMeasurement(row);
    }
    return !!(
      String(row?.item ?? '').trim() ||
      String(row?.detalle ?? '').trim() ||
      row?.cantidad != null ||
      String(row?.um ?? '').trim() ||
      row?.ancho != null ||
      row?.alto != null ||
      row?.fondo != null ||
      String(row?.observaciones ?? '').trim() ||
      !!row?.evidencia ||
      (row?.categoriaId != null && Number(row.categoriaId) > 0) ||
      (row?.insumoId != null && Number(row.insumoId) > 0)
    );
  }

  /** Ítem completo: todos los campos excepto evidencia y fondo (opcionales). */
  isActaMedidaRowComplete(row: {
    item: string;
    detalle: string;
    cantidad: number | null;
    um: string;
    ancho: number | null;
    alto: number | null;
    observaciones: string;
    esManual?: boolean;
    categoriaId?: number | null;
    insumoId?: number | null;
    insumoCodigo?: string;
    catalogoOk?: boolean;
  }): boolean {
    const cant = Number(row.cantidad);
    const baseOk =
      String(row.item ?? '').trim().length > 0 &&
      row.cantidad != null &&
      String(row.cantidad).trim() !== '' &&
      !Number.isNaN(cant) &&
      cant > 0 &&
      String(row.um ?? '').trim().length > 0 &&
      row.ancho != null &&
      String(row.ancho).trim() !== '' &&
      !Number.isNaN(Number(row.ancho)) &&
      row.alto != null &&
      String(row.alto).trim() !== '' &&
      !Number.isNaN(Number(row.alto));

    if (row.esManual === false) {
      // Del contrato: Cant. acta + insumo válido del catálogo.
      return (
        String(row.item ?? '').trim().length > 0 &&
        cant > 0 &&
        String(row.um ?? '').trim().length > 0 &&
        row.insumoId != null &&
        Number(row.insumoId) > 0 &&
        String(row.insumoCodigo ?? '').trim().length > 0 &&
        row.catalogoOk !== false
      );
    }

    const insumoOk =
      row.categoriaId != null &&
      Number(row.categoriaId) > 0 &&
      row.insumoId != null &&
      Number(row.insumoId) > 0 &&
      String(row.detalle ?? '').trim().length > 0;

    return (
      baseOk &&
      insumoOk &&
      String(row.observaciones ?? '').trim().length > 0
    );
  }

  addActaMedidaRow(): void {
    this.actasMedidaData = [
      ...this.actasMedidaData,
      this.createEmptyActaMedidaRow(true),
    ];
  }

  removeActaMedidaManualRow(manualIndex: number): void {
    const manual = this.actasMedidaManualRows;
    if (manual.length <= 1) return;
    const row = manual[manualIndex];
    if (!row) return;
    if (row.evidenciaUrl) URL.revokeObjectURL(row.evidenciaUrl);
    const globalIdx = this.actasMedidaData.indexOf(row);
    if (globalIdx >= 0) {
      this.actasMedidaData.splice(globalIdx, 1);
      this.actasMedidaData = [...this.actasMedidaData];
    }
  }

  /** Índice global en actasMedidaData para evidencia de fila manual. */
  getActaMedidaManualGlobalIndex(manualIndex: number): number {
    const row = this.actasMedidaManualRows[manualIndex];
    return row ? this.actasMedidaData.indexOf(row) : manualIndex;
  }

  onActaMedidaEvidenceSelected(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!this.actasMedidaData[index]) return;

    const prevUrl = this.actasMedidaData[index].evidenciaUrl;
    if (prevUrl) {
      URL.revokeObjectURL(prevUrl);
    }

    this.actasMedidaData[index].evidencia = file;
    this.actasMedidaData[index].evidenciaNombre = file?.name ?? '';
    this.actasMedidaData[index].evidenciaUrl =
      file && String(file.type || '').startsWith('image/')
        ? URL.createObjectURL(file)
        : null;
  }

  clearActaMedidaEvidence(index: number): void {
    if (!this.actasMedidaData[index]) return;
    if (this.actasMedidaData[index].evidenciaUrl) {
      URL.revokeObjectURL(this.actasMedidaData[index].evidenciaUrl!);
    }
    this.actasMedidaData[index].evidencia = null;
    this.actasMedidaData[index].evidenciaNombre = '';
    this.actasMedidaData[index].evidenciaUrl = null;
  }

  /** Ítems que se guardan en el acta 026-xxx (solo Cant. acta > 0). */
  getItemsParaGuardarActa() {
    this.applyCategoriaCapturaToFilasMedicion();
    return (this.actasMedidaData || []).filter(
      (row) =>
        this.actaRowHasActaMeasurement(row) &&
        this.isActaMedidaRowComplete(row)
    );
  }

  /**
   * Si el TOTAL de categoría tiene ancho/alto/fondo/obs y la fila medida no,
   * hereda esos valores al guardar (captura limpia por ítem + atajo por categoría).
   */
  private applyCategoriaCapturaToFilasMedicion(): void {
    for (const g of this.actasContratoGrupos || []) {
      const catCant =
        g.cantidadActa != null && Number.isFinite(Number(g.cantidadActa))
          ? Number(g.cantidadActa)
          : null;

      if (catCant != null && catCant > 0) {
        const validItems = (g.items || []).filter((r) => r.catalogoOk !== false);
        const sinCantidad = validItems.filter(
          (r) => !this.actaRowHasActaMeasurement(r)
        );
        if (sinCantidad.length > 0) {
          if (validItems.length === 1) {
            validItems[0].cantidad = catCant;
          } else {
            const parte = catCant / validItems.length;
            for (const row of validItems) {
              if (!this.actaRowHasActaMeasurement(row)) {
                row.cantidad = parte;
              }
            }
          }
        }
      }

      for (const row of g.items || []) {
        if (!this.actaRowHasActaMeasurement(row)) continue;
        if (row.ancho == null && g.ancho != null) row.ancho = g.ancho;
        if (row.alto == null && g.alto != null) row.alto = g.alto;
        if (row.fondo == null && g.fondo != null) row.fondo = g.fondo;
        if (!String(row.observaciones ?? '').trim() && g.observaciones) {
          row.observaciones = g.observaciones;
        }
      }
    }
  }

  /** Ítems con campos obligatorios completos (evidencia opcional). */
  getCompleteActasMedidaItems() {
    return this.getItemsParaGuardarActa();
  }

  /** @deprecated use getCompleteActasMedidaItems — alias para plantilla. */
  getValidActasMedidaItems() {
    return this.getCompleteActasMedidaItems();
  }

  getActaFormFileFields(): ContractFieldResponse[] {
    return (this.fields || []).filter(
      (f) =>
        f.tipo_dato === 'file' && !this.hiddenFields.has(f.nombre_campo_doc)
    );
  }

  getActaFormDataFields(): ContractFieldResponse[] {
    return (this.fields || []).filter(
      (f) =>
        f.tipo_dato !== 'file' && !this.hiddenFields.has(f.nombre_campo_doc)
    );
  }

  getActaPreviewValue(field: ContractFieldResponse): string {
    const raw = this.form?.get(field.nombre_campo_doc)?.value;
    if (raw instanceof Date) {
      return raw.toLocaleDateString('es-CO');
    }
    if (
      String(field.nombre_campo_doc).toLowerCase() ===
      'am_id_disenador_encargado'
    ) {
      const user = this.workUsers.find(
        (u) => String(u.id_usuario) === String(raw)
      );
      return user?.displayName || String(raw ?? '');
    }
    return String(raw ?? '').trim();
  }

  /**
   * Valida formulario Actas de Medida: sin campos vacíos + al menos un ítem completo.
   * Evidencia por ítem es opcional.
   */
  private validateActaMedidaBeforeSave(): string | null {
    for (const field of this.getActaFormDataFields()) {
      // numero_contrato EAV se rellena desde N° Documento (resolveVinculo).
      if (this.isNumeroContratoFieldName(field.nombre_campo_doc)) {
        continue;
      }
      // Tipo/N° Documento: validarTipoYNumeroDocumento (Tipo es standalone).
      if (this.isTipoDocumentoFieldName(field.nombre_campo_doc)) {
        continue;
      }
      const val = this.form.get(field.nombre_campo_doc)?.value;
      if (val instanceof Date) continue;
      if (val === null || val === undefined || String(val).trim() === '') {
        return `Complete el campo: ${field.desc_campo_doc}`;
      }
    }

    for (const field of this.getActaFormFileFields()) {
      const val = this.form.get(field.nombre_campo_doc)?.value;
      if (!(val instanceof File) && !String(val ?? '').trim()) {
        return `Debe adjuntar: ${field.desc_campo_doc}`;
      }
    }

    const vinculo = this.resolveVinculo();
    if (!vinculo.ok) {
      return vinculo.error || 'Debe seleccionar el N° Documento del catálogo.';
    }

    const errTipoNum = this.validarTipoYNumeroDocumento();
    if (errTipoNum) {
      return errTipoNum;
    }

    const complete = this.getItemsParaGuardarActa();
    if (complete.length === 0) {
      return 'Debe medir al menos un ítem con Cant. acta mayor a cero. En ítems manuales también Detalle, UM, Ancho, Alto y Observaciones.';
    }

    const incomplete = (this.actasMedidaData || []).filter((row) => {
      if (row.esManual) {
        return (
          this.actaMedidaRowHasAnyContent(row) &&
          !this.isActaMedidaRowComplete(row)
        );
      }
      return (
        this.actaRowHasActaMeasurement(row) &&
        !this.isActaMedidaRowComplete(row)
      );
    });
    if (incomplete.length > 0) {
      return 'Hay ítems incompletos. Complete todos los campos del ítem o elimine la fila.';
    }

    const fueraCatalogo = complete.filter(
      (row) =>
        !row.esManual &&
        (row.catalogoOk === false ||
          !row.insumoId ||
          !String(row.insumoCodigo ?? '').trim())
    );
    if (fueraCatalogo.length > 0) {
      const sample = fueraCatalogo
        .slice(0, 6)
        .map((r) => `${r.item}:${r.insumoCodigo || '(sin código)'}`)
        .join(', ');
      return `Hay ítems con insumo fuera del catálogo (${sample}). Regístrelos en Administración → Insumos antes de guardar.`;
    }

    if (!this.actaArchivoAdjunto) {
      return 'Debe adjuntar el archivo del acta (Adjuntar Acta). Es una evidencia por acta.';
    }

    return null;
  }

  // Fun
  private setFechaRemision(): void {
    const fecha = this.form.get('fecha_remision')?.value;

    if (!fecha) {
      this.fechaDia = '';
      this.fechaMes = '';
      this.fechaAnio = '';
      return;
    }

    const date = new Date(fecha);

    this.fechaDia = date.getDate().toString().padStart(2, '0');
    this.fechaMes = (date.getMonth() + 1).toString().padStart(2, '0');
    this.fechaAnio = date.getFullYear().toString();
  }

  manualItem: any = {
    item: '',
    cantidad: '',
    um: '',
    detalle: '',
    observaciones: ''
  };

  addRemisionRow() {
    this.remisionData.push({
      item: '',
      cantidad: 0,
      um: '',
      detalle: '',
      observaciones: ''
    });
  }

  removeRemisionRow(index: number) {
    if (this.remisionData.length > 1) {
      this.remisionData.splice(index, 1);
    }
  }


  addManualItem() {

    if (!this.manualItem.item || !this.manualItem.cantidad) {
      return;
    }

    this.remisionData.push({
      item: this.manualItem.item,
      cantidad: this.manualItem.cantidad,
      um: this.manualItem.um,
      detalle: this.manualItem.detalle,
      observaciones: this.manualItem.observaciones
    });

    this.manualItem = {
      item: '',
      cantidad: '',
      um: '',
      detalle: '',
      observaciones: ''
    };
  }

  removeItem(index: number) {
    this.remisionData.splice(index, 1);
  }

  loadCompanies(): void {
    this.contractsService.getCompanies().subscribe({
      next: (res) => {
        this.companies = res;
        console.log('Empresas cargadas:', this.companies);
      },
      error: (err) => {
        console.error('Error al obtener empresas:', err);
      },
    });
  }

  private loadConstructorasCatalog(): void {
    this.catalogService.getConstructoras().subscribe({
      next: (list: ConstructoraDto[]) => {
        this.constructorasOptions = list.map((c) => ({
          label: c.nombre,
          value: String(c.id),
        }));
        // Si el formulario ya tiene valores (modo edición), sincronizamos selects
        this.syncConstructoraProyectoFromForm();
      },
      error: () => {
        this.constructorasOptions = [];
      },
    });
  }

  /** Misma fuente que Crear Orden de Trabajo: usuarios activos de la BD. */
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
      error: (err) => {
        console.error('Error al obtener usuarios:', err);
        this.workUsers = [];
        this.loadingUsers = false;
      },
    });
  }

  /** Contratos (SP_CONSULTAR_CONTRATOS) — independiente del catálogo N° documento. */
  private loadContratosOptions(): void {
    this.loadingContratos = true;
    this.contractsService.consultarContratos().subscribe({
      next: (res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.contratosOptions = list.map((c) => ({
          label: c.label || c.numero_contrato || c.value,
          value: c.value || c.numero_contrato,
        }));
        this.loadingContratos = false;
      },
      error: (err) => {
        console.error('Error al consultar contratos:', err);
        this.contratosOptions = [];
        this.loadingContratos = false;
      },
    });
  }

  /**
   * Catálogo documento_numero → N° (constructora/proyecto + tipo Contrato/Cotizacion…).
   */
  private loadDocumentoNumeroOptions(): void {
    const idProyecto = this.selectedProyectoId
      ? Number(this.selectedProyectoId)
      : null;
    const tipo = String(this.selectedTipoConsecutivo || '').trim();

    if (
      !idProyecto ||
      !Number.isFinite(idProyecto) ||
      idProyecto <= 0 ||
      !tipo
    ) {
      this.documentoNumeroOptions = [];
      return;
    }

    this.loadingDocumentoNumero = true;
    this.administracionService
      .listarDocumentosNumero({
        id_proyecto: idProyecto,
        tipo_doc: tipo,
        estado: 'ACTIVO',
      })
      .subscribe({
        next: (res) => {
          const list = Array.isArray(res?.data) ? res.data : [];
          this.documentoNumeroOptions = list.map((d) => ({
            label: String(d.numero_documento || '').trim(),
            value: String(d.numero_documento || '').trim(),
          }));
          this.loadingDocumentoNumero = false;
        },
        error: () => {
          this.documentoNumeroOptions = [];
          this.loadingDocumentoNumero = false;
        },
      });
  }

  /** Copia N° Documento (catálogo) → numero_contrato oculto para guardado EAV. */
  private syncContratoNumeroFromCatalog(): void {
    if (this.selectedType !== 'CONTRATO' || !this.form?.contains('numero_contrato')) {
      return;
    }
    const numero = this.resolveNumeroDocumentoPersistido();
    this.form.patchValue({ numero_contrato: numero }, { emitEvent: false });
  }

  private setupContratoNumeroSync(): void {
    if (this.selectedType !== 'CONTRATO' || !this.form) return;
    const docField = this.getContratoField('numero_documento');
    const docName = docField?.nombre_campo_doc;
    if (!docName) return;
    const ctrl = this.form.get(docName);
    if (!ctrl) return;
    ctrl.valueChanges.subscribe(() => this.syncContratoNumeroFromCatalog());
  }

  onTipoConsecutivoChange(tipo: string | null): void {
    this.selectedTipoConsecutivo = tipo;
    this.clearTipoDocumentoFields();
    this.syncTipoDocumentoControlsEnabled();
    this.loadDocumentoNumeroOptions();
    if (this.selectedType === 'ACTAS DE MEDIDA') {
      this.sinContrato = false;
      this.clearActaContratoContext();
      this.ensureActaManualesSiCotizacion();
    }
    if (this.selectedType === 'REMISIONES') {
      this.sinContrato = false;
      this.applyVinculoToForm('');
      this.clearRemisionContratoCard();
    }
  }

  /** enable/disable del N° Documento según proyecto + tipo (evita [disabled] en template). */
  private syncTipoDocumentoControlsEnabled(): void {
    if (!this.form) return;
    const enable = !!(this.selectedProyectoId && this.selectedTipoConsecutivo);
    const names = new Set<string>();
    for (const f of this.fields || []) {
      if (this.isTipoDocumentoFieldName(f.nombre_campo_doc)) {
        names.add(f.nombre_campo_doc);
      }
    }
    const actaTipo = this.getActaField('tipo_doc');
    if (actaTipo?.nombre_campo_doc) names.add(actaTipo.nombre_campo_doc);
    for (const name of names) {
      const c = this.form.get(name);
      if (!c) continue;
      if (enable && c.disabled) c.enable({ emitEvent: false });
      if (!enable && !c.disabled) c.disable({ emitEvent: false });
    }
  }

  /** Valor del select Tipo documento (Contrato, Cotizacion…) a persistir. */
  private resolveTipoConsecutivoPersistido(): string {
    return String(this.selectedTipoConsecutivo || '').trim();
  }

  /** N° Documento elegido del catálogo de administración (solo selección). */
  private resolveNumeroDocumentoPersistido(): string {
    if (!this.form) return '';
    // getRawValue: incluye controles disabled (p.ej. mientras carga el catálogo).
    const raw = this.form.getRawValue?.() ?? this.form.value ?? {};

    const read = (name: string | null | undefined): string => {
      if (!name) return '';
      const fromCtrl = this.form!.get(name)?.value;
      const v = fromCtrl !== undefined && fromCtrl !== null ? fromCtrl : raw[name];
      return String(v ?? '').trim();
    };

    for (const f of this.fields || []) {
      if (!this.isTipoDocumentoFieldName(f.nombre_campo_doc)) continue;
      const v = read(f.nombre_campo_doc);
      if (v) return v;
    }

    const known = [
      'tipo_doc_rem',
      'tipo_doc',
      'tipo_doc_acta',
      'am_tipo_doc',
      'tipo_documento',
      'tipo_documento_acta',
      'tipo_documento_actap',
      'tipo_doc_contratista',
    ];
    for (const name of known) {
      if (!this.form.get(name)) continue;
      const v = read(name);
      if (v) return v;
    }

    // Layout Actas: slot tipo_doc (incluye tipo_doc_contratista)
    const actaTipo = this.getActaField('tipo_doc');
    if (actaTipo) {
      return read(actaTipo.nombre_campo_doc);
    }

    return '';
  }

  /**
   * Persiste el tipo de catálogo (Contrato, OrdenDT, Cotizacion…).
   * En CONTRATO el campo visible tipo_contrato = Suministro/Instalación → va en tipo_doc_catalogo.
   */
  private buildTipoConsecutivoCampos(): { nombre: string; valor: string }[] {
    const tipo = this.resolveTipoConsecutivoPersistido();
    if (!tipo) return [];
    const fieldName =
      this.selectedType === 'CONTRATO' ? 'tipo_doc_catalogo' : 'tipo_contrato';
    return [{ nombre: fieldName, valor: tipo }];
  }

  private validarTipoYNumeroDocumento(): string | null {
    if (!this.resolveTipoConsecutivoPersistido()) {
      return 'Debe seleccionar Tipo documento (Contrato, Cotización, Oferta…).';
    }
    const numero = this.resolveNumeroDocumentoPersistido();
    if (!numero) {
      return 'Debe seleccionar el N° Documento del catálogo de administración.';
    }
    // Solo selección: no permitir N° digitado fuera del catálogo (rompe amarre).
    const enCatalogo = (this.documentoNumeroOptions || []).some(
      (o) => String(o.value ?? '').trim() === numero
    );
    if (!enCatalogo) {
      return 'El N° Documento debe elegirse de la lista del catálogo (Administración). No se admite digitar uno nuevo aquí.';
    }
    return null;
  }

  isTipoDocumentoFieldName(nombre: string | null | undefined): boolean {
    const n = String(nombre || '').toLowerCase();
    return (
      n === 'tipo_doc_rem' ||
      n === 'tipo_doc' ||
      n === 'tipo_doc_acta' ||
      n === 'am_tipo_doc' ||
      n === 'tipo_documento' ||
      n === 'tipo_documento_acta' ||
      n === 'tipo_documento_actap' ||
      n === 'tipo_doc_contratista'
    );
  }

  /** Tipos que permiten crear con contrato o con N° cotización (excepto CONTRATO, Actas y Remisiones). */
  supportsVinculoSinContrato(): boolean {
    // Actas / Remisiones: vínculo = N° Documento del catálogo (sin toggle Sin contrato).
    if (!this.selectedType || this.selectedType === 'CONTRATO') {
      return false;
    }
    if (
      this.selectedType === 'ACTAS DE MEDIDA' ||
      this.selectedType === 'REMISIONES'
    ) {
      return false;
    }
    if (this.fields?.length) {
      return this.fields.some((f) =>
        this.isNumeroContratoFieldName(f.nombre_campo_doc)
      );
    }
    return (
      this.selectedType === 'ORDEN DE COMPRA' ||
      this.selectedType === 'ACTAS DE PAGO'
    );
  }

  isNumeroContratoFieldName(nombre: string | null | undefined): boolean {
    const n = String(nombre || '').toLowerCase();
    return (
      n === 'numero_contrato' ||
      n === 'contrato' ||
      n === 'am_numero_contrato' ||
      n === 'contrato_no' ||
      n === 'no_contrato'
    );
  }

  onSinContratoChange(): void {
    this.numeroCotizacion = '';
    const contratoField = this.getContratoFormControl();
    if (this.sinContrato) {
      contratoField?.setValue('', { emitEvent: false });
      contratoField?.setValidators([Validators.required]);
      contratoField?.updateValueAndValidity({ emitEvent: false });
      if (this.selectedType === 'ACTAS DE MEDIDA') {
        this.contratosOptions = [];
        this.clearActaContratoContext(false);
        this.actasMedidaData = [this.createEmptyActaMedidaRow(true)];
        this.actaCategoriasExpandidas = new Set();
      }
    } else if (contratoField) {
      contratoField.setValue(null, { emitEvent: false });
      if (this.selectedType === 'ACTAS DE MEDIDA') {
        contratoField.setValidators([Validators.required]);
        this.loadContratosFiltradosActa();
        this.clearActaContratoContext();
      } else {
        contratoField.clearValidators();
      }
      contratoField.updateValueAndValidity({ emitEvent: false });
    }
  }

  private getContratoFormControl() {
    if (!this.form) return null;
    const actaField = this.getActaField('contrato');
    if (actaField) {
      return this.form.get(actaField.nombre_campo_doc);
    }
    for (const name of [
      'numero_contrato',
      'contrato',
      'am_numero_contrato',
      'contrato_no',
      'no_contrato',
    ]) {
      const ctrl = this.form.get(name);
      if (ctrl) return ctrl;
    }
    return null;
  }

  /**
   * Resuelve la clave de amarre.
   * Actas / Remisiones: N° Documento del catálogo (= número de contrato/cotización).
   * Otros: contrato seleccionado o cotización libre (Sin contrato).
   */
  private resolveVinculo(): {
    ok: boolean;
    clave: string;
    tipo_vinculo: 'CONTRATO' | 'COTIZACION';
    error?: string;
  } {
    if (
      this.selectedType === 'ACTAS DE MEDIDA' ||
      this.selectedType === 'REMISIONES'
    ) {
      const clave = this.resolveNumeroDocumentoPersistido();
      const tipoCot =
        this.selectedType === 'ACTAS DE MEDIDA'
          ? this.esTipoCotizacionActa()
          : this.esTipoCotizacionRemision();
      const tipo_vinculo: 'CONTRATO' | 'COTIZACION' = tipoCot
        ? 'COTIZACION'
        : 'CONTRATO';
      if (!clave) {
        return {
          ok: false,
          clave: '',
          tipo_vinculo,
          error:
            'Debe seleccionar el N° Documento del catálogo de administración.',
        };
      }
      const enCatalogo = (this.documentoNumeroOptions || []).some(
        (o) => String(o.value ?? '').trim() === clave
      );
      if (!enCatalogo) {
        return {
          ok: false,
          clave: '',
          tipo_vinculo,
          error:
            'El N° Documento debe elegirse de la lista del catálogo (Administración).',
        };
      }
      return { ok: true, clave, tipo_vinculo };
    }

    if (this.sinContrato) {
      const cot = String(
        this.getContratoFormControl()?.value ?? this.numeroCotizacion ?? ''
      ).trim();
      this.numeroCotizacion = cot;
      if (!cot) {
        return {
          ok: false,
          clave: '',
          tipo_vinculo: 'COTIZACION',
          error: 'Debe indicar el N° Cotización en el formulario (campo N° Cotización).',
        };
      }
      return { ok: true, clave: cot, tipo_vinculo: 'COTIZACION' };
    }

    const ctrl = this.getContratoFormControl();
    const clave = String(ctrl?.value ?? this.form?.get('numero_contrato')?.value ?? '').trim();
    if (!clave) {
      return {
        ok: false,
        clave: '',
        tipo_vinculo: 'CONTRATO',
        error: 'Debe seleccionar el N° Contrato o marcar Sin contrato e indicar N° Cotización.',
      };
    }
    return { ok: true, clave, tipo_vinculo: 'CONTRATO' };
  }

  /** Escribe la clave en el control numero_contrato del formulario. */
  private applyVinculoToForm(clave: string): void {
    const ctrl = this.getContratoFormControl();
    if (ctrl) {
      ctrl.setValue(clave, { emitEvent: false });
      ctrl.updateValueAndValidity({ emitEvent: false });
    } else if (this.form?.contains('numero_contrato')) {
      this.form.patchValue({ numero_contrato: clave }, { emitEvent: false });
    }
  }

  /** Campos EAV extras para discriminar vínculo (no rompen consultas existentes). */
  private buildVinculoCampos(
    tipo: 'CONTRATO' | 'COTIZACION',
    clave: string
  ): Array<{ nombre: string; valor: string }> {
    return [
      { nombre: 'tipo_vinculo', valor: tipo },
      {
        nombre: 'numero_cotizacion',
        valor: tipo === 'COTIZACION' ? clave : '',
      },
    ];
  }

  private resetVinculoState(): void {
    this.sinContrato = false;
    this.numeroCotizacion = '';
  }

  /** Solo en ACTAS DE MEDIDA: am_id_disenador_encargado → dropdown usuarios activos. */
  isDisenadorEncargadoField(field: ContractFieldResponse): boolean {
    if (this.selectedType !== 'ACTAS DE MEDIDA') {
      return false;
    }
    return (
      String(field?.nombre_campo_doc ?? '').toLowerCase() ===
      'am_id_disenador_encargado'
    );
  }

  /** Solo en CONTRATO: encargado_contrato → dropdown usuarios activos. */
  isEncargadoContratoField(field: ContractFieldResponse): boolean {
    if (this.selectedType !== 'CONTRATO') {
      return false;
    }
    return (
      String(field?.nombre_campo_doc ?? '').toLowerCase() ===
      'encargado_contrato'
    );
  }

  /** Garantiza encargado_contrato en el formulario Contrato (EAV). */
  private ensureContratoEncargadoField(
    fields: ContractFieldResponse[]
  ): ContractFieldResponse[] {
    if (this.selectedType !== 'CONTRATO') return fields;
    const exists = fields.some(
      (f) =>
        String(f.nombre_campo_doc || '').toLowerCase() === 'encargado_contrato'
    );
    if (exists) return fields;
    return [
      ...fields,
      {
        nombre_campo_doc: 'encargado_contrato',
        desc_campo_doc: 'Encargado Contrato',
        estadocampo: '1',
        tipo_dato: 'number',
      },
    ];
  }

  /**
   * Slots del layout fijo de Contrato (filas 1–2).
   */
  private readonly CONTRATO_LAYOUT_ALIASES: Record<string, string[]> = {
    constructora: ['empresa', 'constructora'],
    proyecto: ['proyecto'],
    numero_documento: ['tipo_doc_contratista'],
    empresa_asociada: ['empresa_asociada'],
    ciudad_empresa: ['ciudad_empresa'],
  };

  getContratoField(slot: string): ContractFieldResponse | null {
    const aliases = (this.CONTRATO_LAYOUT_ALIASES[slot] || []).map((a) =>
      a.toLowerCase()
    );
    if (!aliases.length) return null;

    const byName =
      (this.fields || []).find((f) =>
        aliases.includes(String(f.nombre_campo_doc || '').toLowerCase())
      ) || null;
    if (byName) return byName;

    const descAliases: Record<string, string[]> = {
      constructora: ['constructora', 'empresa'],
      proyecto: ['proyecto'],
      numero_documento: ['tipo doc', 'n° documento', 'numero documento'],
      empresa_asociada: ['empresa asociada'],
      ciudad_empresa: ['ciudad proyecto', 'ciudad'],
    };

    const normalize = (s: string) =>
      String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const wanted = (descAliases[slot] || []).map(normalize);
    if (!wanted.length) return null;

    return (
      (this.fields || []).find((f) => {
        const desc = normalize(f.desc_campo_doc || '');
        return wanted.some((w) => desc.includes(w));
      }) || null
    );
  }

  /** Campos del layout fijo de Contrato (no se repiten en el grid genérico). */
  isContratoLayoutField(field: ContractFieldResponse): boolean {
    if (this.selectedType !== 'CONTRATO') return false;
    return Object.keys(this.CONTRATO_LAYOUT_ALIASES).some(
      (slot) =>
        this.getContratoField(slot)?.nombre_campo_doc === field.nombre_campo_doc
    );
  }

  /**
   * Slots del layout de Actas de Medida (3 filas).
   * Aliases por si el nombre en BD varía ligeramente.
   */
  private readonly ACTA_LAYOUT_ALIASES: Record<string, string[]> = {
    consecutivo: ['consecutivo'],
    constructora: ['constructora'],
    proyecto: ['proyecto'],
    tipo_doc: [
      'tipo_doc',
      'tipo_doc_acta',
      'am_tipo_doc',
      'tipo_documento',
      'tipo_documento_acta',
      'tipo_doc_contratista',
    ],
    contrato: [
      'numero_contrato',
      'contrato',
      'am_numero_contrato',
      'contrato_no',
      'no_contrato',
    ],
    fecha_acta: ['fecha_acta', 'fecha acta', 'am_fecha_acta'],
    detalle: ['detalle', 'detalle_acta', 'am_detalle', 'acta_produccion'],
    disenador: ['am_id_disenador_encargado'],
    fecha_plano: [
      'fecha_entrega_plano',
      'fecha entrega plano',
      'am_fecha_entrega_plano',
      'fecha terminación',
      'fecha_terminacion',
    ],
    observaciones: ['observaciones'],
  };

  getActaField(slot: string): ContractFieldResponse | null {
    const aliases = (this.ACTA_LAYOUT_ALIASES[slot] || []).map((a) =>
      a.toLowerCase()
    );
    if (!aliases.length) return null;

    const byName =
      (this.fields || []).find((f) =>
        aliases.includes(String(f.nombre_campo_doc || '').toLowerCase())
      ) || null;
    if (byName) return byName;

    // Fallback por descripción (ej. "Tipo de Doc", "Contrato No.")
    const descAliases: Record<string, string[]> = {
      tipo_doc: ['tipo de doc', 'tipo doc', 'tipo de documento'],
      contrato: [
        'contrato no',
        'numero de contrato',
        'número de contrato',
        'no. contrato',
        'no contrato',
      ],
      fecha_acta: ['fecha acta', 'fecha del acta'],
      detalle: ['detalle'],
      fecha_plano: ['fecha entrega', 'entrega plano'],
      disenador: ['diseñador', 'disenador'],
      observaciones: ['observaciones'],
      consecutivo: ['consecutivo'],
      constructora: ['constructora'],
      proyecto: ['proyecto'],
    };

    const normalize = (s: string) =>
      String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const wanted = (descAliases[slot] || []).map(normalize);
    if (!wanted.length) return null;

    return (
      (this.fields || []).find((f) => {
        const desc = normalize(f.desc_campo_doc || '');
        return wanted.some((w) => desc.includes(w));
      }) || null
    );
  }

  /** Campos del layout fijo de Actas (no se repiten en el grid genérico). */
  isActaLayoutField(field: ContractFieldResponse): boolean {
    if (this.selectedType !== 'ACTAS DE MEDIDA') return false;
    return Object.keys(this.ACTA_LAYOUT_ALIASES).some(
      (slot) =>
        this.getActaField(slot)?.nombre_campo_doc === field.nombre_campo_doc
    );
  }

  onConstructoraChangeForForm(id: string | null, constructoraControlName: string = 'constructora'): void {
    // console.log para depuración; se puede retirar después
    // console.log('Constructora seleccionada id:', id);
    this.selectedConstructoraId = id;
    this.selectedProyectoId = null;
    this.selectedTipoConsecutivo = null;
    this.proyectosOptions = [];
    this.documentoNumeroOptions = [];

    if (!this.form) return;

    if (!id) {
      const patch: any = {};
      patch[constructoraControlName] = '';
      patch['proyecto'] = '';
      this.form.patchValue(patch);
      this.clearTipoDocumentoFields();
      this.syncTipoDocumentoControlsEnabled();
      if (this.selectedType === 'ACTAS DE MEDIDA') {
        this.contratosOptions = [];
        this.clearActaContratoContext();
      }
      if (this.selectedType === 'REMISIONES') {
        this.applyVinculoToForm('');
        this.clearRemisionContratoCard();
      }
      return;
    }

    const cons = this.constructorasOptions.find((c) => c.value === id);
    const patch: any = {};
    patch[constructoraControlName] = cons?.label ?? '';
    patch['proyecto'] = '';
    this.form.patchValue(patch);
    this.clearTipoDocumentoFields();
    this.syncTipoDocumentoControlsEnabled();

    if (this.selectedType === 'ACTAS DE MEDIDA') {
      this.contratosOptions = [];
      this.clearActaContratoContext();
    }
    if (this.selectedType === 'REMISIONES') {
      this.applyVinculoToForm('');
      this.clearRemisionContratoCard();
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

  onProyectoChangeForForm(id: string | null): void {
    this.selectedProyectoId = id;
    this.selectedTipoConsecutivo = null;
    this.documentoNumeroOptions = [];
    if (!this.form) return;
    const nombre =
      this.proyectosOptions.find((p) => p.value === id)?.label ?? '';
    this.form.patchValue({ proyecto: nombre });
    this.clearTipoDocumentoFields();
    this.syncTipoDocumentoControlsEnabled();

    if (this.selectedType === 'ACTAS DE MEDIDA') {
      const ctrl = this.getContratoFormControl();
      ctrl?.setValue(null, { emitEvent: false });
      ctrl?.clearValidators();
      ctrl?.updateValueAndValidity({ emitEvent: false });
      this.sinContrato = false;
      this.clearActaContratoContext();
      // Ya no se usa el select de contratos filtrados en Actas.
    }
    if (this.selectedType === 'REMISIONES') {
      this.sinContrato = false;
      this.applyVinculoToForm('');
      this.clearRemisionContratoCard();
    }
  }

  /** Limpia Tipo Documento al cambiar constructora/proyecto. */
  private clearTipoDocumentoFields(): void {
    if (!this.form) return;
    const patch: Record<string, string> = {};
    const known = [
      'tipo_doc_rem',
      'tipo_doc',
      'tipo_doc_acta',
      'am_tipo_doc',
      'tipo_documento',
      'tipo_documento_acta',
      'tipo_documento_actap',
      'tipo_doc_contratista',
    ];
    for (const name of known) {
      if (this.form.get(name)) {
        patch[name] = '';
      }
    }
    for (const f of this.fields || []) {
      if (this.isTipoDocumentoFieldName(f.nombre_campo_doc)) {
        patch[f.nombre_campo_doc] = '';
      }
    }
    if (Object.keys(patch).length) {
      this.form.patchValue(patch);
    }
  }

  /**
   * Sincroniza los selects de constructora/proyecto a partir de los valores
   * actuales del formulario (útil si venimos con datos precargados).
   */
  private syncConstructoraProyectoFromForm(): void {
    if (!this.form || !this.constructorasOptions.length) return;

    const constructoraControlName =
      this.form.get('constructora') ? 'constructora' :
      this.form.get('cliente') ? 'cliente' :
      this.form.get('empresa') ? 'empresa' :
      null;

    if (!constructoraControlName) return;

    const currentConstructora: string =
      this.form.value[constructoraControlName] ?? '';
    if (!currentConstructora) return;

    const cons = this.constructorasOptions.find(
      (c) => c.label === currentConstructora
    );
    if (!cons) return;

    this.selectedConstructoraId = cons.value;

    // Cargar proyectos para esa constructora y preseleccionar proyecto si existe
    this.catalogService.getProyectosByConstructora(cons.value).subscribe({
      next: (list: ProyectoDto[]) => {
        this.proyectosOptions = list.map((p) => ({
          label: p.nombre,
          value: String(p.id),
        }));

        const currentProyecto: string = this.form.value['proyecto'] ?? '';
        if (!currentProyecto) return;

        const proj = this.proyectosOptions.find(
          (p) => p.label === currentProyecto
        );
        if (proj) {
          this.selectedProyectoId = proj.value;
        }
      },
      error: () => {
        this.proyectosOptions = [];
      },
    });
  }


  get currentStatusOptions() {
    return this.statusOptionsByType[this.selectedType] || [];
  }

  getFotoUrl(campo: string): string | null {
    const value = this.form.value[campo];
    if (!value) return null;
  
    if (value instanceof File) {
      return URL.createObjectURL(value);
    }
  
    return value;
  }

  // * ====== CARGA DE TIPOS DOCUMENTOS ======
  loadContractTypes(): void {
  this.contractsService.getTypeContract().subscribe({
    next: (types) => {
      this.contractTypes = types.map((t: any) => ({
        ...t,
        tipo_doc: t.tipo_doc ? t.tipo_doc.toUpperCase() : t.tipo_doc
      }));
      this.applyProfileFilter();
      this.applyTipoFromQuery();
    },
    error: (err) => {
      console.error('Error al cargar tipos de contrato', err);
    },
    });
  }

  applyProfileFilter() {
    const allowed = this.DOCUMENTS_BY_PROFILE[this.userProfile] || [];
    this.filteredContractTypes = this.contractTypes
      .filter(doc => allowed.includes(doc.tipo_doc));
  }

  /** Preselecciona el tipo enviado desde el hub (?tipo=REMISIONES). */
  private applyTipoFromQuery(): void {
    const tipo = String(this.route.snapshot.queryParamMap.get('tipo') || '')
      .trim()
      .toUpperCase();

    if (!tipo) {
      this.typeFromHub = false;
      return;
    }

    const allowed = this.filteredContractTypes.some((d) => d.tipo_doc === tipo);
    if (!allowed) {
      this.typeFromHub = false;
      Swal.fire({
        icon: 'warning',
        title: 'Tipo no disponible',
        text: 'No tiene permiso para crear este documento o el tipo no existe.',
        confirmButtonColor: '#20506A',
      }).then(() => this.volverAlHub());
      return;
    }

    this.typeFromHub = true;
    this.selectedType = tipo;
    this.onTypeChange();
  }

  // ====== CAMBIO DE TIPO ======
  onTypeChange(): void {
    if (!this.selectedType) return;

    this.ocFileAlreadySaved = false;
    // reset previews al cambiar tipo
    this.showPreviewContrato = false;
    this.showPreviewVisita = false;
    this.showPreviewActa = false;
    this.showPreviewRemision = false;
    this.remisionWasPreviewed = false;
    this.resetActasMedidaData();
    this.resetVinculoState();

    if (
      this.selectedType === 'ACTAS DE MEDIDA' ||
      this.selectedType === 'REMISIONES' ||
      this.selectedType === 'ORDEN DE COMPRA' ||
      this.selectedType === 'ACTAS DE PAGO' ||
      this.supportsVinculoSinContrato()
    ) {
      if (
        this.selectedType === 'ACTAS DE MEDIDA' ||
        this.selectedType === 'REMISIONES'
      ) {
        this.contratosOptions = [];
      } else {
        this.loadContratosOptions();
      }
    }
    this.loadDocumentoNumeroOptions();

    // Actas de Pago: lógica aislada en app-payment-certificate
    if (this.selectedType === 'ACTAS DE PAGO') {
      this.fields = [];
      return;
    }

    this.contractsService.getTypeFields(this.selectedType).subscribe({
      next: (fields) => {
        let camposActivos = fields.filter((f) => f.estadocampo === '1');
        camposActivos = this.ensureContratoEncargadoField(camposActivos);

        let orden: string[] = [];
        this.hiddenFields = new Set<string>();

        if (this.selectedType === 'CONTRATO') {
          this.hiddenFields.add('nit_empresa');
          this.hiddenFields.add('numero_contrato');
          orden = [
            'empresa',
            'proyecto',
            'tipo_doc_contratista',
            'empresa_asociada',
            'ciudad_empresa',
            'tipo_contrato',
            'estado',
            'fecha_inicio',
            'fecha_fin',
            'valor_contrato',
            'descripcion',
            'porcentaje_anticipo',
            'Valor anticipo',
            'estado_pago_anticipo',
            'rete_garantia',
            'valor_r_garantia',
            'estado_pago_r_garantia',
            'polizas',
            'valor_polizas_in',
            'estado_polizas_in',
            'polizas_finales',
            'valor_polizas_fin',
            'estado_polizas_fin',
            'encargado_contrato',
          ];
        } else if (this.selectedType === 'ASISTENCIA') {
          orden = [
            'consecutivo',
            'constructora',
            'proyecto',
            'ubicacion',
            'detalle_visita',
            'foto1',
            'foto2',
          ];
          this.hiddenFields.add('fecha');
        }
        else if (this.selectedType === 'ACTAS DE MEDIDA') {
          orden = [
            'consecutivo',
            'constructora',
            'proyecto',
            'tipo_doc',
            'tipo_doc_acta',
            'am_tipo_doc',
            'tipo_documento',
            'tipo_documento_acta',
            'tipo_doc_contratista',
            'numero_contrato',
            'contrato',
            'am_numero_contrato',
            'fecha_acta',
            'fecha acta',
            'am_fecha_acta',
            'detalle',
            'detalle_acta',
            'am_detalle',
            'acta_produccion',
            'am_id_disenador_encargado',
            'fecha_entrega_plano',
            'fecha entrega plano',
            'am_fecha_entrega_plano',
            'fecha terminación',
            'fecha_terminacion',
            'observaciones',
            'estado',
            'despiece_material',
            'foto1',
            'foto2',
            'foto3',
          ];
        } else if (this.selectedType === 'REMISIONES') {
          // Constructora → Proyecto → Tipo/N° documento
          // numero_contrato se guarda internamente = N° Documento (oculto)
          this.hiddenFields.add('numero_contrato');
          this.hiddenFields.add('contrato');
          orden = [
            'constructora',
            'cliente',
            'proyecto',
            'tipo_doc_rem',
          ];
        }
        // Reordenamos primero los definidos en `orden`
        const camposOrdenados = [
          ...orden.flatMap((key) =>
            camposActivos.filter((f) => f.nombre_campo_doc === key)
          ),
          // luego los demás
          ...camposActivos.filter((f) => !orden.includes(f.nombre_campo_doc)),
        ];

        // Primero el FormGroup, luego fields: evita que el *ngFor renderice
        // controles que aún no existen y deje el formulario a medias.
        this.buildForm(camposOrdenados);
        this.fields = camposOrdenados;
        this.syncTipoDocumentoControlsEnabled();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar campos', err),
    });
  }

  // ====== FORM DINÁMICO ======
  buildForm(fields: ContractFieldResponse[]) {
    this.selectedConstructoraId = null;
    this.selectedProyectoId = null;
    this.selectedTipoConsecutivo = null;
    this.documentoNumeroOptions = [];
    this.proyectosOptions = [];

    const group: { [key: string]: any } = {};
    fields.forEach((field) => {
      // Actas: consecutivo automático bloqueado.
      // Remisiones: se sugiere por API pero queda editable (parche operativo).
      const isAutoConsecutivo =
        this.selectedType === 'ACTAS DE MEDIDA' &&
        field.nombre_campo_doc === 'consecutivo';
      const validators =
        this.selectedType === 'ACTAS DE MEDIDA' ||
        (this.selectedType === 'REMISIONES' &&
          field.nombre_campo_doc === 'remision_material')
          ? [Validators.required]
          : [];
      group[field.nombre_campo_doc] = [
        { value: '', disabled: isAutoConsecutivo },
        validators,
      ];
    });
    this.form = this.fb.group(group);

    if (this.selectedType === 'REMISIONES') {
      this.form.addControl('elaboro', this.fb.control(''));

      // Actualizar fecha automáticamente cuando cambie
      this.form.get('fecha_remision')?.valueChanges.subscribe(() => {
        this.setFechaRemision();
      });
    }

    const nombre = localStorage.getItem('nombreUsuario');
    const apellido = localStorage.getItem('apellidoUsuario');

    if (nombre && apellido && this.form.get('elaboro')) {
      this.form.patchValue({
        elaboro: `${nombre} ${apellido}`,
      });
    }

    this.form.get('empresa_asociada')?.valueChanges.subscribe((value) => {
      this.setEmpresaImpresion();
      if (this.selectedType === 'REMISIONES') {
        this.cargarSiguienteConsecutivoRemision(value);
      }
    });

    // Si el formulario trae constructora/proyecto precargados, sincronizamos selects
    this.syncConstructoraProyectoFromForm();
    this.setupContratoNumeroSync();
    this.formatMonetaryFieldsInForm();

    if (this.selectedType === 'ACTAS DE MEDIDA') {
      this.sinContrato = false;
      const contratoCtrl = this.getContratoFormControl();
      // Campo EAV numero_contrato queda oculto; se rellena al elegir N° Documento.
      contratoCtrl?.clearValidators();
      contratoCtrl?.setValue(null, { emitEvent: false });
      contratoCtrl?.updateValueAndValidity({ emitEvent: false });
      this.resetActasMedidaData();
      this.cargarSiguienteConsecutivoActa();
    }

    if (this.selectedType === 'REMISIONES') {
      this.sinContrato = false;
      const contratoCtrl = this.getContratoFormControl();
      // Campo EAV numero_contrato oculto; se rellena al elegir N° Documento.
      contratoCtrl?.clearValidators();
      contratoCtrl?.setValue(null, { emitEvent: false });
      contratoCtrl?.updateValueAndValidity({ emitEvent: false });
      this.clearRemisionContratoCard();
      const empresaInicial = this.form.get('empresa_asociada')?.value;
      if (empresaInicial != null && String(empresaInicial).trim() !== '') {
        this.cargarSiguienteConsecutivoRemision(empresaInicial);
      }
    }
  }

  /** Actas: asigna 026-xxx automático (readonly). */
  private cargarSiguienteConsecutivoActa(): void {
    const ctrl = this.form?.get('consecutivo');
    if (!ctrl) return;
    this.contractsService
      .siguienteConsecutivo({ tipo: 'ACTAS_DE_MEDIDA' })
      .subscribe({
        next: (res) => {
          const value = String(res?.consecutivo ?? '').trim();
          if (!value) return;
          ctrl.enable({ emitEvent: false });
          ctrl.setValue(value, { emitEvent: false });
          ctrl.disable({ emitEvent: false });
        },
        error: (err) => {
          console.error('Error al obtener consecutivo de acta', err);
          Swal.fire(
            'Atención',
            err?.error?.mensaje ||
              'No se pudo obtener el siguiente consecutivo del acta.',
            'warning'
          );
        },
      });
  }

  /** Remisiones: sugiere SM/HS+número; el usuario puede corregirlo a mano. */
  private cargarSiguienteConsecutivoRemision(
    empresaAsociada: unknown
  ): void {
    const ctrl = this.form?.get('remision_material');
    if (!ctrl) return;
    const empresa = String(empresaAsociada ?? '').trim();
    if (empresa !== '1' && empresa !== '2') {
      ctrl.enable({ emitEvent: false });
      ctrl.setValue('', { emitEvent: false });
      return;
    }

    this.contractsService
      .siguienteConsecutivo({
        tipo: 'REMISIONES',
        empresa_asociada: empresa,
      })
      .subscribe({
        next: (res) => {
          const value = String(res?.consecutivo ?? '').trim();
          ctrl.enable({ emitEvent: false });
          if (value) {
            ctrl.setValue(value, { emitEvent: false });
          }
        },
        error: (err) => {
          console.error('Error al obtener consecutivo de remisión', err);
          ctrl.enable({ emitEvent: false });
          Swal.fire(
            'Atención',
            (err?.error?.mensaje ||
              'No se pudo obtener el siguiente consecutivo de remisión.') +
              ' Puede digitarlo manualmente.',
            'warning'
          );
        },
      });
  }

  // ====== FILE HANDLERS ======
  onFileChange(event: Event, fieldName: string) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.form.patchValue({ [fieldName]: input.files[0] });
    }
  }

  /** Normaliza encabezados Excel (misma lógica que el backend AIU/IVA). */
  private normalizeExcelHeader(value: unknown): string {
    return String(value ?? '')
      .toUpperCase()
      .replace(/[.\s_%°]/g, '')
      .replace(/%/g, '')
      .trim();
  }

  private readonly AIU_EXPECTED_HEADERS = [
    'REF',
    'EMPRESA',
    'NOCONTRATO',
    'ITEM',
    'INSUMO',
    'CANT',
    'UM',
    'ANCHO',
    'ALTO',
    'DESCRIPCION',
    'VALORBASE',
    'ADM',
    'VRADM',
    'IMP',
    'VRIMP',
    'UT',
    'VRUT',
    'IVA',
    'VRIVA',
    'VRTOTAL',
  ];

  /** Busca hoja AIU y la fila de encabezados (no siempre es la fila 1). */
  private findAiuSheetContext(workbook: XLSX.WorkBook): {
    sheetName: string;
    headerRowIndex: number;
    jsonData: unknown[][];
  } | null {
    const names = workbook.SheetNames || [];
    const ordered = [
      ...names.filter((n) => String(n).trim().toUpperCase() === 'AIU'),
      ...names.filter((n) => String(n).trim().toUpperCase() !== 'AIU'),
    ];

    for (const name of ordered) {
      const sheet = workbook.Sheets[name];
      if (!sheet) continue;
      const jsonData = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
      }) as unknown[][];
      const headerRowIndex = this.findAiuHeaderRowIndex(jsonData);
      if (headerRowIndex >= 0) {
        return { sheetName: name, headerRowIndex, jsonData };
      }
    }
    return null;
  }

  private findAiuHeaderRowIndex(jsonData: unknown[][]): number {
    for (let i = 0; i < Math.min(40, jsonData.length); i++) {
      const cells = (jsonData[i] || [])
        .map((h) => this.normalizeExcelHeader(h))
        .filter(Boolean);
      const set = new Set(cells);
      if (set.has('ITEM') && set.has('INSUMO') && set.has('CANT')) {
        return i;
      }
    }
    return -1;
  }

  private validateAiuHeaderRow(headerRow: unknown[]): boolean {
    const headers = (headerRow || [])
      .map((h) => this.normalizeExcelHeader(h))
      .filter(Boolean);
    const set = new Set(headers);
    const hasContrato = headers.some(
      (h) => h.includes('CONTRATO') || h === 'NOCONTRATO'
    );
    if (!hasContrato) return false;
    return this.AIU_EXPECTED_HEADERS.every((expected) => {
      if (expected === 'NOCONTRATO') return hasContrato;
      return set.has(expected);
    });
  }

  onAIUFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      Swal.fire('Advertencia', 'Debe seleccionar un archivo.', 'warning');
      return;
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !['xlsx', 'xls'].includes(fileExtension)) {
      Swal.fire('Error', 'El archivo debe ser formato Excel (.xlsx o .xls)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const buffer = e.target?.result;
        if (!buffer || !(buffer instanceof ArrayBuffer)) {
          throw new Error('No se pudo leer el archivo.');
        }
        const data = new Uint8Array(buffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const ctx = this.findAiuSheetContext(workbook);

        if (!ctx) {
          Swal.fire(
            'Formato inválido',
            'No se encontró la hoja AIU con encabezados válidos (ITEM, INSUMO, CANT…).',
            'error'
          );
          this.aiuFile = null;
          input.value = '';
          return;
        }

        const headerRow = (ctx.jsonData[ctx.headerRowIndex] || []) as unknown[];
        const isValid = this.validateAiuHeaderRow(headerRow);

        if (!isValid) {
          const headers = headerRow
            .map((h) => this.normalizeExcelHeader(h))
            .filter(Boolean);
          console.warn('Hoja AIU:', ctx.sheetName, 'fila', ctx.headerRowIndex + 1);
          console.warn('Encabezados detectados:', headers);
          console.warn('Encabezados esperados:', this.AIU_EXPECTED_HEADERS);
          Swal.fire(
            'Formato inválido',
            `La hoja "${ctx.sheetName}" no tiene todas las columnas AIU requeridas.`,
            'error'
          );
          this.aiuFile = null;
          input.value = '';
          return;
        }

        this.aiuFile = file;
        Swal.fire('Éxito', 'Archivo AIU válido y listo para guardar.', 'success');
        input.value = '';
      } catch (error) {
        console.error('Error al leer el archivo:', error);
        Swal.fire(
          'Error',
          'Error en el servicio. No se pudo leer el archivo Excel.',
          'error'
        );
        this.aiuFile = null;
        input.value = '';
      }
    };

    reader.readAsArrayBuffer(file);
  }
  

  onIVAFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) this.ivaFile = file;
  }

 uploadAIUExcel() {
  if (!this.aiuFile) {
    Swal.fire('Advertencia', 'Debe seleccionar un archivo AIU', 'warning');
    return;
  }

  this.contractsService.uploadExcelAIU(this.aiuFile).subscribe({
    next: () => {
      Swal.fire('Éxito', 'Archivo AIU cargado correctamente', 'success');
      this.aiuFile = null;
      const input = document.getElementById('aiuFile') as HTMLInputElement;
      if (input) input.value = '';
    },
    error: (err) => {
      Swal.fire(
        'Error',
        err?.error?.mensaje ||
          err?.error?.detalle ||
          'Error al cargar el archivo AIU',
        'error'
      );
    },
  });
}

  uploadIVAExcel() {
  if (!this.ivaFile) {
    Swal.fire('Advertencia', 'Debe seleccionar un archivo IVA', 'warning');
    return;
  }

  this.contractsService.uploadExcelIVA(this.ivaFile).subscribe({
    next: () => {
      Swal.fire('Éxito', 'Archivo IVA cargado correctamente', 'success');
      this.ivaFile = null;
      const inputFile = document.getElementById('ivaFile') as HTMLInputElement;
      if (inputFile) {
        inputFile.value = '';
      }
    },
    error: (err) => {
      Swal.fire(
        'Error',
        err?.error?.mensaje ||
          err?.error?.detalle ||
          'Error al cargar el archivo IVA',
        'error'
      );
    },
  });
}

  clearAiuFile(): void {
    this.aiuFile = null;
    const input = document.getElementById('aiuFile') as HTMLInputElement;
    if (input) input.value = '';
  }

  clearIvaFile(): void {
    this.ivaFile = null;
    const input = document.getElementById('ivaFile') as HTMLInputElement;
    if (input) input.value = '';
  }

  // * Carga archivo plano - orden de compra

  onOrdenCompraFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
  
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
  
      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];
  
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
      if (jsonData.length === 0) {
        Swal.fire("Error", "El archivo está vacío", "error");
        return;
      }
  
      const headers = jsonData[0].map((h: any) => (h || "").toString().trim().toUpperCase());
  
      const expectedHeaders = [
        "CONTRATO",
        "ITEM",
        "ELEMENTO",
        "DESCRIPCION",
        "UM",
        "CANTIDAD",
        "PROVEEDOR"
      ];
  
      // ✅ Validar que los headers coincidan
      const isValid = expectedHeaders.every((h, i) => headers[i] === h);
  
      if (!isValid) {
        Swal.fire("Formato inválido", "El archivo no corresponde a una Orden de Compra", "error");
        return;
      }
  
      // ✅ Guardar datos (quitando encabezados)
      this.ordenCompraData = jsonData.slice(1).map((row: any[]) => ({
        contrato: row[0],
        item: row[1],
        elemento: row[2],
        descripcion: row[3],
        um: row[4],
        cantidad: row[5],
        provedor: row[6],
      }));
  
      Swal.fire("Éxito", "Archivo de Orden de Compra cargado correctamente", "success");
    };
  
    reader.readAsArrayBuffer(file);
  }
  
  // Cargar archivo desde input orden de compra
  onOCFileSelected(event: any): void {
  const file = event.target.files[0];
  if (file) {
    this.ocFile = file;
    this.ocFileAlreadySaved = false;
    console.log("Archivo de Orden de Compra seleccionado:", file.name);
  }
}

//Remisiones carga
onOCFileRemision(event: any): void {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (e: any) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (!jsonData || jsonData.length < 2) {
      Swal.fire("Error", "El archivo está vacío o mal estructurado", "error");
      return;
    }

    const headers = jsonData[0].map((h: any) =>
      (h || "").toString().trim().toUpperCase()
    );

    const expectedHeaders = [
      "NO. CONTRATO",
      "EMPRESA",
      "ITEM",
      "CANTIDAD",
      "UM",
      "DETALLE",
      "OBSERVACIONES"
    ];

    const isValid = expectedHeaders.every((h, i) => headers[i] === h);

    if (!isValid) {
      Swal.fire("Formato inválido", "El archivo no corresponde al formato de Remisiones", "error");
      return;
    }

    this.remisionData = jsonData
      .slice(1)
      .filter((row: any[]) => {
        // eliminar filas completamente vacías
        return row.some(cell =>
          cell !== undefined &&
          cell !== null &&
          String(cell).trim() !== ''
        );
      })
      .map((row: any[], index: number) => ({
        item: row[2] ? String(row[2]).trim() : String(index + 1),
        cantidad: row[3] ? Number(row[3]) : 0,
        um: row[4] ? String(row[4]).trim() : '',
        detalle: row[5] ? String(row[5]).trim() : '',
        observaciones: row[6] ? String(row[6]).trim() : ''
      }));

    Swal.fire("Éxito", "Archivo de Remisión cargado correctamente", "success");
  };

  reader.readAsArrayBuffer(file);
}

resetRemision(): void {
  this.form.reset();
  this.remisionFile = null;
  this.remisionWasPreviewed = false;
  this.selectedConstructoraId = null;
  this.selectedProyectoId = null;
  this.selectedTipoConsecutivo = null;
  this.documentoNumeroOptions = [];
  this.proyectosOptions = [];
  this.showPreviewRemision = false;
  this.resetVinculoState();

  this.remisionData = [
    {
      item: '',
      cantidad: 0,
      um: '',
      detalle: '',
      observaciones: ''
    }
  ];
}



// Subir archivo plano y luego guardar formulario (evita que quede solo el archivo sin documento)
uploadOCFile(): void {
  if (!this.ocFile) {
    Swal.fire("Advertencia", "Debe seleccionar un archivo de Orden de Compra", "warning");
    return;
  }

  const vinculo = this.resolveVinculo();
  if (!vinculo.ok) {
    Swal.fire('Advertencia', vinculo.error || 'Debe indicar contrato o N° cotización.', 'warning');
    return;
  }
  this.applyVinculoToForm(vinculo.clave);

  const formValue = { ...(this.form.value || {}), numero_contrato: vinculo.clave };
  const consecutivoDoc =
    (formValue.consecutivo && String(formValue.consecutivo).trim()) ||
    '';

  if (!consecutivoDoc) {
    Swal.fire(
      "Advertencia",
      "Debe ingresar el Consecutivo del documento en el formulario antes de subir el archivo.",
      "warning"
    );
    return;
  }

  // La columna CONTRATO del Excel debe coincidir con la clave de amarre (contrato o cotización)
  if (this.ordenCompraData && this.ordenCompraData.length > 0) {
    const contratosArchivo = this.ordenCompraData
      .map((row: any) => (row.contrato ? String(row.contrato).trim() : ''))
      .filter((c: string) => c.length > 0);

    const allMatch = contratosArchivo.every((c: string) => c === vinculo.clave);

    if (!allMatch) {
      Swal.fire(
        "Advertencia",
        vinculo.tipo_vinculo === 'COTIZACION'
          ? "El N° Cotización del formulario no coincide con la columna CONTRATO del archivo de Orden de Compra."
          : "El número de contrato del formulario no coincide con el número de contrato en el archivo de Orden de Compra. Verifícalos antes de guardar.",
        "warning"
      );
      return;
    }
  }

  // El back valida duplicados con tipo_doc "Orden De Compra"; si enviamos "ORDEN DE COMPRA" no coincide
  const tipoDocBack =
    this.selectedType === 'ORDEN DE COMPRA' ? 'Orden De Compra' : (this.selectedType || 'Orden De Compra');

  this.contractsService.uploadExcelOrder(
    this.ocFile,
    consecutivoDoc,
    tipoDocBack,
    vinculo.tipo_vinculo
  ).subscribe({
    next: () => {
      this.ocFileAlreadySaved = true;
      // Archivo guardado OK → guardar el documento (formulario) para no dejar solo el archivo
      const campos = [
        ...Object.entries(formValue).map(([nombre, valor]) => ({
          nombre,
          valor: valor instanceof File ? valor.name : String(valor ?? ''),
        })),
        ...this.buildVinculoCampos(vinculo.tipo_vinculo, vinculo.clave),
      ];
      const payload: InsertContractRequest = {
        tipo_doc: this.selectedType,
        numerodoc: consecutivoDoc || vinculo.clave || `OC-${new Date().toISOString().slice(0, 10)}`,
        campos,
      };

      this.contractsService.insertContract(payload).subscribe({
        next: (res) => {
          Swal.fire({
            icon: "success",
            title: "Orden de Compra guardada",
            text: res.mensaje || "Archivo y documento guardados correctamente.",
            confirmButtonText: "Aceptar",
          }).then(() => {
            this.ocFile = null;
            this.ordenCompraData = [];
            this.showPreviewOC = false;
            this.resetAll();
          });
        },
        error: (err) => {
          Swal.fire(
            "Atención",
            "El archivo se subió correctamente, pero no se pudo guardar el documento: " +
              (err?.error?.mensaje || err?.error?.error || "Error al guardar datos."),
            "warning"
          );
        },
      });
    },
    error: (err) => {
      Swal.fire(
        "Error",
        err?.error?.error || err?.error?.mensaje || "Error al cargar Orden de Compra",
        "error"
      );
    },
  });
}

/* uploadOCRemision(): void {  
  if (!this.ocFile) {
    Swal.fire("Advertencia", "Debe seleccionar un archivo de Remisión", "warning");
    return;
  }

  this.contractsService.uploadExcelRemision(this.ocFile).subscribe({
    next: () => {
      Swal.fire("Éxito", "Remisión cargada correctamente", "success");
    },
    error: (err) => {
      Swal.fire("Error", err?.error?.mensaje || "Error al cargar archivo remisiones", "error");
    },
  });
}
 */
saveOCInputs(): void {
  if (!this.selectedType) {
    Swal.fire("Advertencia", "Debe seleccionar un tipo de documento", "warning");
    return;
  }

  // Orden de Compra: no se puede guardar el formulario sin haber guardado antes el archivo plano
  if (this.selectedType === 'ORDEN DE COMPRA' && !this.ocFileAlreadySaved) {
    Swal.fire(
      "Advertencia",
      "Primero guarde el archivo de Orden de Compra. Debe cargar el archivo y luego se guardará el formulario.",
      "warning"
    );
    return;
  }

  const formValue = this.form.value;
  const campos = [
    ...Object.entries(formValue).map(([nombre, valor]) => ({
      nombre,
      valor: valor instanceof File ? valor.name : String(valor ?? ''),
    })),
    ...this.buildTipoConsecutivoCampos(),
  ];

  const payload: InsertContractRequest = {
    tipo_doc: this.selectedType,
    numerodoc:
      formValue.numero_contrato ||
      `OC-${new Date().toISOString().slice(0, 10)}`,
    campos,
  };

  this.contractsService.insertContract(payload).subscribe({
    next: (res) => {
      Swal.fire({
        icon: "success",
        title: "Datos de Orden de Compra guardados",
        text: res.mensaje || "Guardado exitoso",
        confirmButtonText: "Aceptar",
      }).then(() => {
        this.resetAll();
      });
    },
    error: (err) => {
      Swal.fire(
        "Error",
        err?.error?.mensaje || "Error al guardar datos",
        "error"
      );
    },
  });
}


// Previsualizar Orden de Compra
onPreviewOC(): void {
  this.showPreviewOC = true;
  console.log("Mostrando previsualización de Orden de Compra");
}

// Previsualizar Remisiones
  onPreviewRemision(): void {
  if (!this.form.valid) {
    Swal.fire(
      'Atención',
      'Complete los campos requeridos de la remisión antes de previsualizar.',
      'warning'
    );
    return;
  }

  const errTipoNum = this.validarTipoYNumeroDocumento();
  if (errTipoNum) {
    Swal.fire('Atención', errTipoNum, 'warning');
    return;
  }

  this.setFechaRemision();
  this.setEmpresaImpresion();
  this.showPreviewRemision = true;
  this.remisionWasPreviewed = true;
}


// Cerrar previsualización
closePreviewOC(): void {
  this.showPreviewOC = false;
}

closePreviewRemision(): void {
  this.showPreviewRemision = false;
}


// Guardar Orden de Compra
onSubmitOC(): void {
  this.uploadOCFile();
}

  // ====== PREVIEWS INDEPENDIENTES ======
  onPreviewContrato(): void {
    if (!this.form.valid) {
      Swal.fire('Atención', 'Complete los datos mínimos del contrato.', 'warning');
      return;
    }
    this.showPreviewContrato = true;
  }
  closePreviewContrato(): void {
    this.showPreviewContrato = false;
  }

  onPreviewVisita(): void {
    if (!this.form.get('consecutivo')?.value && !this.form.get('detalle_visita')?.value) {
      Swal.fire('Atención', 'Ingrese al menos Consecutivo o Detalle de la visita.', 'warning');
      return;
    }
    this.showPreviewVisita = true;
  }
  closePreviewVisita(): void {
    this.showPreviewVisita = false;
  }

  onPreviewActa(): void {
    const errorMsg = this.validateActaMedidaBeforeSave();
    if (errorMsg) {
      Swal.fire('Atención', errorMsg, 'warning');
      return;
    }
    this.showPreviewActa = true;
  }
  closePreviewActa(): void {
    this.showPreviewActa = false; 
  }

  // ====== GUARDADOS INDEPENDIENTES ======
  onSubmitContrato(): void {
    const errTipoNum = this.validarTipoYNumeroDocumento();
    if (errTipoNum) {
      Swal.fire({
        icon: 'warning',
        title: 'Documento incompleto',
        text: errTipoNum,
      });
      return;
    }

    // ✅ Solo para contrato se exige AIU o IVA
    if (!this.aiuFile && !this.ivaFile) {
      Swal.fire({
        icon: 'warning',
        title: 'Archivos requeridos',
        text: 'Debe adjuntar al menos un archivo AIU o IVA antes de guardar.',
      });
      return;
    }

    this.syncContratoNumeroFromCatalog();
    const numerodoc =
      this.resolveNumeroDocumentoPersistido() ||
      String(this.form.getRawValue?.()?.numero_contrato ?? '').trim() ||
      `CT-${new Date().toISOString().slice(0, 10)}`;

    this.guardarGenerico({ numerodoc });
  }

  onSubmitVisita(): void {
    // ✅ En visita NO se exige AIU/IVA
    this.guardarGenerico({
      numerodoc:
        this.form.value.consecutivo || `VO-${new Date().toISOString().slice(0, 10)}`,
    });
  }

  onSubmitActa(): void {
    const errorMsg = this.validateActaMedidaBeforeSave();
    if (errorMsg) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: errorMsg,
      });
      return;
    }

    const itemsValidos = this.getItemsParaGuardarActa();
    const vinculo = this.resolveVinculo();
    if (!vinculo.ok) {
      Swal.fire({
        icon: 'warning',
        title: 'Vínculo requerido',
        text: vinculo.error || 'Debe indicar contrato o N° cotización.',
      });
      return;
    }

    this.applyVinculoToForm(vinculo.clave);
    const numeroContrato = vinculo.clave;

    const consecutivo = String(
      this.form.get('consecutivo')?.value ??
        this.form.getRawValue?.()?.consecutivo ??
        ''
    ).trim();

    if (!consecutivo) {
      Swal.fire({
        icon: 'warning',
        title: 'Consecutivo requerido',
        text: 'No se pudo asignar el consecutivo automático del acta. Recargue el formulario.',
      });
      return;
    }

    Swal.fire({
      title: 'Guardando...',
      text: 'Registrando el acta de medida.',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading(null);
      },
    });

    this.guardarActaMedidaConConsecutivo(
      consecutivo,
      numeroContrato,
      itemsValidos,
      vinculo.tipo_vinculo
    );
  }

  /**
   * Persiste cabecera + detalle del acta usando el consecutivo automático.
   */
  private guardarActaMedidaConConsecutivo(
    consecutivo: string,
    numeroContrato: string,
    itemsValidos: typeof this.actasMedidaData,
    tipoVinculo: 'CONTRATO' | 'COTIZACION' = 'CONTRATO'
  ): void {
    const consecutivoCtrl = this.form.get('consecutivo');
    if (consecutivoCtrl) {
      consecutivoCtrl.setValue(consecutivo, { emitEvent: false });
    }

    const formValue = this.form.getRawValue();
    const campos = [
      ...Object.entries(formValue).map(([nombre, valor]) => ({
        nombre,
        valor:
          nombre === 'consecutivo'
            ? consecutivo
            : this.isNumeroContratoFieldName(nombre)
              ? numeroContrato
              : valor instanceof File
                ? valor.name
                : String(valor ?? ''),
      })),
      ...this.buildVinculoCampos(tipoVinculo, numeroContrato),
      ...this.buildTipoConsecutivoCampos(),
    ];

    const payload: InsertContractRequest = {
      tipo_doc: this.selectedType,
      numerodoc: consecutivo,
      campos,
    };

    this.contractsService.insertContract(payload).subscribe({
      next: (res) => {
        const formData = new FormData();
        formData.append('consecutivo', consecutivo);
        formData.append('numero_contrato', numeroContrato);
        formData.append('tipo_vinculo', tipoVinculo);
        formData.append(
          'items',
          JSON.stringify(
            itemsValidos.map((row) => ({
              item: row.item,
              detalle: row.detalle,
              cantidad: row.cantidad,
              um: row.um,
              ancho: row.ancho,
              alto: row.alto,
              fondo: row.fondo,
              observaciones: row.observaciones,
              insumo_id: row.insumoId,
              insumo_codigo: row.insumoCodigo || null,
            }))
          )
        );

        if (this.actaArchivoAdjunto) {
          formData.append('archivo_acta', this.actaArchivoAdjunto);
        }

        this.contractsService.insertActasMedidaDetalle(formData).subscribe({
          next: (detalleRes) => {
            Swal.fire({
              icon: 'success',
              title: 'Acta de medida guardada',
              text: `${
                detalleRes?.mensaje ||
                res?.mensaje ||
                'Documento e ítems guardados correctamente.'
              } Consecutivo: ${consecutivo}.`,
              confirmButtonText: 'Aceptar',
            });
            this.resetAll();
          },
          error: (err) => {
            Swal.fire({
              icon: 'warning',
              title: 'Documento guardado, detalle incompleto',
              text: `${
                err?.error?.mensaje ||
                'El acta se guardó, pero no se pudieron insertar todos los ítems del detalle.'
              } Consecutivo: ${consecutivo}.`,
            });
          },
        });
      },
      error: (err) => {
        const status = err?.status;
        const duplicado =
          status === 409 ||
          err?.error?.codigo === 'CONSECUTIVO_DUPLICADO';
        if (duplicado) {
          this.cargarSiguienteConsecutivoActa();
          Swal.fire({
            icon: 'warning',
            title: 'Consecutivo ya usado',
            text:
              err?.error?.mensaje ||
              'Otro usuario tomó ese consecutivo. Se asignó el siguiente; vuelva a guardar.',
          });
          return;
        }
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text:
            err?.error?.mensaje ||
            `No se pudo insertar el documento. Consecutivo: ${consecutivo}.`,
        });
      },
    });
  }

  onSubmitRemision(): void {
  const vinculo = this.resolveVinculo();
  if (!vinculo.ok) {
    Swal.fire(
      'Advertencia',
      vinculo.error ||
        'Debe seleccionar el N° Documento del catálogo de administración.',
      'warning'
    );
    return;
  }
  this.applyVinculoToForm(vinculo.clave);

  const errTipoNum = this.validarTipoYNumeroDocumento();
  if (errTipoNum) {
    Swal.fire('Advertencia', errTipoNum, 'warning');
    return;
  }

  // 1️⃣ Validar formulario
  if (this.form.invalid) {
    Swal.fire("Advertencia", "Debe completar todos los campos obligatorios.", "warning");
    return;
  }

  // 2️⃣ Validar archivo o ítems manuales
  const tieneArchivo = !!this.remisionFile;

  const itemsValidos = this.remisionData.filter(r =>
    r.item &&
    r.cantidad > 0 &&
    r.um
  );

  const tieneItems = itemsValidos.length > 0;

  if (!tieneArchivo && !tieneItems) {
  Swal.fire(
      "Advertencia",
      "Debe cargar un archivo Excel o ingresar al menos un ítem manual válido.",
      "warning"
    );
    return;
  }

  // 3️⃣ Construimos FormData completo
  const formData = new FormData();

  // Campos del formulario (incluye disabled: remision_material automático)
  const rawForm = this.form.getRawValue?.() ?? this.form.value ?? {};
  Object.keys(rawForm).forEach((key) => {
    const value = (rawForm as Record<string, unknown>)[key];
    if (value !== null && value !== undefined) {
      formData.append(key, value as string | Blob);
    }
  });
  formData.set('numero_contrato', vinculo.clave);
  formData.append('tipo_vinculo', vinculo.tipo_vinculo);
  // Tipo documento (Contrato/Cotizacion/…) — independiente del N°
  formData.set('tipo_contrato', this.resolveTipoConsecutivoPersistido());

  const remisionNum = String(rawForm['remision_material'] ?? '').trim();
  if (!remisionNum) {
    Swal.fire(
      'Advertencia',
      'Seleccione la empresa asociada para asignar el consecutivo de remisión.',
      'warning'
    );
    return;
  }

  // Archivo si existe
  if (tieneArchivo) {
    formData.append("file", this.remisionFile!);
  }

  // Ítems manuales si existen
  if (tieneItems) {
    formData.append("detalle_remision", JSON.stringify(itemsValidos));
  }

  // 4️⃣ Enviar al backend
  this.contractsService.uploadExcelRemision(formData).subscribe({
    next: () => {
      Swal.fire("Éxito", "Remisión guardada correctamente.", "success");
      this.resetRemision();
    },
    error: (err) => {
      const status = err?.status;
      if (status === 409) {
        const empresa = this.form.get('empresa_asociada')?.value;
        this.cargarSiguienteConsecutivoRemision(empresa);
        Swal.fire(
          'Consecutivo ya usado',
          err?.error?.error ||
            'Otro usuario tomó ese número de remisión. Se asignó el siguiente; vuelva a guardar.',
          'warning'
        );
        return;
      }
      Swal.fire("Error", err?.error?.error || "Error al guardar remisión", "error");
    }
  });
}


  // Guardado común
  private guardarGenerico(opts: { numerodoc: string }) {
    if (!this.selectedType) {
      Swal.fire({
        icon: 'warning',
        title: 'Tipo de documento no seleccionado',
        text: 'Por favor, seleccione un tipo de documento.',
      });
      return;
    }

    if (this.selectedType === 'CONTRATO') {
      this.guardarContratoConPlano(opts);
      return;
    }

    let tipoVinculo: 'CONTRATO' | 'COTIZACION' = 'CONTRATO';
    let clave = '';
    if (this.supportsVinculoSinContrato()) {
      const vinculo = this.resolveVinculo();
      if (!vinculo.ok) {
        Swal.fire({
          icon: 'warning',
          title: 'Vínculo requerido',
          text: vinculo.error || 'Debe indicar contrato o N° cotización.',
        });
        return;
      }
      this.applyVinculoToForm(vinculo.clave);
      tipoVinculo = vinculo.tipo_vinculo;
      clave = vinculo.clave;
    }

    const formValue = this.form.value;
    const campos = [
      ...Object.entries(formValue).map(([nombre, valor]) => ({
        nombre,
        valor: this.isNumeroContratoFieldName(nombre)
          ? clave || String(valor ?? '')
          : valor instanceof File
            ? valor.name
            : String(valor ?? ''),
      })),
      ...(clave ? this.buildVinculoCampos(tipoVinculo, clave) : []),
      ...this.buildTipoConsecutivoCampos(),
    ];

    const payload: InsertContractRequest = {
      tipo_doc: this.selectedType,
      numerodoc: opts.numerodoc,
      campos,
    };

    this.contractsService.insertContract(payload).subscribe({
      next: (res) => {
        Swal.fire({
          icon: 'success',
          title: 'Documento insertado',
          text: res.mensaje,
          confirmButtonText: 'Aceptar',
        });

        this.resetAll();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.mensaje || 'No se pudo insertar el documento.',
        });
      },
    });
  }

  /** Formulario + plano en una sola petición (transacción en BD). */
  private guardarContratoConPlano(opts: { numerodoc: string }): void {
    if (!this.aiuFile && !this.ivaFile) {
      Swal.fire({
        icon: 'warning',
        title: 'Archivos requeridos',
        text: 'Debe adjuntar al menos un archivo AIU o IVA antes de guardar.',
      });
      return;
    }

    this.syncContratoNumeroFromCatalog();
    const formValue = this.form.getRawValue?.() ?? this.form.value;
    const campos = [
      ...Object.entries(formValue).map(([nombre, valor]) => ({
        nombre,
        valor: this.serializeCampoValor(nombre, valor),
      })),
      ...this.buildTipoConsecutivoCampos(),
    ];
    const tipoCatalogo = this.resolveTipoConsecutivoPersistido();

    const formData = new FormData();
    formData.append('tipo_doc', this.selectedType);
    formData.append('numerodoc', opts.numerodoc);
    formData.append('campos', JSON.stringify(campos));
    formData.append('tipo_doc_catalogo', tipoCatalogo);
    formData.append('tipo_doc_plano', tipoCatalogo || 'Contrato');

    if (this.aiuFile) {
      formData.append('file_aiu', this.aiuFile);
    }
    if (this.ivaFile) {
      formData.append('file_iva', this.ivaFile);
    }

    this.contractsService.insertContractWithPlano(formData).subscribe({
      next: (res) => {
        Swal.fire({
          icon: 'success',
          title: 'Contrato guardado',
          text:
            res.mensaje ||
            'Contrato y archivo plano guardados correctamente.',
          confirmButtonText: 'Aceptar',
        });
        this.resetAll();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'No se guardó el contrato',
          text:
            err?.error?.mensaje ||
            err?.error?.error ||
            'Si falló alguna inserción, no se registró ningún dato.',
        });
      },
    });
  }

  private resetAll() {
    this.form.reset();
    this.fields = [];
    this.selectedType = '';
    this.aiuFile = null;
    this.ivaFile = null;
    this.ocFile = null;
    this.ocFileAlreadySaved = false;
    this.ordenCompraData = [];
    this.selectedConstructoraId = null;
    this.selectedProyectoId = null;
    this.selectedTipoConsecutivo = null;
    this.documentoNumeroOptions = [];
    this.proyectosOptions = [];
    this.showPreviewContrato = false;
    this.showPreviewVisita = false;
    this.showPreviewActa = false;
    this.showPreviewOC = false;
    this.showPreviewRemision = false;
    this.remisionWasPreviewed = false;
    this.hiddenFields.clear();
    this.clearActaArchivo();
    this.resetActasMedidaData();
    this.resetVinculoState();
  }

  // Evita submit por Enter del form. Redirige según tipo (ACTAS DE PAGO tiene su propio componente)
  onSubmitSelected(): void {
    if (this.selectedType === 'CONTRATO') this.onSubmitContrato();
    else if (this.selectedType === 'ASISTENCIA') this.onSubmitVisita();
    else if (this.selectedType === 'ACTAS DE MEDIDA') this.onSubmitActa();
    else if (this.selectedType === 'REMISIONES') this.onSubmitRemision();
  }

  // * Imprimir documentos
  // TODO: Remisiones
  
  onPrintRemision(): void {

    if (!this.remisionData || !this.remisionData.length) {
      Swal.fire(
        'Atención',
        'Debe cargar el archivo plano antes de imprimir.',
        'warning'
      );
      return;
    }

    if (!this.form.valid) {
      Swal.fire(
        'Atención',
        'Complete todos los campos antes de imprimir la remisión.',
        'warning'
      );
      return;
    }
    this.setFechaRemision();
    this.setEmpresaImpresion();
    setTimeout(() => {
      window.print();
    }, 300);
  }

  generateRemisionPDF(): void {

    if (!this.remisionWasPreviewed) {
      Swal.fire(
        'Atención',
        'Debe previsualizar la remisión antes de generar el PDF.',
        'warning'
      );
      return;
    }

    if (!this.remisionData.length) {
      Swal.fire('Atención', 'Debe cargar el archivo plano.', 'warning');
      return;
    }

    const element = document.querySelector('.print-page') as HTMLElement | null;

    if (!element) {
      Swal.fire('Error', 'No se encontró el contenido para generar el PDF.', 'error');
      return;
    }

    if (this.generatingRemisionPdf) return;

    this.generatingRemisionPdf = true;
    Swal.fire({
      title: 'Generando PDF...',
      text: 'Por favor espere',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(null),
    });

    const remisionNum = String(this.form.value['remision_material'] || '').trim();
    const proyectoNombre = String(this.form.value['proyecto'] || '')
      .trim()
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, '_');
    const filename = proyectoNombre
      ? `Remision_${remisionNum}_${proyectoNombre}.pdf`
      : `Remision_${remisionNum}.pdf`;

    const options = {
      margin: 5,
      filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm' as const, format: 'letter' as const, orientation: 'portrait' as const }
    };

    html2pdf()
      .set(options)
      .from(element)
      .save()
      .then(() => {
        Swal.close();
      })
      .catch(() => {
        Swal.fire('Error', 'No se pudo generar el PDF.', 'error');
      })
      .finally(() => {
        this.generatingRemisionPdf = false;
      });
  }

  private setEmpresaImpresion(): void {

    const empresa = this.form.get('empresa_asociada')?.value;
    if (empresa == 1) {
      this.logoEmpresa = 'assets/images/logo_principal.png';
      this.nitEmpresa = '900.111.135 - 7';
      this.webEmpresa = 'WWW.SOSAMET.COM';
      this.colorWebEmpresa = '#1f4fa3';
    } 
    else if (empresa == 2) {
      this.logoEmpresa = 'assets/images/LOGO_HS.png';
      this.nitEmpresa = '901.236.735-7';
      this.webEmpresa = 'WWW.HIERROSYSERVICIOS.COM';
      this.colorWebEmpresa = '#8a6d3b';
    } 
    else {
      this.logoEmpresa = '';
      this.logoEmpresa = '';
      this.nitEmpresa = '';
      this.webEmpresa = '';
      this.colorWebEmpresa = '';
    }
  }
}
