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

//Service
import { ContractsService } from '../../shared/service/contracts.service';

//Interface
import {
  ContractTypeResponse,
  ContractFieldResponse,
} from '../../shared/interfaces/Response.interface';

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
        this.fields = fields;
        this.buildForm(fields);
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

  onFileChange(event: Event, controlName: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.form.get(controlName)?.setValue(file);
  }

  onSubmit(): void {
    if (this.form.valid) {
      console.log('Formulario enviado:', this.form.value);
    } else {
      console.warn('Formulario inválido');
    }
  }
}
