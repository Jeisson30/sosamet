import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { CalendarModule } from 'primeng/calendar';

// Service & Interfaces
import { ContractsService } from '../../shared/service/contracts.service';
import {
  ContractTypeResponse,
  ContractFieldResponse,
} from '../../shared/interfaces/Response.interface';

// SweetAlert2
import Swal from 'sweetalert2';
import { InsertContractRequest } from '../../shared/interfaces/Request.interface';
import { Button } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';

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
    //Button,
    //FloatLabel,
  ],
  templateUrl: './selectDocument.component.html',
  styleUrls: ['./selectDocument.component.scss'],
})
export class ContractSelectTypeComponent implements OnInit {
  onFileChange($event: Event, arg1: string) {
    throw new Error('Method not implemented.');
  }
  contractTypes: ContractTypeResponse[] = [];
  selectedType: string = '';
  fields: ContractFieldResponse[] = [];
  form: FormGroup = new FormGroup({});
  aiuFile: File | null = null;
  ivaFile: File | null = null;

  constructor(
    private contractsService: ContractsService,
    private fb: FormBuilder
  ) {}

  // Lista de opciones para el campo tipo_contrato
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
    { label: 'No', value: 'No' }
  ];

  // Objeto que almacena los valores del formulario
  formData: { [key: string]: any } = {};

  // Campos dinámicos que vienen de la base de datos
  contractFields: any[] = [];

  ngOnInit(): void {
    this.loadContractTypes();
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
        // TODO: 1. Filtrar campos activos
        const camposActivos = fields.filter(
          (field) => field.estadocampo === '1'
        );

        // TODO: 2. Reordenar campos
        const numeroContratoPrimero = [
          ...camposActivos.filter(
            (f) => f.nombre_campo_doc === 'numero_contrato'
          ),
          ...camposActivos.filter(
            (f) => f.nombre_campo_doc !== 'numero_contrato'
          ),
        ];

        // TODO: 3. Asignar y construir formulario
        this.fields = numeroContratoPrimero;
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
      next: (res) => {
        Swal.fire('Éxito', 'Archivo AIU cargado correctamente', 'success');
      },
      error: (err) => {
        console.error(err);
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
      next: (res) => {
        Swal.fire('Éxito', 'Archivo IVA cargado correctamente', 'success');
      },
      error: (err) => {
        console.error(err);
        Swal.fire('Error', 'Error al cargar el archivo IVA', 'error');
      },
    });
  }

  onSubmit(): void {
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

          this.uploadAIUExcel();
          this.uploadIVAExcel();

          this.form.reset();
          this.fields = [];
          this.selectedType = '';
        },
        error: (err) => {
          console.error('Error al insertar documento', err);
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
