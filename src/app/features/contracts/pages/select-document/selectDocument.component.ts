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
import { InsertContractRequest } from '../../shared/interfaces/Request.interface';

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

  // ✅ Previews independientes
  showPreviewContrato: boolean = false;
  showPreviewVisita: boolean = false;
  showPreviewActa: boolean = false;

  // ✅ Campos a ocultar por tipo (ej: fecha en Visita)
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

// * Controlamos todos los valores de estado según el tipo de documento
  statusOptionsByType: { [key: string]: { label: string; value: string }[] } = {
    Contrato: [
      { label: 'Activo', value: 'Activo' },
      { label: 'Finalizado', value: 'Finalizado' },
    ],
    Actas: [
      { label: 'En Revisión', value: 'En Revisión' },
      { label: 'Asignada', value: 'Asignada' },
      { label: 'Finalizada', value: 'Finalizada' },
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

  // * ====== CARGA DE TIPOS ======
  loadContractTypes(): void {
    this.contractsService.getTypeContract().subscribe({
      next: (types) => {
        this.contractTypes = types;
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
    this.showPreviewVisita = false;
    this.showPreviewActa = false;

    this.contractsService.getTypeFields(this.selectedType).subscribe({
      next: (fields) => {
        const camposActivos = fields.filter((f) => f.estadocampo === '1');

        let orden: string[] = [];
        this.hiddenFields = new Set<string>();

        if (this.selectedType === 'Contrato') {
          // Orden original de Contrato
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
            'valor_polizas',
            'estado_polizas',
            'valor_contrato',
            'facturado',
            'saldo_contrato',
          ];
        } else if (this.selectedType === 'Asistencia') {
          // ✅ Orden como en la imagen (fecha oculta; hora no requerida)
          orden = [
            'consecutivo',
            'constructora',
            'proyecto',
            'ubicacion',
            'detalle_visita',
            'foto1',
            'foto2',
          ];
          // ocultar fecha si llegara activa
          this.hiddenFields.add('fecha');
        }
        else if (this.selectedType === 'Actas') {
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
  }

  // ====== FILE HANDLERS ======
  onFileChange(event: Event, fieldName: string) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.form.patchValue({ [fieldName]: input.files[0] });
    }
  }

  onAIUFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) this.aiuFile = file;
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
      next: () => Swal.fire('Éxito', 'Archivo AIU cargado correctamente', 'success'),
      error: () => Swal.fire('Error', 'Error al cargar el archivo AIU', 'error'),
    });
  }
  uploadIVAExcel() {
    if (!this.ivaFile) {
      Swal.fire('Advertencia', 'Debe seleccionar un archivo IVA', 'warning');
      return;
    }
    this.contractsService.uploadExcelIVA(this.ivaFile).subscribe({
      next: () => Swal.fire('Éxito', 'Archivo IVA cargado correctamente', 'success'),
      error: () => Swal.fire('Error', 'Error al cargar el archivo IVA', 'error'),
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
        if (this.selectedType === 'Contrato') {
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
    if (this.selectedType === 'Contrato') this.onSubmitContrato();
    else if (this.selectedType === 'Asistencia') this.onSubmitVisita();
    else if (this.selectedType === 'Actas') this.onSubmitActa();
  }
}
