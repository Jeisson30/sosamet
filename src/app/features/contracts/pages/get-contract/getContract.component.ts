import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import jsPDF from 'jspdf';
import Swal from 'sweetalert2';

// Service e interfaces
import { ContractsService } from '../../shared/service/contracts.service';
import { ContractDetailResponse } from '../../shared/interfaces/Response.interface';

@Component({
  selector: 'app-contract-consult',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, InputTextModule, ButtonModule, CalendarModule],
  templateUrl: 'getContract.component.html',
  styleUrls: ['getContract.component.scss'],
})
export class ContractConsultComponent {
  form: FormGroup;
  numeroDocumento: string = '';
  detalleContrato: ContractDetailResponse | null = null;

  labelsMap: { [key: string]: string } = {
    Cedula_contratista: 'Cédula del Contratista',
    ciudad_contratista: 'Ciudad del Contratista',
    ciudad_empresa: 'Ciudad de la Empresa',
    contratista: 'Nombre del Contratista',
    descripcion: 'Descripción del Contrato',
    direccion: 'Dirección de la Empresa',
    direccion_contratista: 'Dirección del Contratista',
    email_contratista: 'Email del Contratista',
    empresa: 'Nombre de la Empresa',
    estado: 'Estado del Contrato',
    fecha_fin: 'Fecha de Finalización',
    fecha_inicio: 'Fecha de Inicio',
    forma_pago: 'Forma de Pago',
    nit_contratista: 'NIT del Contratista',
    nit_empresa: 'NIT de la Empresa',
    numero_contrato: 'Número del Contrato',
    numerodoc: 'Número del Documento',
    observaciones: 'Observaciones',
    proyecto: 'Proyecto',
    referencia: 'Referencia',
    telefono_contratista: 'Teléfono del Contratista',
    Telefono_empresa: 'Teléfono de la Empresa',
    tipo_contrato: 'Tipo de Contrato',
    tipo_doc: 'Tipo de Documento'
  };

  constructor(private fb: FormBuilder, private contractsService: ContractsService) {
    this.form = this.fb.group({});
  }

  onSearch(): void {
    if (!this.numeroDocumento) {
      Swal.fire('Atención', 'Debe ingresar un número de documento', 'warning');
      return;
    }

    this.contractsService.getContractDetail('Contrato', this.numeroDocumento).subscribe({
      next: (res) => {
        this.detalleContrato = res.data;
        this.buildForm(res.data);
      },
      error: () => {
        Swal.fire('Sin resultados', 'No se encontró el documento', 'info');
        this.detalleContrato = null;
      },
    });
  }

  onClear(): void {
    this.numeroDocumento = '';
    this.detalleContrato = null;
    this.form.reset();
    this.form = this.fb.group({});
  }

  buildForm(data: ContractDetailResponse): void {
    const group: { [key: string]: any } = {};
    Object.keys(data).forEach((campo) => {
      group[campo] = [{ value: data[campo], disabled: true }];
    });
    this.form = this.fb.group(group);
  }

  onExportPDF(): void {
    if (!this.detalleContrato) return;
  
    const data = this.detalleContrato;
    const fecha = new Date();
    const fechaStr =
      fecha.toLocaleDateString('es-CO') +
      ' ' +
      fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 10;
  
    // Info empresa
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Empresa', 10, y);
    doc.text(String(data['empresa']), 35, y);
    y += 6;
  
    doc.text('NIT', 10, y);
    doc.text(String(data['nit_empresa']), 35, y);
    y += 6;
  
    doc.text('Dirección', 10, y);
    doc.text(String(data['direccion']), 35, y);
    y += 6;
  
    doc.text('Teléfono', 10, y);
    doc.text(String(data['Telefono_empresa']), 35, y);
    y += 6;
  
    doc.text('Ciudad', 10, y);
    doc.text(String(data['ciudad_empresa']), 35, y);
  
    // Fecha y título
    doc.text(`Fecha y hora de exportación: ${fechaStr}`, 10, y + 10);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`CONTRATO NO. ${String(data['numero_contrato'])}`, 120, y + 10);
  
    // ===== CAJA CONTRATISTA =====
    y += 20;
    const boxHeight = 28;
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.rect(10, y, 190, boxHeight);
  
    doc.setFillColor(255, 255, 255);
    doc.rect(15, y - 4, 25, 5, 'F');
  
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Contratista', 15, y - 1);
  
    doc.setFont('helvetica', 'normal');
    doc.text('Nombre:', 15, y + 6);
    doc.text(String(data['contratista']), 45, y + 6);
  
    doc.text('Cédula/NIT:', 120, y + 6);
    doc.text(String(data['Cedula_contratista']), 160, y + 6);
  
    doc.text('Dirección:', 15, y + 12);
    doc.text(String(data['direccion_contratista']), 45, y + 12);
  
    doc.text('Teléfono:', 120, y + 12);
    doc.text(String(data['telefono_contratista']), 160, y + 12);
  
    doc.text('Email:', 15, y + 18);
    doc.text(String(data['email_contratista']), 45, y + 18);
  
    doc.text('Ciudad:', 120, y + 18);
    doc.text(String(data['ciudad_contratista']), 160, y + 18);
  
    // ===== CAJA DETALLES CONTRATO =====
    y += boxHeight + 7;
    const box2Height = 60;
    doc.rect(10, y, 190, box2Height);
  
    doc.setFillColor(255, 255, 255);
    doc.rect(15, y - 4, 60, 5, 'F');
  
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Contrato Detallado Por Grupos', 15, y - 1);
  
    doc.setFont('helvetica', 'normal');
    doc.text('Proyecto:', 15, y + 10);
    doc.text(String(data['proyecto']), 45, y + 10);
  
    doc.text('Valor Contrato:', 120, y + 10);
    doc.text('__________', 160, y + 10);
  
    doc.text('Tipo Contrato:', 15, y + 16);
    doc.text(String(data['tipo_contrato']), 45, y + 16);
  
    doc.text('Otrosi del Contrato:', 120, y + 16);
  
    doc.text('Estado:', 15, y + 22);
    doc.text(String(data['estado']), 45, y + 22);
  
    doc.text('Fecha Terminación:', 120, y + 22);
    doc.text(
      data['fecha_fin'] ? new Date(data['fecha_fin']).toLocaleDateString('es-CO') : '',
      160,
      y + 22
    );
  
    doc.text('Fecha Inicio:', 15, y + 28);
    doc.text(
      data['fecha_inicio']
        ? new Date(data['fecha_inicio']).toLocaleDateString('es-CO')
        : '',
      45,
      y + 28
    );
  
    doc.text('Referencia:', 120, y + 28);
    doc.text(String(data['referencia']), 160, y + 28);
  
    doc.text('Forma de Pago:', 15, y + 34);
    doc.text(String(data['forma_pago']), 45, y + 34);
  
    doc.text('Descripción:', 15, y + 44);
    doc.text(String(data['descripcion']), 45, y + 44);
  
    doc.text('Observaciones:', 15, y + 50);
    doc.text(String(data['observaciones']), 45, y + 50);
  
    const fileName = `Contrato_${data['empresa']}_${data['numero_contrato']}.pdf`;
    doc.save(fileName);
  }
  
  
}
