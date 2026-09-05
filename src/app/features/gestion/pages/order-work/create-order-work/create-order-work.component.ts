import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { InputTextarea } from 'primeng/inputtextarea';
import { DialogModule } from 'primeng/dialog';
import { GestionService } from '../../../shared/service/gestion.service';
import { Company, GestionUser, OrderWorkItem, OrderWorkPayload } from '../../../shared/interfaces/Response.interface';
import {
  CatalogService,
  ConstructoraDto,
  ProyectoDto,
} from '../../../../../shared/services/catalog.service';
import { ContractsService } from '../../../../contracts/shared/service/contracts.service';
import { AdministracionService } from '../../../../administracion/shared/service/administracion.service';
import { TIPO_CONTRATO_DOCUMENTO_OPTIONS, labelTipoContratoDocumento } from '../../../../contracts/shared/constants/tipo-contrato.constants';
import { OrderWorkPrintFormatComponent } from '../../../shared/order-work-print-format/order-work-print-format.component';
import {
  OrderWorkPrintHeader,
  OrderWorkPrintItem,
} from '../../../shared/order-work-print-format/order-work-print-format.model';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-create-order-work',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    CalendarModule,
    DropdownModule,
    ButtonModule,
    InputTextarea,
    DialogModule,
    OrderWorkPrintFormatComponent,
  ],
  templateUrl: './create-order-work.component.html',
  styleUrls: ['./create-order-work.component.scss'],
})
export class CreateOrderWorkComponent implements OnInit, OnDestroy {
  @ViewChild('orderWorkPrintExport') orderWorkPrintRef?: OrderWorkPrintFormatComponent;

  consecutivo: string = '';
  fechaEntrega: Date | null = null;
  observaciones: string = '';
  tipoDocumento: string = '';
  /** Filtro Contrato / Cotizacion / OfertaM… para consecutivos */
  selectedTipoConsecutivo: string | null = null;
  autorizo: string = '';

  tipoCorte: string = '';
  readonly tipoCorteOptions = [
    { label: 'FABRICACIÓN', value: 'FABRICACIÓN' },
    { label: 'INSTALACIÓN', value: 'INSTALACIÓN' },
    { label: 'PINTURA', value: 'PINTURA' },
  ];

  companies: Company[] = [];
  workUsers: GestionUser[] = [];
  userSelected: number | null = null;
  empresaSelectedId: number | null = null;

  constructorasOptions: { label: string; value: string }[] = [];
  proyectosOptions: { label: string; value: string }[] = [];
  contratosOptions: { label: string; value: string }[] = [];
  documentoNumeroOptions: { label: string; value: string }[] = [];
  readonly tipoConsecutivoOptions = TIPO_CONTRATO_DOCUMENTO_OPTIONS;
  constructoraSelectedId: string | null = null;
  proyectoSelectedId: string | null = null;
  contratoSelected: string | null = null;
  sinContrato = false;
  numeroCotizacion = '';

  items: OrderWorkItem[] = [];

  loading: boolean = false;
  loadingCompanies: boolean = false;
  loadingUsers: boolean = false;
  generatingPdf: boolean = false;
  showPreview: boolean = false;
  showPdfForExport: boolean = false;
  wasPreviewed: boolean = false;
  pdfHeader: OrderWorkPrintHeader | null = null;
  pdfItems: OrderWorkPrintItem[] = [];

  private subscriptions: Subscription = new Subscription();

  constructor(
    private gestionService: GestionService,
    private catalogService: CatalogService,
    private contractsService: ContractsService,
    private administracionService: AdministracionService
  ) {}

