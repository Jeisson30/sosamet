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
  ],
  templateUrl: './selectDocument.component.html',
  styleUrls: ['./selectDocument.component.scss'],
})
export class ContractSelectTypeComponent implements OnInit {
  contractTypes: ContractTypeResponse[] = [];
  selectedType: string = '';
  fields: ContractFieldResponse[] = [];
  form: FormGroup = new FormGroup({});

  constructor(
    private contractsService: ContractsService,
    private fb: FormBuilder
  ) {}

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
        this.fields = fields.filter((field) => field.estadocampo === '1');
        this.buildForm(fields);
      },
      error: (err) => console.error('Error al cargar campos', err),
    });
  }

  buildForm(fields: ContractFieldResponse[]) {
    const group: { [key: string]: any } = {};
    fields.forEach((field) => {
      group[field.nombre_campo_doc] = ['', Validators.required];
    });
    this.form = this.fb.group(group);
  }

  onFileChange(event: Event, controlName: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.form.get(controlName)?.setValue(file);
  }

  onSubmit(): void {
    if (this.form.valid && this.selectedType) {
      const formValue = this.form.value;
  
      const campos = Object.entries(formValue).map(([nombre, valor]) => ({
        nombre,
        valor: valor instanceof File ? valor.name : String(valor),
      }));
  
      const payload: InsertContractRequest = {
        tipo_doc: this.selectedType,
        numerodoc: formValue.numero_contrato || `CT-${new Date().toISOString().slice(0, 10)}`,
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
        title: 'Formulario incompleto',
        text: 'Por favor, complete todos los campos requeridos.',
      });
    }
  }
}
