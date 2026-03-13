import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { ContractsService } from '../../../contracts/shared/service/contracts.service';
import { RemissionResponse } from '../../../contracts/shared/interfaces/Response.interface';

interface EmpresaOption {
  label: string;
  value: string | null;
}

@Component({
  selector: 'app-remissions-consult',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    DropdownModule,
    CalendarModule,
    TableModule,
    ButtonModule,
    DialogModule,
  ],
  templateUrl: './remissions-consult.component.html',
  styleUrls: ['./remissions-consult.component.scss'],
})
export class RemissionsConsultComponent implements OnInit {
  buscar: string = '';
  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;
  empresaAsociada: string | null = null;
  constructora: string = '';
  proyecto: string = '';

  empresas: EmpresaOption[] = [];
  private empresaMap = new Map<string, string>();

  /** Todas las filas del SP (una por ítem). */
  private rawResults: RemissionResponse[] = [];
  /** Una fila por remisión para la tabla. */
  results: RemissionResponse[] = [];
  loading: boolean = false;

  /** Paginación */
  rowsPerPage = 10;
  rowsPerPageOptions = [10, 25, 50, 100];

  /** Modal detalle */
  detailVisible = false;
  selectedHeader: RemissionResponse | null = null;
  selectedItems: RemissionResponse[] = [];

  constructor(private contractsService: ContractsService) {}

  ngOnInit(): void {
    this.loadEmpresas();
  }

  private loadEmpresas(): void {
    this.contractsService.getCompanies().subscribe({
      next: (companies) => {
        this.empresas = [
          { label: 'Todas', value: null },
          ...companies.map((c: any) => ({
            label: c.nombre_empresa,
            value: String(c.id),
          })),
        ];

        // Mapa para mostrar nombre legible por id/código
        this.empresaMap.clear();
        companies.forEach((c: any) => {
          this.empresaMap.set(String(c.id), c.nombre_empresa);
        });

        // Reglas explícitas para ids conocidos
        this.empresaMap.set('1', 'SOSAMET SAS');
        this.empresaMap.set('2', 'HIERROS Y SERVICIOS SAS');
      },
      error: () => {
        this.empresas = [{ label: 'Todas', value: null }];
      },
    });
  }

  private formatDate(date: Date | null): string | null {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private remissionKey(row: RemissionResponse): string {
    return row.remision_material || row.numero_contrato || row.contrato || '';
  }

  private groupByRemission(data: RemissionResponse[]): RemissionResponse[] {
    const map = new Map<string, RemissionResponse>();
    data.forEach((row) => {
      const key = this.remissionKey(row);
      if (key && !map.has(key)) {
        map.set(key, row);
      }
    });
    return Array.from(map.values());
  }

  empresaDisplay(value: string | null): string {
    if (!value) return '';
    const key = String(value).trim();
    if (this.empresaMap.has(key)) {
      return this.empresaMap.get(key) || '';
    }
    // Fallback por si backend ya envía nombre
    if (key === '1') return 'SOSAMET SAS';
    if (key === '2') return 'HIERROS Y SERVICIOS SAS';
    return key;
  }

  onBuscar(): void {
    this.loading = true;

    this.contractsService
      .consultRemissions({
        buscar: this.buscar?.trim() || null,
        fecha_desde: this.formatDate(this.fechaDesde),
        fecha_hasta: this.formatDate(this.fechaHasta),
        empresa_asociada: this.empresaAsociada,
        constructora: this.constructora?.trim() || null,
        proyecto: this.proyecto?.trim() || null,
      })
      .subscribe({
        next: (res) => {
          this.rawResults = res.data || [];
          this.results = this.groupByRemission(this.rawResults);
          this.loading = false;
        },
        error: () => {
          this.rawResults = [];
          this.results = [];
          this.loading = false;
        },
      });
  }

  onLimpiar(): void {
    this.buscar = '';
    this.fechaDesde = null;
    this.fechaHasta = null;
    this.empresaAsociada = null;
    this.constructora = '';
    this.proyecto = '';
    this.rawResults = [];
    this.results = [];
  }

  formatDateForDisplay(value: string | null): string {
    if (!value) return '';
    const d = new Date(value);
    return isNaN(d.getTime())
      ? String(value)
      : d.toLocaleDateString('es-CO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
  }

  onAbrir(row: RemissionResponse): void {
    const key = this.remissionKey(row);
    this.selectedHeader = row;
    this.selectedItems = this.rawResults.filter(
      (item) => this.remissionKey(item) === key
    );
    this.detailVisible = true;
  }

  onCerrarDetalle(): void {
    this.detailVisible = false;
    this.selectedHeader = null;
    this.selectedItems = [];
  }

  descargarPdf(): void {
    const header = this.selectedHeader;
    const items = this.selectedItems;
    if (!header || !items.length) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    let y = 14;

    doc.setFontSize(14);
    doc.text('Remisión', pageW / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const labelStartX = 14;
    const valueStartX = 72;
    const cabecera = [
      ['Remisión', String(header.remision_material || '')],
      ['Fecha remisión', this.formatDateForDisplay(header.fecha_remision)],
      ['Contrato', String(header.numero_contrato || header.contrato || '')],
      ['Constructora', String(header.constructora || '')],
      ['Proyecto', String(header.proyecto || '')],
      ['Empresa asociada', this.empresaDisplay(header.empresa_asociada)],
      ['Orden de compra', String(header.orden_de_compra || '')],
      ['Dirección empresa', String(header.direccion_empresa || '').substring(0, 80)],
    ];
    cabecera.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label + ':', labelStartX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, valueStartX, y);
      y += 6;
    });
    y += 6;

    const tableHeaders = [['Item', 'Cantidad', 'UM', 'Detalle', 'Observaciones']];
    const tableBody = items.map((it) => [
      String(it.item ?? ''),
      String(it.cantidad ?? ''),
      String(it.um ?? ''),
      String(it.detalle ?? '').substring(0, 40),
      String(it.observaciones ?? '').substring(0, 60),
    ]);

    autoTable(doc, {
      head: tableHeaders,
      body: tableBody,
      startY: y,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [70, 130, 180] },
    });

    const fileName = `remision-${(header.remision_material || header.numero_contrato || 'REM').replace(/\s/g, '-')}.pdf`;
    doc.save(fileName);
  }
}

