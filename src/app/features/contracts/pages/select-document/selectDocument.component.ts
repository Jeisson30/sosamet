import { Component, HostListener, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
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
import { ContractsService } from '../../shared/service/contracts.service';
import { CatalogService, ConstructoraDto, ProyectoDto } from '../../../../shared/services/catalog.service';
import { GestionService } from '../../../gestion/shared/service/gestion.service';
import { GestionUser } from '../../../gestion/shared/interfaces/Response.interface';
import { FloatLabelModule } from 'primeng/floatlabel';
import {
  ContractTypeResponse,
  ContractFieldResponse,
} from '../../shared/interfaces/Response.interface';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { InsertContractRequest } from '../../shared/interfaces/Request.interface';
import html2pdf from 'html2pdf.js';
import { PaymentCertificateComponent } from './payment-certificate/payment-certificate.component';
import { CanComponentDeactivate } from '../../../../core/auth/unsaved-document.guard';

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
    //Button,
    //FloatLabel,
  ],
  templateUrl: './selectDocument.component.html',
  styleUrls: ['./selectDocument.component.scss'],
})
export class ContractSelectTypeComponent implements OnInit, CanComponentDeactivate {
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

  /** Filas de detalle para Actas de Medida (diseño tipo liquidación de corte). */
  actasMedidaData: {
    item: string;
    detalle: string;
    cantidad: number | null;
    um: string;
    ancho: number | null;
    alto: number | null;
    observaciones: string;
    evidencia: File | null;
    evidenciaNombre: string;
    evidenciaUrl: string | null;
  }[] = [
    {
      item: '',
      detalle: '',
      cantidad: null,
      um: '',
      ancho: null,
      alto: null,
      observaciones: '',
      evidencia: null,
      evidenciaNombre: '',
      evidenciaUrl: null,
    },
  ];

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

    const raw = this.form?.value?.['remision_material'];
    const empresa = this.form?.value?.['empresa_asociada'];
  
    let prefix = 'SM';
  
