import { Component, OnInit } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';

// PrimeNG
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { FloatLabelModule } from 'primeng/floatlabel';

//Library
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';

@Component({
  templateUrl: './contracts.component.html',
  styleUrls: ['./contracts.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DropdownModule,
    CalendarModule,
    ButtonModule,
    InputTextModule,
    CardModule,
    FloatLabelModule,
  ],
})
export class ContractsComponent implements OnInit {
  contractForm!: FormGroup;

  companies = [
    { name: 'Hierros', code: 'A' },
    { name: 'Sosamet SAS', code: 'B' },
    { name: 'Compartido', code: 'C' },
  ];

  contractTypes = [
    { label: 'Soporte', value: 'supply' },
    { label: 'Instalación', value: 'installation' },
    { label: 'Completo', value: 'complete' },
  ];

  units = [
    { label: 'ML', value: 'ml' },
    { label: 'M2', value: 'm2' },
    { label: 'UND', value: 'und' },
    { label: 'GBL', value: 'gbl' },
    { label: 'KG', value: 'kg' },
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.contractForm = this.fb.group({
      // Datos de empresa
      empresa: ['', Validators.required],
      nitEmpresa: [''],
      direccionEmpresa: [''],
      telefonoEmpresa: [null, Validators.pattern(/^[0-9]*$/)],
      ciudadEmpresa: [''],
      contrato: [''],

      // Contratista (grupo anidado)
      contratista: this.fb.group({
        contratistaId: [null, Validators.required], // para el select de companies
        nitContratista: [''],
        direccionContratista: [''],
        telefonoContratista: [null, Validators.pattern(/^[0-9]*$/)],
        emailContratista: ['', Validators.email],
        ciudadContratista: [''],
      }),

      // Contrato detallado por grupos
      proyecto: ['', Validators.required],
      tipoContrato: ['', Validators.required],
      estado: ['', Validators.required],
      fechaInicio: [null, Validators.required],
      fechaFin: [null, Validators.required],
      formaPago: [''],
      referencia: [''],
      descripcion: [''],
      observaciones: [''],
    });
  }

  createItem(): FormGroup {
    return this.fb.group({
      internalCode: ['', Validators.required],
      description: ['', Validators.required],
      unit: [null, Validators.required],
    });
  }

  get items(): FormArray {
    return this.contractForm.get('items') as FormArray;
  }

  addItem(): void {
    this.items.push(this.createItem());
  }

  removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  submitForm(): void {
    if (this.contractForm.invalid) {
      this.contractForm.markAllAsTouched();
      Swal.fire({
        icon: 'warning',
        title: 'Formulario incompleto',
        text: 'Por favor, complete todos los campos para generar el contrato',
      });
      return;
    }

    const data = this.contractForm.value;
    const contratista = data.contratista;
    const contratistaCode =
      contratista.contratistaId?.code || contratista.contratistaId;

    const fechaImpresion = new Date();
    const fechaHora =
      fechaImpresion.toLocaleDateString('es-CO') +
      ' ' +
      fechaImpresion.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
      });

    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Empresa', 10, y);
    doc.text(data.empresa, 35, y);
    y += 6;

    doc.text('NIT', 10, y);
    doc.text(String(data.nitEmpresa), 35, y);
    y += 6;

    doc.text('Dirección', 10, y);
    doc.text(String(data.direccionEmpresa), 35, y);
    y += 6;

    doc.text('Teléfono', 10, y);
    doc.text(String(data.telefonoEmpresa), 35, y);
    y += 6;

    doc.text('Ciudad', 10, y);
    doc.text(String(data.ciudadEmpresa), 35, y);

    doc.text(`Fecha y hora de impresión: ${fechaHora}`, 10, y + 10);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`CONTRATO NO. ${String(data.contrato)}`, 120, y + 10);

    // ===============================
    // CAJA: CONTRATISTA TÍTULO
    // ===============================
    y += 20;
    const boxHeight = 28;
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.rect(10, y, 190, boxHeight);

    // Efecto
    doc.setFillColor(255, 255, 255);
    doc.rect(15, y - 4, 25, 5, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Contratista', 15, y - 1);

    // Contenido
    doc.setFont('helvetica', 'normal');
    doc.text('Contratista:', 15, y + 6);
    doc.text(this.getCompanyNameByCode(contratistaCode), 45, y + 6);

    doc.text('NIT/CC:', 120, y + 6);
    doc.text(String(contratista.nitContratista), 140, y + 6);

    doc.text('Dirección:', 15, y + 12);
    doc.text(String(contratista.direccionContratista), 45, y + 12);

    doc.text('Teléfono:', 120, y + 12);
    doc.text(String(contratista.telefonoContratista), 140, y + 12);

    doc.text('Email:', 15, y + 18);
    doc.text(String(contratista.emailContratista), 45, y + 18);

    doc.text('Ciudad:', 120, y + 18);
    doc.text(String(contratista.ciudadContratista), 140, y + 18);

    // ===============================
    // CAJA: CONTRATO DETALLADO CON TÍTULO
    // ===============================
    y += boxHeight + 7;
    const box2Height = 60;
    doc.rect(10, y, 190, box2Height);

    // Fondo blanco del título
    doc.setFillColor(255, 255, 255);
    doc.rect(15, y - 4, 60, 5, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Contrato Detallado Por Grupos', 15, y - 1);

    doc.setFont('helvetica', 'normal');
    doc.text('Proyecto:', 15, y + 10);
    doc.text(String(data.proyecto), 45, y + 10);

    doc.text('Valor Contrato:', 120, y + 10);
    doc.text('__________', 160, y + 10);

    doc.text('Tipo Contrato:', 15, y + 16);
    doc.text(String(data.tipoContrato), 45, y + 16);

    doc.text('Otrosi del Contrato:', 120, y + 16);

    doc.text('Estado:', 15, y + 22);
    doc.text(String(data.estado), 45, y + 22);

    doc.text('Fecha Terminación:', 120, y + 22);
    doc.text(
      data.fechaFin ? new Date(data.fechaFin).toLocaleDateString('es-CO') : '',
      160,
      y + 22
    );

    doc.text('Fecha Inicio:', 15, y + 28);
    doc.text(
      data.fechaInicio
        ? new Date(data.fechaInicio).toLocaleDateString('es-CO')
        : '',
      45,
      y + 28
    );

    doc.text('Referencia:', 120, y + 28);
    doc.text(String(data.referencia), 160, y + 28);

    doc.text('Forma de Pago:', 15, y + 34);
    doc.text(String(data.formaPago), 45, y + 34);

    // Parte final
    doc.text('Descripción:', 15, y + 44);
    doc.text(String(data.descripcion), 45, y + 44);

    doc.text('Observaciones:', 15, y + 50);
    doc.text(String(data.observaciones), 45, y + 50);

    doc.save(`Contrato_${data.empresa}_${data.contrato}.pdf`);
  }

  getCompanyNameByCode(code: any): string {
    const realCode = typeof code === 'object' ? code.code : code;
    const found = this.companies.find((c) => c.code === realCode);
    return found ? found.name : realCode;
  }
}
