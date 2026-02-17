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
import { ContractsService } from '../../shared/service/contracts.service';
import { FloatLabelModule } from 'primeng/floatlabel';
import {
  ContractTypeResponse,
  ContractFieldResponse,
} from '../../shared/interfaces/Response.interface';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { InsertContractRequest } from '../../shared/interfaces/Request.interface';
import html2pdf from 'html2pdf.js';

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
    //Button,
    //FloatLabel,
  ],
  templateUrl: './selectDocument.component.html',
  styleUrls: ['./selectDocument.component.scss'],
})
export class ContractSelectTypeComponent implements OnInit {
  contractTypes: ContractTypeResponse[] = [];
  selectedType: string = '';
  fields: ContractFieldResponse[] = [];
  form: FormGroup = new FormGroup({});
  aiuFile: File | null = null;
  ivaFile: File | null = null;
  ocFile: File | null = null;
  ordenCompraData: any[] = [];
  companies: any[] = [];

  // Previews independientes
  showPreviewContrato: boolean = false;
  showPreviewVisita: boolean = false;
  showPreviewActa: boolean = false;
  showPreviewOC: boolean = false;
  showPreviewAP: boolean = false;
  showPreviewRemision: boolean = false;

  // Campos a ocultar por tipo (ej: fecha en Visita)
  hiddenFields = new Set<string>();
  userProfile: string = "";
  filteredContractTypes: any[] = [];

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

  constructor(
    private contractsService: ContractsService,
    private fb: FormBuilder
  ) {}

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

  ngOnInit(): void {
    this.userProfile = localStorage.getItem("nombre_perfil") || ""; 
    this.loadContractTypes();
    this.loadCompanies();
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

  // ====== CAMBIO DE TIPO ======
  onTypeChange(): void {
    if (!this.selectedType) return;

    // reset previews al cambiar tipo
    this.showPreviewContrato = false;
    this.showPreviewVisita = false;
    this.showPreviewActa = false;
    this.showPreviewRemision = false;

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
            'numero_contrato',
            'consecutivo',
            'constructora',
            'proyecto',
            'estado',
            'fecha terminación',
            'acta_produccion',
            'despiece_material',
            'observaciones',
            'foto1',
            'foto2',
            'foto3'
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

    this.form.get('empresa_asociada')?.valueChanges.subscribe(value => {
      this.setEmpresaImpresion();
    });
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
    error: () => {
      Swal.fire('Error', 'Error al cargar el archivo AIU', 'error');
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
    error: () => {
      Swal.fire('Error', 'Error al cargar el archivo IVA', 'error');
    },
  });
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

    this.remisionData = jsonData.slice(1).map((row: any[], index: number) => ({
      item: row[2] ?? index + 1,
      cantidad: row[3] ?? '',
      um: row[4] ?? '',
      detalle: row[5] ?? '',
      observaciones: row[6] ?? ''
    }));

    Swal.fire("Éxito", "Archivo de Remisión cargado correctamente", "success");
  };

  reader.readAsArrayBuffer(file);
}

resetRemision(): void {
  this.form.reset();
  this.remisionFile = null;

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



//Remisiones carga
onOCFileActaPago(event: any): void {
  const file = event.target.files[0];
  if (file) {
    this.ocFile = file;
    console.log("Archivo de Acta Pag seleccionado:", file.name);
  }
}


// Simular envío de archivo
uploadOCFile(): void {
  if (!this.ocFile) {
    Swal.fire("Advertencia", "Debe seleccionar un archivo de Orden de Compra", "warning");
    return;
  }

  this.contractsService.uploadExcelOrder(this.ocFile).subscribe({
    next: () => {
      Swal.fire("Éxito", "Orden de Compra cargada correctamente", "success");
    },
    error: (err) => {
      Swal.fire("Error", err?.error?.mensaje || "Error al cargar Orden de Compra", "error");
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
uploadOCActaCompra(): void {
  if (!this.ocFile) {
    Swal.fire("Advertencia", "Debe seleccionar un archivo de Acta de Pago", "warning");
    return;
  }

  this.contractsService.uploadExcelActaPago(this.ocFile).subscribe({
    next: () => {
      Swal.fire("Éxito", "Acta de pago cargada correctamente", "success");
      this.ocFile = null; 
    },
    error: (err) => {
      const errorMessage = err?.error?.error; 
      const detalle = err?.error?.detalle;

      if (errorMessage?.includes("no corresponde al formato de Actas de Pago")) {
        Swal.fire("Formato inválido", detalle || errorMessage, "warning");
      } else {
        Swal.fire("Error", errorMessage || "Error al cargar archivo Acta de pago", "error");
      }
    },
  });
}

saveOCInputs(): void {
  if (!this.selectedType) {
    Swal.fire("Advertencia", "Debe seleccionar un tipo de documento", "warning");
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

// Previsualizar ACTAS DE PAGO
onPreviewAC(): void {
  this.showPreviewAP = true;
  console.log("Mostrando previsualización Actas de Pago");
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

  this.showPreviewRemision = true;
}


// Cerrar previsualización
closePreviewOC(): void {
  this.showPreviewOC = false;
}

closePreviewAP(): void {
  this.showPreviewAP = false;
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
    if (!this.form.valid) {
      Swal.fire('Atención', 'Complete todos los campos del acta.', 'warning');
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
    if (!this.form.valid) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Debe diligenciar todos los campos requeridos antes de guardar el acta.',
      });
      return;
    }

    this.guardarGenerico({
      numerodoc:
        this.form.value.consecutivo || `AC-${new Date().toISOString().slice(0, 10)}`,
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
    this.showPreviewVisita = false;
    this.showPreviewActa = false;
    this.hiddenFields.clear();
  }

  // Evita submit por Enter del form. Redirige según tipo
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

    if (!this.remisionData.length) {
      Swal.fire('Atención', 'Debe cargar el archivo plano.', 'warning');
      return;
    }

    const element = document.querySelector('.print-page') as HTMLElement | null;

    if (!element) {
      Swal.fire('Error', 'No se encontró el contenido para generar el PDF.', 'error');
      return;
    }

    const options = {
      margin: 5,
      filename: `Remision_${this.form.value["remision_material"]}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm' as const, format: 'letter' as const, orientation: 'portrait' as const }
    };

    html2pdf().set(options).from(element).save();
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
