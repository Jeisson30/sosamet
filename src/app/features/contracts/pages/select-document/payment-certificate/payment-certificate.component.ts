import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
} from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { CalendarModule } from 'primeng/calendar';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ButtonModule } from 'primeng/button';
import { ContractsService } from '../../../shared/service/contracts.service';
import { ContractFieldResponse } from '../../../shared/interfaces/Response.interface';
import { InsertContractRequest } from '../../../shared/interfaces/Request.interface';
import Swal from 'sweetalert2';

const TIPO_DOC = 'ACTAS DE PAGO';

@Component({
  selector: 'app-payment-certificate',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DropdownModule,
    InputTextModule,
    CalendarModule,
    FloatLabelModule,
    ButtonModule,
  ],
  templateUrl: './payment-certificate.component.html',
  styleUrls: ['./payment-certificate.component.scss'],
})
export class PaymentCertificateComponent implements OnInit {
  fields: ContractFieldResponse[] = [];
  form: FormGroup = new FormGroup({});
  companies: any[] = [];
  ocFile: File | null = null;
  showPreview = false;
  hiddenFields = new Set<string>();
  excelUploaded = false;
  actaPlanoId: number | null = null;

  statusOptionsByType: { [key: string]: { label: string; value: string }[] } = {
    [TIPO_DOC]: [
      { label: 'En Revisión', value: 'En Revisión' },
      { label: 'Facturado', value: 'Facturado' },
      { label: 'Pago', value: 'Pago' },
    ],
  };

