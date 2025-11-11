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
import { ContractsService } from '../../../shared/service/contracts.service';
import { FloatLabelModule } from 'primeng/floatlabel';
import {
  ContractTypeResponse,
  ContractFieldResponse,
} from '../../../shared/interfaces/Response.interface';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { InsertContractRequest } from '../../../shared/interfaces/Request.interface';

@Component({
  selector: 'app-document-contract',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DropdownModule,
    ReactiveFormsModule,
    InputTextModule,
    CalendarModule,
    FloatLabelModule,
  ],
  templateUrl: './contract.component.html',
  styleUrls: ['../../select-document/selectDocument.component.scss'],
})
export class DocumentContractComponent implements OnInit {
  contractTypes: ContractTypeResponse[] = [];
  selectedType: string = '';
  fields: ContractFieldResponse[] = [];
  form: FormGroup = new FormGroup({});

  showPreviewContrato: boolean = false;
  aiuFile: File | null = null;
  ivaFile: File | null = null;
  hiddenFields = new Set<string>();

  constructor(
    private contractsService: ContractsService,
    private fb: FormBuilder
  ) {}

  contractTypeOptions = [
    { label: 'Suministro', value: 'Suministro' },
    { label: 'Instalación', value: 'Instalación' },
    { label: 'Suministro e instalación', value: 'Suministro e instalación' },
  ];

  statusOptionsByType: { [key: string]: { label: string; value: string }[] } = {
    CONTRATO: [
      { label: 'Activo', value: 'Activo' },
      { label: 'Finalizado', value: 'Finalizado' },
    ],
  };

  yesNoOptions = [
    { label: 'Sí', value: 'Si' },
    { label: 'No', value: 'No' },
  ];

  ngOnInit(): void {
    this.loadContractTypes();
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
          tipo_doc: t.tipo_doc ? t.tipo_doc.toUpperCase() : t.tipo_doc,
        }));
      },
      error: (err) => {
        console.error('Error al cargar tipos de contrato', err);
      },
    });
  }

  // ====== CAMBIO DE TIPO ======
  onTypeChange(): void {
    if (!this.selectedType) return;

    // reset previews al cambiar tipo
    this.showPreviewContrato = false;

    this.contractsService.getTypeFields(this.selectedType).subscribe({
      next: (fields) => {
        const camposActivos = fields.filter((f) => f.estadocampo === '1');

        let orden: string[] = [];
        this.hiddenFields = new Set<string>();

        if (this.selectedType === 'CONTRATO') {
          orden = [
            'numero_contrato',
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
            'polizas_finales',
            'valor_polizas',
            'estado_polizas',
            'valor_contrato',
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

        this.fields = camposOrdenados;
        this.buildForm(this.fields);
      },
      error: (err) => console.error('Error al cargar campos', err),
    });
  }

  // ====== FORM DINÁMICO ======
  buildForm(fields: ContractFieldResponse[]) {
    const group: { [key: string]: any } = {};
    fields.forEach((field) => (group[field.nombre_campo_doc] = ['']));
    this.form = this.fb.group(group);
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
      Swal.fire(
        'Error',
        'El archivo debe ser formato Excel (.xlsx o .xls)',
        'error'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
        });

        if (!jsonData || jsonData.length < 2) {
          Swal.fire(
            'Error',
            'El archivo está vacío o mal estructurado.',
            'error'
          );
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
        Swal.fire(
          'Error',
          'Error en el servicio. No se pudo leer el archivo Excel.',
          'error'
        );
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
      next: () =>
        Swal.fire('Éxito', 'Archivo AIU cargado correctamente', 'success'),
      error: () =>
        Swal.fire('Error', 'Error al cargar el archivo AIU', 'error'),
    });
  }
  uploadIVAExcel() {
    if (!this.ivaFile) {
      Swal.fire('Advertencia', 'Debe seleccionar un archivo IVA', 'warning');
      return;
    }
    this.contractsService.uploadExcelIVA(this.ivaFile).subscribe({
      next: () =>
        Swal.fire('Éxito', 'Archivo IVA cargado correctamente', 'success'),
      error: () =>
        Swal.fire('Error', 'Error al cargar el archivo IVA', 'error'),
    });
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
        this.form.value.numero_contrato ||
        `CT-${new Date().toISOString().slice(0, 10)}`,
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

        // Para contrato: subir adjuntos si hay
        if (this.selectedType === 'CONTRATO') {
          if (this.aiuFile) this.uploadAIUExcel();
          if (this.ivaFile) this.uploadIVAExcel();
        }

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

  private resetAll() {
    this.form.reset();
    this.fields = [];
    this.selectedType = '';
    this.aiuFile = null;
    this.ivaFile = null;
    this.showPreviewContrato = false;
    this.hiddenFields.clear();
  }

  // Evita submit por Enter del form. Redirige según tipo
  onSubmitSelected(): void {
    if (this.selectedType === 'CONTRATO') this.onSubmitContrato();
  }
}
