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
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';

import { ContractsService } from '../../../contracts/shared/service/contracts.service';
import { RemissionResponse } from '../../../contracts/shared/interfaces/Response.interface';
import { UpdateRemissionRequest } from '../../../contracts/shared/interfaces/Request.interface';
import { CatalogService, ConstructoraDto, ProyectoDto } from '../../../../shared/services/catalog.service';

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
  empresasSoloSeleccion: EmpresaOption[] = [];
  private empresaMap = new Map<string, string>();

  private normalizeText(value: unknown): string {
    return String(value ?? '')
      .trim()
      .toLowerCase();
  }

  // Catálogo constructoras/proyectos (filtros)
  constructorasOptions: { label: string; value: string }[] = [];
  proyectosOptions: { label: string; value: string }[] = [];
  selectedConstructoraId: string | null = null;
  selectedProyectoId: string | null = null;

  // Catálogo constructoras/proyectos (edición)
  constructorasEditOptions: { label: string; value: string }[] = [];
  proyectosEditOptions: { label: string; value: string }[] = [];
  selectedEditConstructoraId: string | null = null;
  selectedEditProyectoId: string | null = null;

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

  editableHeader: RemissionResponse | null = null;
  editableItems: RemissionResponse[] = [];

  constructor(
    private contractsService: ContractsService,
    private catalogService: CatalogService
  ) {}

  ngOnInit(): void {
    this.loadEmpresas();
    this.loadConstructorasCatalog();
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

        this.empresasSoloSeleccion = this.empresas.filter(
          (e) => e.value !== null
        );

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

  private loadConstructorasCatalog(): void {
    this.catalogService.getConstructoras().subscribe({
      next: (list: ConstructoraDto[]) => {
        const mapped = list.map((c) => ({
          label: c.nombre,
          value: String(c.id),
        }));
        this.constructorasOptions = mapped;
        this.constructorasEditOptions = mapped;

        // Si el usuario ya abrió el modal, re-sincronizamos con los valores precargados.
        if (this.detailVisible && this.editableHeader) {
          this.syncEditConstructorayProyecto();
        }
      },
      error: () => {
        this.constructorasOptions = [];
        this.constructorasEditOptions = [];
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

  // Filtro: cuando cambia constructora, actualizamos proyectos y el nombre usado en búsqueda
  onConstructoraFilterChange(id: string | null): void {
    this.selectedConstructoraId = id;
    this.selectedProyectoId = null;
    this.proyectosOptions = [];
    this.constructora = '';
    this.proyecto = '';

    if (!id) {
      return;
    }

    const cons = this.constructorasOptions.find((c) => c.value === id);
    this.constructora = cons?.label ?? '';

    this.catalogService.getProyectosByConstructora(id).subscribe({
      next: (list: ProyectoDto[]) => {
        this.proyectosOptions = list.map((p) => ({
          label: p.nombre,
          value: String(p.id),
        }));
      },
      error: () => {
        this.proyectosOptions = [];
      },
    });
  }

  onProyectoFilterChange(id: string | null): void {
    this.selectedProyectoId = id;
    this.proyecto =
      this.proyectosOptions.find((p) => p.value === id)?.label ?? '';
  }

  // Edición: sincronizar constructora/proyecto cuando abrimos el modal
  private syncEditConstructorayProyecto(): void {
    if (!this.editableHeader) {
      this.selectedEditConstructoraId = null;
      this.selectedEditProyectoId = null;
      this.proyectosEditOptions = [];
      return;
    }

    const currentConstructora = this.normalizeText(
      (this.editableHeader as any).constructora
    );

    const cons = this.constructorasEditOptions.find(
      (c) => this.normalizeText(c.label) === currentConstructora
    );
    this.selectedEditConstructoraId = cons?.value ?? null;

    if (!this.selectedEditConstructoraId) {
      this.proyectosEditOptions = [];
      this.selectedEditProyectoId = null;
      return;
    }

    this.onConstructoraEditChange(this.selectedEditConstructoraId, false);
  }

  onConstructoraEditChange(id: string | null, resetProyecto: boolean = true): void {
    this.selectedEditConstructoraId = id;
    this.selectedEditProyectoId = null;
    this.proyectosEditOptions = [];

    if (!this.editableHeader) return;

    if (!id) {
      this.editableHeader.constructora = '';
      this.editableHeader.proyecto = '';
      return;
    }

    const cons = this.constructorasEditOptions.find((c) => c.value === id);
    this.editableHeader.constructora = cons?.label ?? '';

    this.catalogService.getProyectosByConstructora(id).subscribe({
      next: (list: ProyectoDto[]) => {
        this.proyectosEditOptions = list.map((p) => ({
          label: p.nombre,
          value: String(p.id),
        }));

        if (!resetProyecto) {
          const currentProyecto = this.normalizeText(
            (this.editableHeader as any).proyecto
          );
          const match = this.proyectosEditOptions.find(
            (p) => this.normalizeText(p.label) === currentProyecto
          );
          if (match) {
            this.selectedEditProyectoId = match.value;
          }
        }
      },
      error: () => {
        this.proyectosEditOptions = [];
      },
    });
  }

  onProyectoEditChange(id: string | null): void {
    this.selectedEditProyectoId = id;
    if (!this.editableHeader) return;
    this.editableHeader.proyecto =
      this.proyectosEditOptions.find((p) => p.value === id)?.label ?? '';
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
    this.selectedConstructoraId = null;
    this.selectedProyectoId = null;
    this.proyectosOptions = [];
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
    // Copias editables para no tocar directamente los resultados
    this.editableHeader = { ...this.selectedHeader };
    this.editableItems = this.selectedItems.map((i) => ({ ...i }));
    // Preseleccionar constructora/proyecto en edición
    this.syncEditConstructorayProyecto();
    this.detailVisible = true;
  }

  onCerrarDetalle(): void {
    this.detailVisible = false;
    this.selectedHeader = null;
    this.selectedItems = [];
    this.editableHeader = null;
    this.editableItems = [];
    this.selectedEditConstructoraId = null;
    this.selectedEditProyectoId = null;
  }

  actualizarRemision(): void {
    if (!this.editableHeader) return;

    const numerodoc =
      (this.editableHeader as any).numerodoc ||
      this.editableHeader.remision_material ||
      this.editableHeader.numero_contrato ||
      this.editableHeader.contrato ||
      '';
    if (!numerodoc) return;

    // 1) Actualizar cabecera (una sola llamada)
    const headerPayload: UpdateRemissionRequest = {
      numerodoc,
      actualizar_cabecera: true,
      actualizar_detalle: false,
      tipo_doc_rem: this.editableHeader.tipo_doc_rem ?? null,
      numero_contrato: this.editableHeader.numero_contrato ?? this.editableHeader.contrato ?? null,
      remision_material: this.editableHeader.remision_material ?? null,
      fecha_remision: this.editableHeader.fecha_remision ?? null,
      cliente: this.editableHeader.constructora ?? null,
      proyecto: this.editableHeader.proyecto ?? null,
      despacho: this.editableHeader.despacho ?? null,
      transporto: this.editableHeader.transporto ?? null,
      empresa_asociada: this.editableHeader.empresa_asociada ?? null,
      direccion_empresa: this.editableHeader.direccion_empresa ?? null,
      orden_de_compra: this.editableHeader.orden_de_compra ?? null,
    } as UpdateRemissionRequest;

    this.contractsService.updateRemission(headerPayload).subscribe({
      next: () => {
        const items = this.editableItems || [];

        // Si no hay items, confirmamos solo actualización de cabecera
        if (!items.length) {
          Swal.fire('Actualizado', 'La remisión se actualizó correctamente.', 'success');
          return;
        }

        const detailRequests = items.map((it) => {
          const detailPayload: UpdateRemissionRequest = {
            numerodoc,
            actualizar_cabecera: false,
            actualizar_detalle: true,
            item: it.item ?? null,
            empresa: it.empresa ?? null,
            cantidad: it.cantidad ?? null,
            um: it.um ?? null,
            detalle: it.detalle ?? null,
            observaciones: it.observaciones ?? null,
          };
          return this.contractsService.updateRemission(detailPayload);
        });

        forkJoin(detailRequests).subscribe({
          next: () => {
            Swal.fire('Actualizado', 'La remisión se actualizó correctamente.', 'success');
          },
          error: () => {
            Swal.fire(
              'Error',
              'Ocurrió un error al actualizar el detalle de la remisión.',
              'error'
            );
          },
        });
      },
      error: () => {
        Swal.fire(
          'Error',
          'Ocurrió un error al actualizar la cabecera de la remisión.',
          'error'
        );
      },
    });
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