  yesNoOptions = [
    { label: 'Sí', value: 'Si' },
    { label: 'No', value: 'No' },
  ];

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
  ];

  paymentDocumentTypeOptions = [
    { label: 'Factura de venta', value: 'Factura de venta' },
    { label: 'Cuenta De Cobro', value: 'Cuenta De Cobro' },
    { label: 'Otro', value: 'Otro' },
  ];

  get currentStatusOptions() {
    return this.statusOptionsByType[TIPO_DOC] || [];
  }

  constructor(
    private contractsService: ContractsService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.loadCompanies();
    this.loadFields();
  }

  loadCompanies(): void {
    this.contractsService.getCompanies().subscribe({
      next: (res) => (this.companies = res),
      error: (err) => console.error('Error al obtener empresas:', err),
    });
  }

  /** Nombre del control de fecha de emisión (desde BD o por descripción) */
  get fechaEmisionControlName(): string | null {
    const byDesc = this.fields.find(
      (f) =>
        (f.desc_campo_doc && /emisi[oó]n/i.test(f.desc_campo_doc)) ||
        (f.tipo_dato === 'date' &&
          (f.nombre_campo_doc === 'fecha_emision_actap' ||
            f.nombre_campo_doc === 'fecha_emision' ||
            f.nombre_campo_doc === 'fecha emision'))
    );
    if (byDesc) return byDesc.nombre_campo_doc;
    if (this.form.get('fecha_emision_actap')) return 'fecha_emision_actap';
    if (this.form.get('fecha_emision')) return 'fecha_emision';
    if (this.form.get('fecha emision')) return 'fecha emision';
    return null;
  }

  /** Días transcurridos desde fecha de emisión hasta hoy; null si no hay fecha */
  get diasTranscurridos(): number | null {
    const key = this.fechaEmisionControlName;
    const raw = key ? this.form.get(key)?.value : null;
    if (raw == null || raw === '') return null;
    const d = raw instanceof Date ? raw : new Date(raw);
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    const diff = Math.floor(
      (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff >= 0 ? diff : 0;
  }

  loadFields(): void {
    this.contractsService.getTypeFields(TIPO_DOC).subscribe({
      next: (fields) => {
        const camposActivos = fields.filter((f) => f.estadocampo === '1');
        const orden = [
          'tipo_documento_actap',   
          'consecutivo_actas_pago',
          'empresa',               
          'fecha_emision_actap',    
          'constructora_actasp',  
          'proyecto',            
          'numero_actap',           
          'total_actap',            
          'concepto_actap',         
          'estado',                 
          'recibo_caja_actap',      
          'fecha_pago_actap',       
          'numero_contrato',       
        ];
        const ordenados = [
          ...orden.flatMap((key) =>
            camposActivos.filter((f) => f.nombre_campo_doc === key)
          ),
          ...camposActivos.filter((f) => !orden.includes(f.nombre_campo_doc)),
        ];
        // Campos tipo file (adjuntar documento/foto) al final, antes del bloque Excel
        const sinFile = ordenados.filter((f) => f.tipo_dato !== 'file');
        const conFile = ordenados.filter((f) => f.tipo_dato === 'file');
        this.fields = [...sinFile, ...conFile];
        this.buildForm(this.fields);
      },
      error: (err) => console.error('Error al cargar campos Actas de Pago', err),
    });
  }

  buildForm(fields: ContractFieldResponse[]): void {
    const group: { [key: string]: any } = {};
    fields.forEach((field) => (group[field.nombre_campo_doc] = ['']));
    this.form = this.fb.group(group);
  }

  onFileChange(event: Event, fieldName: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.form.patchValue({ [fieldName]: input.files[0] });
    }
  }

  /** Extensiones permitidas para el Excel de Actas de Pago */
  private readonly EXCEL_EXTENSIONS = ['.xlsx', '.xls'];
  private readonly MAX_FILE_SIZE_MB = 10;

  onOCFileActaPago(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.ocFile = file;
      this.excelUploaded = false;
    }
  }

  /**
   * Valida el archivo en front (extensión y tamaño).
   * La validación de formato/estructura del Excel (columnas, hojas correctas) la debe hacer el backend.
   */
  private validateExcelFile(file: File): string | null {
    const name = (file.name || '').toLowerCase();
    const hasValidExt = this.EXCEL_EXTENSIONS.some((ext) => name.endsWith(ext));
    if (!hasValidExt) {
      return `Solo se permiten archivos Excel (.xlsx o .xls). El archivo "${file.name}" no tiene una extensión válida.`;
    }
    const maxBytes = this.MAX_FILE_SIZE_MB * 1024 * 1024;
    if (file.size <= 0) {
      return 'El archivo está vacío. Seleccione un archivo Excel válido.';
    }
    if (file.size > maxBytes) {
      return `El archivo no debe superar ${this.MAX_FILE_SIZE_MB} MB.`;
    }
    return null;
  }

  uploadOCActaCompra(): void {
    if (!this.ocFile) {
      Swal.fire('Advertencia', 'Debe seleccionar un archivo de Acta de Pago', 'warning');
      return;
    }

    const frontError = this.validateExcelFile(this.ocFile);
    if (frontError) {
      Swal.fire('Archivo inválido', frontError, 'warning');
      return;
    }

    this.contractsService.uploadExcelActaPago(this.ocFile).subscribe({
      next: (res: any) => {
        Swal.fire('Éxito', 'Acta de pago cargada correctamente', 'success');
        this.ocFile = null;
        this.actaPlanoId = res.actaId;
        this.excelUploaded = true;
        const input = document.getElementById('actaPagoFile') as HTMLInputElement;
        if (input) input.value = '';
      },
      error: (err) => {
        const body = err?.error || {};
        const errorMessage =
          body.error || body.mensaje || body.message || 'Error al cargar archivo Acta de pago';
        const detalle = body.detalle || body.detail || '';

        if (
          typeof errorMessage === 'string' &&
          errorMessage.toLowerCase().includes('formato')
        ) {
          Swal.fire('Formato inválido', detalle || errorMessage, 'warning');
        } else {
          Swal.fire('Error', detalle ? `${errorMessage}\n\n${detalle}` : errorMessage, 'error');
        }
      },
    });
  }

  save(): void {
    // Validar que todos los campos (no archivo) estén diligenciados
    const camposVacios = this.fields.filter((f) => {
      if (f.tipo_dato === 'file') return false;
      const control = this.form.get(f.nombre_campo_doc);
      const valor = control?.value;
      return valor === null || valor === undefined || valor === '';
    });

    if (camposVacios.length > 0) {
      Swal.fire(
        'Advertencia',
        'Debe diligenciar todos los campos del Acta de Pago antes de guardar.',
        'warning'
      );
      return;
    }

    if (!this.excelUploaded) {
      Swal.fire(
        'Advertencia',
        'Debe cargar el archivo Excel de detalle antes de guardar el Acta de Pago.',
        'warning'
      );
      return;
    }

    const formValue = this.form.value;
    const campos = Object.entries(formValue).map(([nombre, valor]) => ({
      nombre,
      valor: valor instanceof File ? valor.name : String(valor ?? ''),
    }));
    const payload: InsertContractRequest = {
      tipo_doc: TIPO_DOC,
      numerodoc:
        formValue.numero_contrato || `AC-${new Date().toISOString().slice(0, 10)}`,
      acta_plano_id: this.actaPlanoId,
      campos,
    };
    this.contractsService.insertContract(payload).subscribe({
      next: (res) => {
        Swal.fire({
          icon: 'success',
          title: 'Datos de Acta de Pago guardados',
          text: res.mensaje || 'Guardado exitoso',
          confirmButtonText: 'Aceptar',
        }).then(() => this.reset());
      },
      error: (err) => {
        Swal.fire(
          'Error',
          err?.error?.mensaje || 'Error al guardar datos',
          'error'
        );
      },
    });
  }

  onPreview(): void {
    this.showPreview = true;
  }

  closePreview(): void {
    this.showPreview = false;
  }

  getFotoUrl(campo: string): string | null {
    const value = this.form.value[campo];
    if (!value) return null;
    if (value instanceof File) return URL.createObjectURL(value);
    return value;
  }

  private reset(): void {
    this.form.reset();
    this.ocFile = null;
    this.excelUploaded = false;
    const input = document.getElementById('actaPagoFile') as HTMLInputElement;
    if (input) input.value = '';
  }

  getDisplayValue(fieldName: string): string {
    const value = this.form.value[fieldName];
    if (value instanceof File) return value.name;
    return value ?? '';
  }
}