  ngOnInit(): void {
    this.addItemRow();
    // this.loadCompanies();
    this.getAllUsers();
    this.loadCatalogs();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  addItemRow(): void {
    const newItem: OrderWorkItem = {
      ref: '',
      item: '',
      descripcion: '',
      cantidad: 0,
      um: '',
      ancho: 0,
      alto: 0,
      observaciones: '',
    };
    this.items.push(newItem);
  }

  removeItemRow(index: number): void {
    if (index >= 0 && index < this.items.length) {
      this.items.splice(index, 1);
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  private loadCatalogs(): void {
    const consSub = this.catalogService.getConstructoras().subscribe({
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
    this.subscriptions.add(consSub);

    const contSub = this.contractsService.consultarContratos().subscribe({
      next: (res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.contratosOptions = list.map((c) => ({
          label: c.label || c.numero_contrato || c.value,
          value: c.value || c.numero_contrato,
        }));
      },
      error: () => {
        this.contratosOptions = [];
      },
    });
    this.subscriptions.add(contSub);
  }

  onConstructoraChange(id: string | null): void {
    this.constructoraSelectedId = id;
    this.proyectoSelectedId = null;
    this.proyectosOptions = [];
    this.documentoNumeroOptions = [];
    this.selectedTipoConsecutivo = null;
    this.tipoDocumento = '';
    if (!id) return;

    const sub = this.catalogService.getProyectosByConstructora(id).subscribe({
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
    this.subscriptions.add(sub);
  }

  onProyectoChange(id: string | null): void {
    this.proyectoSelectedId = id;
    this.selectedTipoConsecutivo = null;
    this.documentoNumeroOptions = [];
    this.tipoDocumento = '';
  }

  onTipoConsecutivoChange(tipo: string | null): void {
    this.selectedTipoConsecutivo = tipo;
    this.tipoDocumento = '';
    this.loadDocumentoNumeroOptions();
  }

  /** Catálogo N° → Tipo Documento (proyecto + tipo Contrato/Cotizacion…). */
  private loadDocumentoNumeroOptions(): void {
    const idProyecto = this.proyectoSelectedId
      ? Number(this.proyectoSelectedId)
      : null;
    const tipo = String(this.selectedTipoConsecutivo || '').trim();
    if (!idProyecto || !Number.isFinite(idProyecto) || idProyecto <= 0 || !tipo) {
      this.documentoNumeroOptions = [];
      return;
    }

    const sub = this.administracionService
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
        },
        error: () => {
          this.documentoNumeroOptions = [];
        },
      });
    this.subscriptions.add(sub);
  }

  loadCompanies(): void {
    this.loadingCompanies = true;
    const sub = this.gestionService.getCompanies().subscribe({
      next: (res: Company[]) => {
        this.companies = res;
        this.loadingCompanies = false;
      },
      error: (err) => {
        console.error('Error al obtener empresas:', err);
        this.loadingCompanies = false;
        Swal.fire({
          title: 'Error',
          text: 'Error al obtener las empresas. Por favor, intente nuevamente.',
          icon: 'error',
          confirmButtonColor: '#00517b',
          allowOutsideClick: false,
        });
      },
    });
    this.subscriptions.add(sub);
  }

  getAllUsers(): void {
    this.loadingUsers = true;
    const sub = this.gestionService.getAllUsers().subscribe({
      next: (res) => {
        this.workUsers = res.data.map(user => ({
          ...user,
          displayName: `${user.nombre} ${user.apellido} - ${user.perfil}`
        }));
        this.loadingUsers = false;
      },
      error: (err) => {
        console.error('Error al obtener usuarios:', err);
        this.loadingUsers = false;
        Swal.fire({
          title: 'Error',
          text: 'Error al obtener los usuarios. Por favor, intente nuevamente.',
          icon: 'error',
          confirmButtonColor: '#00517b',
          allowOutsideClick: false,
        });
      },
    });
    this.subscriptions.add(sub);
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e: any) => {
      const workbook = XLSX.read(e.target.result, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (!rawData.length) return;

      const headers = rawData[0].map((h: any) =>
        String(h).trim().toUpperCase()
      );

      const expectedColumns = [
        'REF',
        'ITEM',
        'DESCRIPCION',
        'CANT',
        'UM',
        'ANCHO',
        'ALTO',
        'OBSERVACIONES',
      ];

      const missingColumns = expectedColumns.filter(
        col => !headers.includes(col)
      );

      if (missingColumns.length > 0) {
        Swal.fire({
          title: 'Columnas faltantes',
          text: `Faltan las columnas: ${missingColumns.join(', ')}`,
          icon: 'warning',
          confirmButtonColor: '#00517b',
          allowOutsideClick: false,
        });
        return;
      }

      const rows = rawData.slice(1);

      const data = rows.map((row: any[]) => {
        const obj: any = {};
        headers.forEach((header: string, index: number) => {
          obj[header] = row[index];
        });
        return obj;
      });

      const dataWithContent = data.filter((row: any) => {
        const criticalFields = ['REF', 'ITEM', 'DESCRIPCION', 'CANT'];

        const hasCriticalData = criticalFields.some((col: string) => {
          const value = row[col];
          if (value === null || value === undefined) return false;
          if (typeof value === 'string') {
            return value.trim().length > 0;
          }
          if (typeof value === 'number') {
            return value > 0;
          }
          return true;
        });

        if (hasCriticalData) return true;

        return expectedColumns.some((col: string) => {
          if (criticalFields.includes(col)) return false;
          const value = row[col];
          if (value === null || value === undefined) return false;
          if (typeof value === 'string') {
            return value.trim().length > 0;
          }
          if (typeof value === 'number') {
            return value !== 0;
          }
          return true;
        });
      });

      if (!dataWithContent.length) {
        Swal.fire({
          title: 'Alerta',
          text: '¡El archivo no contiene datos válidos! Todas las filas están vacías.',
          icon: 'warning',
          confirmButtonColor: '#00517b',
          allowOutsideClick: false,
        });
        return;
      }

      this.items = dataWithContent.map((row: any): OrderWorkItem => ({
        ref: row['REF'] || '',
        item: row['ITEM'] || '',
        descripcion: row['DESCRIPCION'] || '',
        cantidad: +row['CANT'] || 0,
        um: row['UM'] || '',
        ancho: +row['ANCHO'] || 0,
        alto: +row['ALTO'] || 0,
        observaciones: row['OBSERVACIONES'] || '',
      }));

      Swal.fire({
        title: 'Archivo cargado',
        text: `Se cargaron ${this.items.length} registros correctamente`,
        icon: 'success',
        confirmButtonColor: '#00517b',
        allowOutsideClick: false,
      });
    };

    reader.readAsBinaryString(file);
  }

  private isStringNotEmpty(value: any): boolean {
    if (value === null || value === undefined) return false;
    const str = String(value).trim();
    return str.length > 0;
  }

  onSinContratoChange(): void {
    if (this.sinContrato) {
      this.contratoSelected = null;
    } else {
      this.numeroCotizacion = '';
    }
  }

  private resolveVinculoClave(): string {
    if (this.sinContrato) {
      return String(this.numeroCotizacion ?? '').trim();
    }
    return String(this.contratoSelected ?? '').trim();
  }

  private resolveTipoVinculo(): 'CONTRATO' | 'COTIZACION' {
    return this.sinContrato ? 'COTIZACION' : 'CONTRATO';
  }

  private isValidItem(item: OrderWorkItem): boolean {
    return !!(
      this.isStringNotEmpty(item.ref) &&
      this.isStringNotEmpty(item.item) &&
      this.isStringNotEmpty(item.descripcion) &&
      item.cantidad > 0 &&
      this.isStringNotEmpty(item.um)
    );
  }

  private isCompleteItemForPdf(item: OrderWorkItem): boolean {
    return !!(
      this.isStringNotEmpty(item.ref) &&
      this.isStringNotEmpty(item.item) &&
      this.isStringNotEmpty(item.descripcion) &&
      Number(item.cantidad) > 0 &&
      this.isStringNotEmpty(item.um) &&
      item.ancho !== null &&
      item.ancho !== undefined &&
      String(item.ancho).trim() !== '' &&
      item.alto !== null &&
      item.alto !== undefined &&
      String(item.alto).trim() !== '' &&
      this.isStringNotEmpty(item.observaciones)
    );
  }

  private getValidItems(): OrderWorkItem[] {
    return this.items.filter(item => this.isValidItem(item));
  }

  private resolveOptionLabel(
    options: { label: string; value: string }[],
    value: string | null
  ): string {
    if (!value) return '';
    return options.find((o) => o.value === value)?.label || value;
  }

  private getEncargadoNombre(): string {
    const user = this.workUsers.find((u) => u.id_usuario === this.userSelected);
    if (!user) return '';
    return `${user.nombre} ${user.apellido}`.trim();
  }

  private validateForPdf(): string | null {
    if (!this.isStringNotEmpty(this.consecutivo)) {
      return 'El campo Consecutivo es obligatorio para generar el PDF.';
    }
    if (!this.isStringNotEmpty(this.tipoCorte)) {
      return 'Debe seleccionar el Tipo Actividad para generar el PDF.';
    }
    if (!this.fechaEntrega) {
      return 'Debe seleccionar la Fecha Entrega para generar el PDF.';
    }
    if (!this.userSelected) {
      return 'Debe seleccionar un Encargado para generar el PDF.';
    }
    if (!this.constructoraSelectedId) {
      return 'Debe seleccionar la Constructora para generar el PDF.';
    }
    if (!this.proyectoSelectedId) {
      return 'Debe seleccionar el Proyecto para generar el PDF.';
    }
    if (!this.isStringNotEmpty(this.tipoDocumento)) {
      return 'El campo Tipo Documento es obligatorio para generar el PDF.';
    }
    const vinculoClave = this.resolveVinculoClave();
    if (!vinculoClave) {
      return this.sinContrato
        ? 'Debe indicar el N° Cotización para generar el PDF.'
        : 'Debe seleccionar el Contrato para generar el PDF.';
    }
    if (!this.isStringNotEmpty(this.observaciones)) {
      return 'El campo Observaciones es obligatorio para generar el PDF.';
    }
    if (!this.isStringNotEmpty(this.autorizo)) {
      return 'El campo Autorizo es obligatorio para generar el PDF.';
    }

    const rows = this.items || [];
    if (!rows.length) {
      return 'Debe agregar al menos un item para generar el PDF.';
    }

    const incomplete = rows.some((item) => !this.isCompleteItemForPdf(item));
    if (incomplete) {
      return 'Todos los items deben estar completos (Ref, Item, Cant, UM, Ancho, Alto, Descripción y Observaciones) para generar el PDF.';
    }

    return null;
  }

  private buildPdfData(): { header: OrderWorkPrintHeader; items: OrderWorkPrintItem[] } {
    return {
      header: {
        consecutivo: this.consecutivo.trim(),
        fecha_entrega: this.fechaEntrega,
        constructora: this.resolveOptionLabel(
          this.constructorasOptions,
          this.constructoraSelectedId
        ),
        proyecto: this.resolveOptionLabel(
          this.proyectosOptions,
          this.proyectoSelectedId
        ),
        tipo_documento: this.selectedTipoConsecutivo
          ? `${labelTipoContratoDocumento(this.selectedTipoConsecutivo)} — ${this.tipoDocumento.trim()}`
          : this.tipoDocumento.trim(),
        contrato: this.resolveVinculoClave(),
        encargado: this.getEncargadoNombre(),
        observaciones: this.observaciones.trim(),
        autorizo: this.autorizo.trim(),
        tipo_actividad: this.tipoCorte.trim(),
      },
      items: this.items.map((row) => ({
        item: row.item,
        detalle: row.descripcion,
        cantidad: row.cantidad,
        um: row.um,
        ancho: row.ancho,
        alto: row.alto,
        plano_no: row.ref,
        observaciones: row.observaciones,
      })),
    };
  }

  onPrevisualizar(): void {
    const error = this.validateForPdf();
    if (error) {
      Swal.fire({
        title: 'Validación',
        text: error,
        icon: 'warning',
        confirmButtonColor: '#00517b',
        allowOutsideClick: false,
      });
      return;
    }

    const data = this.buildPdfData();
    this.pdfHeader = data.header;
    this.pdfItems = data.items;
    this.showPreview = true;
    this.wasPreviewed = true;
  }

  closePreview(): void {
    this.showPreview = false;
  }

  onGenerarPdf(): void {
    const error = this.validateForPdf();
    if (error) {
      Swal.fire({
        title: 'Validación',
        text: error,
        icon: 'warning',
        confirmButtonColor: '#00517b',
        allowOutsideClick: false,
      });
      return;
    }

    if (!this.wasPreviewed) {
      Swal.fire({
        title: 'Atención',
        text: 'Debe previsualizar la orden de trabajo antes de generar el PDF.',
        icon: 'warning',
        confirmButtonColor: '#00517b',
        allowOutsideClick: false,
      });
      return;
    }

    this.descargarPdf();
  }

  descargarPdf(): void {
    const error = this.validateForPdf();
    if (error) {
      Swal.fire({
        title: 'Validación',
        text: error,
        icon: 'warning',
        confirmButtonColor: '#00517b',
        allowOutsideClick: false,
      });
      return;
    }

    if (this.generatingPdf) return;

    const data = this.buildPdfData();
    this.pdfHeader = data.header;
    this.pdfItems = data.items;
    this.generatingPdf = true;
    this.showPdfForExport = true;

    Swal.fire({
      title: 'Generando PDF...',
      text: 'Por favor espere',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(null),
    });

    setTimeout(() => {
      const printCmp = this.orderWorkPrintRef;
      if (!printCmp) {
        this.generatingPdf = false;
        this.showPdfForExport = false;
        Swal.fire({
          title: 'Error',
          text: 'No se pudo preparar el formato del PDF.',
          icon: 'error',
          confirmButtonColor: '#00517b',
          allowOutsideClick: false,
        });
        return;
      }

      const fileName = `Orden_Trabajo_${this.consecutivo.trim() || 'OT'}.pdf`;
      printCmp
        .generatePdf(fileName)
        .then(() => {
          Swal.close();
        })
        .catch(() => {
          Swal.fire({
            title: 'Error',
            text: 'No se pudo generar el PDF de la orden de trabajo.',
            icon: 'error',
            confirmButtonColor: '#00517b',
            allowOutsideClick: false,
          });
        })
        .finally(() => {
          this.generatingPdf = false;
          this.showPdfForExport = false;
        });
    }, 250);
  }

  guardarOrden(): void {
    if (!this.isStringNotEmpty(this.consecutivo)) {
      Swal.fire({
        title: 'Validación',
        text: 'El campo Consecutivo es obligatorio',
        icon: 'warning',
        confirmButtonColor: '#00517b',
        allowOutsideClick: false,
      });
      return;
    }

    if (!this.isStringNotEmpty(this.tipoCorte)) {
      Swal.fire({
        title: 'Validación',
        text: 'Debe seleccionar el Tipo Actividad',
        icon: 'warning',
        confirmButtonColor: '#00517b',
        allowOutsideClick: false,
      });
      return;
    }

    if (!this.userSelected) {
      Swal.fire({
        title: 'Validación',
        text: 'Debe seleccionar un encargado',
        icon: 'warning',
        confirmButtonColor: '#00517b',
        allowOutsideClick: false,
      });
      return;
    }

    if (!this.fechaEntrega) {
      Swal.fire({
        title: 'Validación',
        text: 'Debe seleccionar una fecha de entrega',
        icon: 'warning',
        confirmButtonColor: '#00517b',
        allowOutsideClick: false,
      });
      return;
    }

    if (!this.items || this.items.length === 0) {
      Swal.fire({
        title: 'Validación',
        text: 'Debe agregar al menos un item',
        icon: 'warning',
        confirmButtonColor: '#00517b',
        allowOutsideClick: false,
      });
      return;
    }

    const validItems = this.getValidItems();
    const invalidItemsCount = this.items.length - validItems.length;

    if (validItems.length === 0) {
      Swal.fire({
        title: 'Validación',
        text: 'Debe agregar al menos un item con todos los campos requeridos (Ref, Item, Descripción, Cantidad > 0, UM)',
        icon: 'warning',
        confirmButtonColor: '#00517b',
        allowOutsideClick: false,
      });
      return;
    }

    if (invalidItemsCount > 0) {
      Swal.fire({
        title: 'Validación',
        text: `Hay ${invalidItemsCount} item(s) incompletos. Solo se guardarán los ${validItems.length} item(s) válidos. ¿Desea continuar?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#00517b',
        cancelButtonColor: '#6c757d',
        allowOutsideClick: false,
      }).then((result) => {
        if (result.isConfirmed) {
          this.saveOrderWork(validItems);
        }
      });
      return;
    }

    this.saveOrderWork(validItems);
  }

  private saveOrderWork(validItems: OrderWorkItem[]): void {
    const clave = this.resolveVinculoClave();
    if (!clave) {
      Swal.fire({
        title: 'Validación',
        text: this.sinContrato
          ? 'Debe indicar el N° Cotización.'
          : 'Debe seleccionar el Contrato o marcar Sin contrato e indicar N° Cotización.',
        icon: 'warning',
        confirmButtonColor: '#00517b',
        allowOutsideClick: false,
      });
      return;
    }

    if (!String(this.selectedTipoConsecutivo || '').trim()) {
      Swal.fire({
        title: 'Validación',
        text: 'Debe seleccionar Tipo documento (Contrato, Cotización, Oferta…).',
        icon: 'warning',
        confirmButtonColor: '#00517b',
        allowOutsideClick: false,
      });
      return;
    }
    if (!this.isStringNotEmpty(this.tipoDocumento)) {
      Swal.fire({
        title: 'Validación',
        text: 'Debe indicar el N° Documento.',
        icon: 'warning',
        confirmButtonColor: '#00517b',
        allowOutsideClick: false,
      });
      return;
    }

    const payload: OrderWorkPayload = {
      consecutivo: this.consecutivo.trim(),
      tipo_corte: this.tipoCorte.trim(),
      empresa_asociada_id: null,
      encargado_id: this.userSelected,
      fecha_entrega: this.fechaEntrega,
      observaciones: this.observaciones?.trim() || '',
      ot_constructora: this.resolveOptionLabel(
        this.constructorasOptions,
        this.constructoraSelectedId
      ),
      ot_proyecto: this.resolveOptionLabel(
        this.proyectosOptions,
        this.proyectoSelectedId
      ),
      // N° Documento (consecutivo). El tipo (Contrato/…) va en observaciones de traza vía PDF;
      // columna ot_tipo_documento conserva el N° como hasta ahora.
      ot_tipo_documento: this.tipoDocumento?.trim() || '',
      ot_contrato: clave,
      ot_autorizo: this.autorizo?.trim() || '',
      ot_tipo_vinculo: this.resolveTipoVinculo(),
      items: validItems,
    };

    this.loading = true;
    const sub = this.gestionService.createOrderWork(payload).subscribe({
      next: () => {
        this.loading = false;
        Swal.fire({
          title: 'Éxito',
          text: '¡Orden de trabajo creada correctamente!',
          icon: 'success',
          confirmButtonColor: '#00517b',
          allowOutsideClick: false,
        });
        this.resetForm();
      },
      error: (err) => {
        this.loading = false;
        const errorMessage = err?.error?.message || err?.message || 'Error al crear la orden de trabajo';
        Swal.fire({
          title: 'Error',
          text: errorMessage,
          icon: 'error',
          confirmButtonColor: '#00517b',
          allowOutsideClick: false,
        });
      }
    });
    this.subscriptions.add(sub);
  }

  resetForm(): void {
    this.consecutivo = '';
    this.fechaEntrega = null;
    this.observaciones = '';
    this.tipoCorte = '';
    this.tipoDocumento = '';
    this.autorizo = '';
    this.empresaSelectedId = null;
    this.userSelected = null;
    this.constructoraSelectedId = null;
    this.proyectoSelectedId = null;
    this.contratoSelected = null;
    this.sinContrato = false;
    this.numeroCotizacion = '';
    this.proyectosOptions = [];
    this.items = [];
    this.showPreview = false;
    this.showPdfForExport = false;
    this.wasPreviewed = false;
    this.pdfHeader = null;
    this.pdfItems = [];
    this.addItemRow();
  }

  onAdjuntarActa(): void {
    console.log('Adjuntar Acta de Medida');
  }

  onAdjuntarPlano(): void {
    console.log('Adjuntar Plano');
  }
}
