import { Component } from '@angular/core';
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

import { ContractsService } from '../../shared/service/contracts.service';
import { PurchaseOrderResponse } from '../../shared/interfaces/Response.interface';

interface EstadoOption {
  label: string;
  value: string | null;
}

@Component({
  selector: 'app-purchase-orders-consult',
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
  templateUrl: './purchase-orders-consult.component.html',
  styleUrls: ['./purchase-orders-consult.component.scss'],
})
export class PurchaseOrdersConsultComponent {
  buscar: string = '';
  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;
  estado: string | null = null;
  proyecto: string = '';

  estados: EstadoOption[] = [
    { label: 'Todos', value: null },
    { label: 'En Revisión', value: 'En Revisión' },
    { label: 'Procesado', value: 'Procesado' },
    { label: 'Aprobado', value: 'Aprobado' },
  ];

  /** Todas las filas del SP (una por ítem). */
  private rawResults: PurchaseOrderResponse[] = [];
  /** Una fila por orden de compra para la tabla. */
  results: PurchaseOrderResponse[] = [];
  loading: boolean = false;

  /** Paginación */
  rowsPerPage = 10;
  rowsPerPageOptions = [10, 25, 50, 100];

  /** Modal detalle */
  detailVisible = false;
  selectedOrderHeader: PurchaseOrderResponse | null = null;
  selectedOrderItems: PurchaseOrderResponse[] = [];

  constructor(private contractsService: ContractsService) {}

  private formatDate(date: Date | null): string | null {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private orderKey(row: PurchaseOrderResponse): string {
    return row.numdoc || row.numero_contrato || row.contrato || '';
  }

  private groupByPurchaseOrder(data: PurchaseOrderResponse[]): PurchaseOrderResponse[] {
    const map = new Map<string, PurchaseOrderResponse>();
    data.forEach((row) => {
      const key = this.orderKey(row);
      if (key && !map.has(key)) map.set(key, row);
    });
    return Array.from(map.values());
  }

  onBuscar(): void {
    this.loading = true;
    this.contractsService
      .consultPurchaseOrders({
        buscar: this.buscar?.trim() || null,
        fecha_desde: this.formatDate(this.fechaDesde),
        fecha_hasta: this.formatDate(this.fechaHasta),
        estado: this.estado,
        proyecto: this.proyecto?.trim() || null,
      })
      .subscribe({
        next: (res) => {
          this.rawResults = res.data || [];
          this.results = this.groupByPurchaseOrder(this.rawResults);
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
    this.estado = null;
    this.proyecto = '';
    this.rawResults = [];
    this.results = [];
  }

  onAbrir(row: PurchaseOrderResponse): void {
    const key = this.orderKey(row);
    this.selectedOrderHeader = row;
    this.selectedOrderItems = this.rawResults.filter((item) => this.orderKey(item) === key);
    this.detailVisible = true;
  }

  onCerrarDetalle(): void {
    this.detailVisible = false;
    this.selectedOrderHeader = null;
    this.selectedOrderItems = [];
  }

  formatDateForDisplay(value: string | null): string {
    if (!value) return '';
    const d = new Date(value);
    return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  descargarPdf(): void {
    const header = this.selectedOrderHeader;
    const items = this.selectedOrderItems;
    if (!header || !items.length) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    let y = 14;

    doc.setFontSize(14);
    doc.text('Orden de Compra', pageW / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const labelStartX = 14;
    const valueStartX = 72;
    const cabecera = [
      ['Consecutivo / Nº documento', String(header.numdoc || '')],
      ['Nº contrato', String(header.numero_contrato || header.contrato || '')],
      ['Fecha creación', this.formatDateForDisplay(header.fecha_creacion)],
      ['Proyecto', String(header.proyecto || '')],
      ['Constructora', String(header.constructora || '')],
      ['Proveedor', String(header.proveedor || '')],
      ['Estado', String(header.estado || '')],
      ['Fecha terminación', this.formatDateForDisplay(header.fecha_terminacion)],
      ['Nº plano', String(header.numero_plano || '')],
      ['Observaciones', String(header.observaciones || '').substring(0, 80)],
    ];
    cabecera.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label + ':', labelStartX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, valueStartX, y);
      y += 6;
    });
    y += 6;

    const tableHeaders = [['Item', 'Elemento', 'Descripción', 'Base', 'Altura', 'Otros', 'UM', 'Cant.', 'Total', 'Proveedor']];
    const tableBody = items.map((it) => [
      String(it.item ?? ''),
      String(it.elemento ?? '').substring(0, 18),
      String(it.descripcion ?? '').substring(0, 22),
      String(it.base ?? ''),
      String(it.altura ?? ''),
      String(it.otros ?? ''),
      String(it.um ?? ''),
      String(it.cantidad ?? ''),
      String(it.total ?? ''),
      String(it.proveedor ?? '').substring(0, 10),
    ]);

    autoTable(doc, {
      head: tableHeaders,
      body: tableBody,
      startY: y,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [70, 130, 180] },
    });

    const fileName = `orden-compra-${(header.numdoc || header.numero_contrato || 'OC').replace(/\s/g, '-')}.pdf`;
    doc.save(fileName);
  }
}