    if (empresa == 2) {
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
    // Campo dinámico que viene desde BD para remisiones
    const tipoDoc = String(this.form?.value?.['tipo_doc_rem'] ?? '').trim();
    const ordenCompra = String(this.form?.value?.['numero_contrato'] ?? '').trim();
    if (tipoDoc && ordenCompra) return `${tipoDoc} ${ordenCompra}`;
    return tipoDoc || ordenCompra;
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

  typecontractDocumentOptions = [
    { label: 'Contrato', value: 'Contrato' },
    { label: 'Cotizacion', value: 'Cotizacion' },
    { label: 'Oferta Mercantil', value: 'OfertaM' },
    { label: 'Orden De Compra', value: 'OrdenDC' },
    { label: 'Orden De Trabajo', value: 'OrdenDT' },
    { label: 'Otro', value: 'Otro' },
  ]

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

  /** Contratos para select N°. Contrato (Actas de Medida). */
  contratosOptions: { label: string; value: string }[] = [];
  loadingContratos = false;

  constructor(
    private contractsService: ContractsService,
    private fb: FormBuilder,
    private catalogService: CatalogService,
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

  private createEmptyActaMedidaRow() {
    return {
      item: '',
      detalle: '',
      cantidad: null as number | null,
      um: '',
      ancho: null as number | null,
      alto: null as number | null,
      observaciones: '',
      evidencia: null as File | null,
      evidenciaNombre: '',
      evidenciaUrl: null as string | null,
    };
  }

  private actasMedidaDataHasUserContent(): boolean {
    return (this.actasMedidaData || []).some((row) =>
      this.actaMedidaRowHasAnyContent(row)
    );
  }

  private actaMedidaRowHasAnyContent(row: {
    item: string;
    detalle: string;
    cantidad: number | null;
    um: string;
    ancho: number | null;
    alto: number | null;
    observaciones: string;
    evidencia: File | null;
  }): boolean {
    return !!(
      String(row?.item ?? '').trim() ||
      String(row?.detalle ?? '').trim() ||
      row?.cantidad != null ||
      String(row?.um ?? '').trim() ||
      row?.ancho != null ||
      row?.alto != null ||
      String(row?.observaciones ?? '').trim() ||
      !!row?.evidencia
    );
  }

  /** Ítem completo: todos los campos excepto evidencia (opcional). */
  isActaMedidaRowComplete(row: {
    item: string;
    detalle: string;
    cantidad: number | null;
    um: string;
    ancho: number | null;
    alto: number | null;
    observaciones: string;
  }): boolean {
    return (
      String(row.item ?? '').trim().length > 0 &&
      String(row.detalle ?? '').trim().length > 0 &&
      row.cantidad != null &&
      String(row.cantidad).trim() !== '' &&
      !Number.isNaN(Number(row.cantidad)) &&
      String(row.um ?? '').trim().length > 0 &&
      row.ancho != null &&
      String(row.ancho).trim() !== '' &&
      !Number.isNaN(Number(row.ancho)) &&
      row.alto != null &&
      String(row.alto).trim() !== '' &&
      !Number.isNaN(Number(row.alto)) &&
      String(row.observaciones ?? '').trim().length > 0
    );
  }

  addActaMedidaRow(): void {
    this.actasMedidaData.push(this.createEmptyActaMedidaRow());
  }

  removeActaMedidaRow(index: number): void {
    if (this.actasMedidaData.length <= 1) return;
    const row = this.actasMedidaData[index];
    if (row?.evidenciaUrl) {
      URL.revokeObjectURL(row.evidenciaUrl);
    }
    this.actasMedidaData.splice(index, 1);
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

  /** Ítems con campos obligatorios completos (evidencia opcional). */
  getCompleteActasMedidaItems() {
    return (this.actasMedidaData || []).filter((row) =>
      this.isActaMedidaRowComplete(row)
    );
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

    const complete = this.getCompleteActasMedidaItems();
    if (complete.length === 0) {
      return 'Debe agregar al menos un ítem con Item, Detalle, Cant, UM, Ancho, Alto y Observaciones. La evidencia es opcional.';
    }

    const incomplete = (this.actasMedidaData || []).filter(
      (row) =>
        this.actaMedidaRowHasAnyContent(row) && !this.isActaMedidaRowComplete(row)
    );
    if (incomplete.length > 0) {
      return 'Hay ítems incompletos. Complete todos los campos del ítem (la evidencia es opcional) o elimine la fila.';
    }

    return null;
  }

  private resetActasMedidaData(): void {
    (this.actasMedidaData || []).forEach((row) => {
      if (row.evidenciaUrl) URL.revokeObjectURL(row.evidenciaUrl);
    });
    this.actasMedidaData = [this.createEmptyActaMedidaRow()];
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

  /** Contratos creados (SP_CONSULTAR_CONTRATOS) — hoy solo Actas de Medida. */
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
    this.proyectosOptions = [];

    if (!this.form) return;

    if (!id) {
      const patch: any = {};
      patch[constructoraControlName] = '';
      patch['proyecto'] = '';
      this.form.patchValue(patch);
      return;
    }

    const cons = this.constructorasOptions.find((c) => c.value === id);
    const patch: any = {};
    patch[constructoraControlName] = cons?.label ?? '';
    this.form.patchValue(patch);

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
    if (!this.form) return;
    const nombre =
      this.proyectosOptions.find((p) => p.value === id)?.label ?? '';
    this.form.patchValue({ proyecto: nombre });
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

    if (this.selectedType === 'ACTAS DE MEDIDA') {
      this.loadContratosOptions();
    }

    // Actas de Pago: lógica aislada en app-payment-certificate
    if (this.selectedType === 'ACTAS DE PAGO') {
      this.fields = [];
      return;
    }

    this.contractsService.getTypeFields(this.selectedType).subscribe({
      next: (fields) => {
        const camposActivos = fields.filter((f) => f.estadocampo === '1');

        let orden: string[] = [];
        this.hiddenFields = new Set<string>();

        if (this.selectedType === 'CONTRATO') {
          orden = [
            'tipo_doc_contratista',
            'numero_contrato',
            'empresa_asociada',
            'empresa',
            'nit_empresa',
            'proyecto',
            'ciudad_empresa',
            'tipo_contrato',
            'estado',
            'fecha_inicio',
            'fecha_fin',
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
            'valor_contrato',
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
          // Aseguramos que tipo_doc_rem vaya de primero en el formulario
          orden = [
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
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar campos', err),
    });
  }

  // ====== FORM DINÁMICO ======
  buildForm(fields: ContractFieldResponse[]) {
    this.selectedConstructoraId = null;
    this.selectedProyectoId = null;
    this.proyectosOptions = [];

    const group: { [key: string]: any } = {};
    fields.forEach((field) => {
      // Actas: consecutivo digitado por el usuario (generarConsecutivo queda disponible en el service).
      const validators =
        this.selectedType === 'ACTAS DE MEDIDA' ? [Validators.required] : [];
      group[field.nombre_campo_doc] = [{ value: '', disabled: false }, validators];
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
        elaboro: `${nombre} ${apellido}`
      });
    }

    this.form.get('empresa_asociada')?.valueChanges.subscribe(value => {
      this.setEmpresaImpresion();
    });

    // Si el formulario trae constructora/proyecto precargados, sincronizamos selects
    this.syncConstructoraProyectoFromForm();
  }

  // ====== FILE HANDLERS ======
  onFileChange(event: Event, fieldName: string) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.form.patchValue({ [fieldName]: input.files[0] });
    }
  }

  // * ===== AIU ===== \\

  onAIUFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) {
      Swal.fire('Advertencia', 'Debe seleccionar un archivo.', 'warning');
      return;
    }
  
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(fileExtension)) {
      Swal.fire('Error', 'El archivo debe ser formato Excel (.xlsx o .xls)', 'error');
      return;
    }
  
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
        if (!jsonData || jsonData.length < 2) {
          Swal.fire('Error', 'El archivo está vacío o mal estructurado.', 'error');
          this.aiuFile = null;
          return;
        }
  
        const normalize = (str: string) =>
          str
            ?.toUpperCase()
            .replace(/[.\s_%]/g, '')
            .trim();
  
        const headers = jsonData[0].map((h: any) => normalize(h || ''));
  
        const expectedHeaders = [
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
          'VRTOTAL'
        ].map(normalize);
  
        const isValid = expectedHeaders.every((h, i) => headers[i] === h);
  
        if (!isValid) {
          console.warn('Encabezados detectados:', headers);
          console.warn('Encabezados esperados:', expectedHeaders);
          Swal.fire(
            'Formato inválido',
            'El archivo AIU no corresponde al formato esperado. Verifique las columnas.',
            'error'
          );
          this.aiuFile = null;
          (document.getElementById('aiuFile') as HTMLInputElement).value = '';
          return;
        }
  
        this.aiuFile = file;
        Swal.fire('Éxito', 'Archivo válido y listo para subir.', 'success');
        (document.getElementById('aiuFile') as HTMLInputElement).value = '';
      } catch (error) {
        console.error('Error al leer el archivo:', error);
        Swal.fire('Error', 'Error en el servicio. No se pudo leer el archivo Excel.', 'error');
        this.aiuFile = null;
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
  this.proyectosOptions = [];
  this.showPreviewRemision = false;

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

  const formValue = this.form.value || {};
  const consecutivo =
    (formValue.consecutivo && String(formValue.consecutivo).trim()) ||
    (formValue.numero_contrato && String(formValue.numero_contrato).trim()) ||
    '';

  if (!consecutivo) {
    Swal.fire(
      "Advertencia",
      "Debe ingresar el Consecutivo o Número de contrato en el formulario antes de subir el archivo.",
      "warning"
    );
    return;
  }

  // Validar que el número usado como consecutivo (consecutivo/numero_contrato) coincida con el del archivo plano (columna CONTRATO)
  const numeroContratoForm = consecutivo;

  if (numeroContratoForm && this.ordenCompraData && this.ordenCompraData.length > 0) {
    const contratosArchivo = this.ordenCompraData
      .map((row: any) => (row.contrato ? String(row.contrato).trim() : ''))
      .filter((c: string) => c.length > 0);

    const allMatch = contratosArchivo.every((c: string) => c === numeroContratoForm);

    if (!allMatch) {
      Swal.fire(
        "Advertencia",
        "El número de contrato del formulario no coincide con el número de contrato en el archivo de Orden de Compra. Verifícalos antes de guardar.",
        "warning"
      );
      return;
    }
  }

  // El back valida duplicados con tipo_doc "Orden De Compra"; si enviamos "ORDEN DE COMPRA" no coincide
  const tipoDocBack =
    this.selectedType === 'ORDEN DE COMPRA' ? 'Orden De Compra' : (this.selectedType || 'Orden De Compra');

  this.contractsService.uploadExcelOrder(this.ocFile, consecutivo, tipoDocBack).subscribe({
    next: () => {
      this.ocFileAlreadySaved = true;
      // Archivo guardado OK → guardar el documento (formulario) para no dejar solo el archivo
      const campos = Object.entries(formValue).map(([nombre, valor]) => ({
        nombre,
        valor: valor instanceof File ? valor.name : String(valor ?? ''),
      }));
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
  const campos = Object.entries(formValue).map(([nombre, valor]) => ({
    nombre,
    valor: valor instanceof File ? valor.name : String(valor ?? ''),
  }));

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
    // ✅ Solo para contrato se exige AIU o IVA
    if (!this.aiuFile && !this.ivaFile) {
      Swal.fire({
        icon: 'warning',
        title: 'Archivos requeridos',
        text: 'Debe adjuntar al menos un archivo AIU o IVA antes de guardar.',
      });
      return;
    }

    this.guardarGenerico({
      numerodoc:
        this.form.value.numero_contrato || `CT-${new Date().toISOString().slice(0, 10)}`,
    });
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

    const itemsValidos = this.getCompleteActasMedidaItems();
    const contratoField = this.getActaField('contrato');
    const numeroContrato = String(
      (contratoField
        ? this.form.get(contratoField.nombre_campo_doc)?.value
        : this.form.get('numero_contrato')?.value) ?? ''
    ).trim();

    if (!numeroContrato) {
      Swal.fire({
        icon: 'warning',
        title: 'Número de contrato requerido',
        text: 'Debe indicar el número de contrato para guardar el detalle del acta.',
      });
      return;
    }

    const consecutivo = String(
      this.form.get('consecutivo')?.value ?? ''
    ).trim();

    if (!consecutivo) {
      Swal.fire({
        icon: 'warning',
        title: 'Consecutivo requerido',
        text: 'Debe digitar el consecutivo del acta de medida.',
      });
      return;
    }

    Swal.fire({
      title: 'Guardando...',
      text: 'Registrando el acta de medida.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(null),
    });

    // Se conserva contractsService.generarConsecutivo() por si se reactiva
    // la generación automática; por requerimiento actual el usuario digita el consecutivo.
    this.guardarActaMedidaConConsecutivo(consecutivo, numeroContrato, itemsValidos);
  }

  /**
   * Persiste cabecera + detalle del acta usando el consecutivo indicado.
   * (Antes se generaba con SP_GENERAR_CONSECUTIVO; ahora se digita.)
   */
  private guardarActaMedidaConConsecutivo(
    consecutivo: string,
    numeroContrato: string,
    itemsValidos: typeof this.actasMedidaData
  ): void {
    const consecutivoCtrl = this.form.get('consecutivo');
    if (consecutivoCtrl) {
      consecutivoCtrl.setValue(consecutivo, { emitEvent: false });
    }

    const formValue = this.form.getRawValue();
    const campos = Object.entries(formValue).map(([nombre, valor]) => ({
      nombre,
      valor:
        nombre === 'consecutivo'
          ? consecutivo
          : valor instanceof File
            ? valor.name
            : String(valor ?? ''),
    }));

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
              observaciones: row.observaciones,
            }))
          )
        );

