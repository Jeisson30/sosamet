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
  showPreview: boolean = false;

  constructor(
    private contractsService: ContractsService,
    private fb: FormBuilder
  ) {}

  contractTypeOptions = [
    { label: 'Suministro', value: 'Suministro' },
    { label: 'Instalación', value: 'Instalación' },
    { label: 'Suministro e instalación', value: 'Suministro e instalación' },
  ];

  statusOptions = [
    { label: 'Activo', value: 'Activo' },
    { label: 'Finalizado', value: 'Finalizado' },
  ];

  yesNoOptions = [
    { label: 'Sí', value: 'Si' },
    { label: 'No', value: 'No' },
  ];

  ngOnInit(): void {
    this.loadContractTypes();
  }

  onPreview(): void {
    if (this.form.valid) {
      this.showPreview = true;
    } else {
      Swal.fire('Atención', 'Debe llenar al menos algunos campos para previsualizar.', 'warning');
    }
  }
  
  closePreview(): void {
    this.showPreview = false;
  }

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

  onTypeChange(): void {
    if (!this.selectedType) return;

    this.contractsService.getTypeFields(this.selectedType).subscribe({
      next: (fields) => {
        const camposActivos = fields.filter(
          (field) => field.estadocampo === '1'
        );

        // Definimos el orden manual
        const orden = [
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
          'saldo_contrato'
        ];

        // Reordenamos primero los que están en `orden`
        const camposOrdenados = [
          ...orden.flatMap((key) =>
            camposActivos.filter((f) => f.nombre_campo_doc === key)
          ),
          // luego todos los demás
          ...camposActivos.filter((f) => !orden.includes(f.nombre_campo_doc)),
        ];

        this.fields = camposOrdenados;

        this.buildForm(this.fields);
      },
      error: (err) => console.error('Error al cargar campos', err),
    });
  }

  buildForm(fields: ContractFieldResponse[]) {
    const group: { [key: string]: any } = {};
    fields.forEach((field) => {
      group[field.nombre_campo_doc] = [''];
    });
    this.form = this.fb.group(group);
  }

  onFileChange(event: Event, fieldName: string) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.form.patchValue({ [fieldName]: input.files[0] });
    }
  }

  onAIUFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.aiuFile = file;
    }
  }

  onIVAFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.ivaFile = file;
    }
  }

  uploadAIUExcel() {
    if (!this.aiuFile) {
      Swal.fire('Advertencia', 'Debe seleccionar un archivo AIU', 'warning');
      return;
    }

    this.contractsService.uploadExcelAIU(this.aiuFile).subscribe({
      next: () => {
        Swal.fire('Éxito', 'Archivo AIU cargado correctamente', 'success');
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
      },
      error: () => {
        Swal.fire('Error', 'Error al cargar el archivo IVA', 'error');
      },
    });
  }

  onSubmit(): void {
    // 🔥 Validación de archivos: debe existir AIU o IVA
    if (!this.aiuFile && !this.ivaFile) {
      Swal.fire({
        icon: 'warning',
        title: 'Archivos requeridos',
        text: 'Debe adjuntar al menos un archivo AIU o IVA antes de guardar.',
      });
      return; // detenemos el flujo
    }
  
    if (this.selectedType) {
      const formValue = this.form.value;
  
      const campos = Object.entries(formValue).map(([nombre, valor]) => ({
        nombre,
        valor: valor instanceof File ? valor.name : String(valor),
      }));
  
      const payload: InsertContractRequest = {
        tipo_doc: this.selectedType,
        numerodoc:
          formValue.numero_contrato ||
          `CT-${new Date().toISOString().slice(0, 10)}`,
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
  
          // opcional: subir archivos después de guardar contrato
          if (this.aiuFile) {
            this.uploadAIUExcel();
          }
          if (this.ivaFile) {
            this.uploadIVAExcel();
          }
  
          this.form.reset();
          this.fields = [];
          this.selectedType = '';
          this.aiuFile = null;
          this.ivaFile = null;
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.mensaje || 'No se pudo insertar el documento.',
          });
        },
      });
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Tipo de documento no seleccionado',
        text: 'Por favor, seleccione un tipo de documento.',
      });
    }
  }
  
}