        itemsValidos.forEach((row, index) => {
          if (row.evidencia) {
            formData.append(`evidencia_${index}`, row.evidencia);
          }
        });

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

  // Campos del formulario
  Object.keys(this.form.value).forEach(key => {
    const value = this.form.value[key];
    if (value !== null && value !== undefined) {
      formData.append(key, value);
    }
  });

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

    const formValue = this.form.value;
    const campos = Object.entries(formValue).map(([nombre, valor]) => ({
      nombre,
      valor: valor instanceof File ? valor.name : String(valor ?? ''),
    }));

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

    const formValue = this.form.value;
    const campos = Object.entries(formValue).map(([nombre, valor]) => ({
      nombre,
      valor: valor instanceof File ? valor.name : String(valor ?? ''),
    }));

    const formData = new FormData();
    formData.append('tipo_doc', this.selectedType);
    formData.append('numerodoc', opts.numerodoc);
    formData.append('campos', JSON.stringify(campos));
    formData.append('tipo_doc_plano', 'Contrato');

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
    this.proyectosOptions = [];
    this.showPreviewContrato = false;
    this.showPreviewVisita = false;
    this.showPreviewActa = false;
    this.showPreviewOC = false;
    this.showPreviewRemision = false;
    this.remisionWasPreviewed = false;
    this.hiddenFields.clear();
    this.resetActasMedidaData();
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
