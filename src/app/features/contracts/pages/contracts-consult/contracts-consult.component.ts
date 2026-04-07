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

import { ContractsService } from '../../shared/service/contracts.service';
import { ContractFullResponse } from '../../shared/interfaces/Response.interface';
import { ContractDetalleLineJson, UpdateContractFullRequest } from '../../shared/interfaces/Request.interface';
import { CatalogService, ConstructoraDto, ProyectoDto } from '../../../../shared/services/catalog.service';

interface EmpresaOption {
  label: string;
  value: string | null;
}

interface EstadoContratoOption {
  label: string;
  value: string | null;
}

@Component({
  selector: 'app-contracts-consult',
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
  templateUrl: './contracts-consult.component.html',
  styleUrls: ['./contracts-consult.component.scss'],
})
export class ContractsConsultComponent implements OnInit {
  buscar: string = '';
  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;
  /** Filtro SP: null = todos. */
  estado: string | null = null;
  estadosContratoFiltro: EstadoContratoOption[] = [
    { label: 'Todos', value: null },
    { label: 'Activo', value: 'Activo' },
    { label: 'Finalizado', value: 'Finalizado' },
  ];
  estadosContratoEdicion: { label: string; value: string }[] = [
    { label: 'Activo', value: 'Activo' },
    { label: 'Finalizado', value: 'Finalizado' },
  ];
  empresaAsociada: string | null = null;

  empresas: EmpresaOption[] = [];
  empresasSoloSeleccion: EmpresaOption[] = [];
  private empresaMap = new Map<string, string>();

  constructorasOptions: { label: string; value: string }[] = [];
  proyectosOptions: { label: string; value: string }[] = [];
  selectedConstructoraId: string | null = null;
  selectedProyectoId: string | null = null;

  constructorasEditOptions: { label: string; value: string }[] = [];
  proyectosEditOptions: { label: string; value: string }[] = [];
  selectedEditConstructoraId: string | null = null;
  selectedEditProyectoId: string | null = null;

  private rawResults: ContractFullResponse[] = [];
  results: ContractFullResponse[] = [];
  loading = false;

  rowsPerPage = 10;
  rowsPerPageOptions = [10, 25, 50, 100];

  detailVisible = false;
  selectedHeader: ContractFullResponse | null = null;
  selectedItems: ContractFullResponse[] = [];

  editableHeader: ContractFullResponse | null = null;
  editableItems: ContractFullResponse[] = [];

  get puedeEditarContrato(): boolean {
    return Number(localStorage.getItem('id_perfil')) === 1;
  }

  constructor(
    private contractsService: ContractsService,
    private catalogService: CatalogService
  ) {}

  ngOnInit(): void {
    this.loadEmpresas();
    this.loadConstructorasCatalog();
  }

  private normalizeText(value: unknown): string {
    return String(value ?? '')
      .trim()
      .toLowerCase();
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

        this.empresasSoloSeleccion = this.empresas.filter((e) => e.value !== null);

        this.empresaMap.clear();
        companies.forEach((c: any) => {
          this.empresaMap.set(String(c.id), c.nombre_empresa);
        });
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
        if (this.detailVisible && this.editableHeader) {
          this.syncEditConstructoraYProyecto();
        }
      },
      error: () => {
        this.constructorasOptions = [];
        this.constructorasEditOptions = [];
      },
    });
  }

  empresaDisplay(value: string | null): string {
    if (!value) return '';
    const key = String(value).trim();
    if (this.empresaMap.has(key)) return this.empresaMap.get(key) || '';
    if (key === '1') return 'SOSAMET SAS';
    if (key === '2') return 'HIERROS Y SERVICIOS SAS';
    return key;
  }

  private formatDate(date: Date | null): string | null {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private contractKey(row: ContractFullResponse): string {
    return String(row.numerodoc ?? '');
  }

  private groupByContract(data: ContractFullResponse[]): ContractFullResponse[] {
    const map = new Map<string, ContractFullResponse>();
    data.forEach((row) => {
      const key = this.contractKey(row);
      if (key && !map.has(key)) map.set(key, row);
    });
    return Array.from(map.values());
  }

  onConstructoraFilterChange(id: string | null): void {
    this.selectedConstructoraId = id;
    this.selectedProyectoId = null;
    this.proyectosOptions = [];

    if (!id) return;

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
  }

  proyectoNombreFiltro(): string {
    return this.proyectosOptions.find((p) => p.value === this.selectedProyectoId)?.label ?? '';
  }

  constructoraNombreFiltro(): string {
    return this.constructorasOptions.find((c) => c.value === this.selectedConstructoraId)?.label ?? '';
  }

  private syncEditConstructoraYProyecto(): void {
    if (!this.editableHeader) {
      this.selectedEditConstructoraId = null;
      this.selectedEditProyectoId = null;
      this.proyectosEditOptions = [];
      return;
    }

    const currentConstructora = this.normalizeText(this.editableHeader.empresa);
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
      this.editableHeader.empresa = '';
      this.editableHeader.proyecto = '';
      return;
    }

    const cons = this.constructorasEditOptions.find((c) => c.value === id);
    this.editableHeader.empresa = cons?.label ?? '';

    this.catalogService.getProyectosByConstructora(id).subscribe({
      next: (list: ProyectoDto[]) => {
        this.proyectosEditOptions = list.map((p) => ({
          label: p.nombre,
          value: String(p.id),
        }));

        if (!resetProyecto) {
          const currentProyecto = this.normalizeText(this.editableHeader!.proyecto);
          const match = this.proyectosEditOptions.find(
            (p) => this.normalizeText(p.label) === currentProyecto
          );
          if (match) this.selectedEditProyectoId = match.value;
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
      .consultContractsFull({
        buscar: this.buscar?.trim() || null,
        estado: this.estado,
        fecha_desde: this.formatDate(this.fechaDesde),
        fecha_hasta: this.formatDate(this.fechaHasta),
        empresa_asociada: this.empresaAsociada,
        constructora: this.constructoraNombreFiltro()?.trim() || null,
        proyecto: this.proyectoNombreFiltro()?.trim() || null,
      })
      .subscribe({
        next: (res) => {
          this.rawResults = res.data || [];
          this.results = this.groupByContract(this.rawResults);
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
    this.empresaAsociada = null;
    this.selectedConstructoraId = null;
    this.selectedProyectoId = null;
    this.proyectosOptions = [];
    this.rawResults = [];
    this.results = [];
  }

  formatDateForDisplay(value: string | null): string {
    if (!value) return '';
    const gmtIdx = value.indexOf('GMT');
    const slice = gmtIdx > 0 ? value.substring(0, gmtIdx).trim() : value;
    const d = new Date(slice);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
    return String(value);
  }

  onAbrir(row: ContractFullResponse): void {
    const key = this.contractKey(row);
    this.selectedHeader = row;
    this.selectedItems = this.rawResults.filter((item) => this.contractKey(item) === key);
    this.editableHeader = { ...row };
    this.editableItems = this.selectedItems.map((i) => ({ ...i }));
    this.syncEditConstructoraYProyecto();
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

  private buildCabeceraPayload(h: ContractFullResponse): Record<string, string | null> {
    return {
      tipo_doc_contratista: h.tipo_doc_contratista ?? null,
      empresa_asociada: h.empresa_asociada ?? null,
      empresa: h.empresa ?? null,
      nit_empresa: h.nit_empresa ?? null,
      proyecto: h.proyecto ?? null,
      ciudad_empresa: h.ciudad_empresa ?? null,
      tipo_contrato: h.tipo_contrato ?? null,
      estado: h.estado ?? null,
      fecha_inicio: h.fecha_inicio ?? null,
      fecha_fin: h.fecha_fin ?? null,
      descripcion: h.descripcion ?? null,
      porcentaje_anticipo: h.porcentaje_anticipo ?? null,
      valor_anticipo: h.valor_anticipo ?? null,
      estado_pago_anticipo: h.estado_pago_anticipo ?? null,
      rete_garantia: h.rete_garantia ?? null,
      valor_r_garantia: h.valor_r_garantia ?? null,
      estado_pago_r_garantia: h.estado_pago_r_garantia ?? null,
      polizas: h.polizas ?? null,
      valor_polizas_in: h.valor_polizas_in ?? null,
      estado_polizas_in: h.estado_polizas_in ?? null,
      polizas_finales: h.polizas_finales ?? null,
      valor_polizas_fin: h.valor_polizas_fin ?? null,
      estado_polizas_fin: h.estado_polizas_fin ?? null,
      valor_contrato: h.valor_contrato ?? null,
    };
  }

  private mapItemToDetalleJson(it: ContractFullResponse): ContractDetalleLineJson {
    return {
      tipo_detalle: String(it.tipo_detalle || 'AIU'),
      item: it.item ?? null,
      empresa: it.empresa_detalle ?? null,
      ref: it.ref ?? null,
      cant: it.cant != null ? String(it.cant) : null,
      und: it.und ?? null,
      ancho: it.ancho != null ? String(it.ancho) : null,
      alto: it.alto != null ? String(it.alto) : null,
      descripcion: it.descripcion_detalle ?? null,
      insumo: it.insumo ?? null,
      valor_base: it.valor_base != null ? String(it.valor_base) : null,
      porc_adm: it.porc_adm != null ? String(it.porc_adm) : null,
      vr_adm: it.vr_adm != null ? String(it.vr_adm) : null,
      porc_imp: it.porc_imp != null ? String(it.porc_imp) : null,
      vr_imp: it.vr_imp != null ? String(it.vr_imp) : null,
      porc_ut: it.porc_ut != null ? String(it.porc_ut) : null,
      vr_ut: it.vr_ut != null ? String(it.vr_ut) : null,
      porc_iva: it.porc_iva != null ? String(it.porc_iva) : null,
      vr_iva: it.vr_iva != null ? String(it.vr_iva) : null,
      vr_total: it.vr_total != null ? String(it.vr_total) : null,
    };
  }

  actualizarContrato(): void {
    if (!this.editableHeader) return;
    if (!this.puedeEditarContrato) {
      Swal.fire('Sin permiso', 'Solo un administrador puede actualizar contratos.', 'warning');
      return;
    }

    const numerodoc = String(this.editableHeader.numerodoc ?? '').trim();
    if (!numerodoc) return;

    const payload: UpdateContractFullRequest = {
      numerodoc,
      cabecera: this.buildCabeceraPayload(this.editableHeader),
      detalle:
        this.editableItems.length > 0
          ? this.editableItems.map((it) => this.mapItemToDetalleJson(it))
          : null,
    };

    this.contractsService.updateContractFull(payload).subscribe({
      next: () => {
        this.onCerrarDetalle();
        this.onLimpiar();
        queueMicrotask(() => {
          Swal.fire('Actualizado', 'El contrato se actualizó correctamente.', 'success');
        });
      },
      error: (err) => {
        const msg =
          err?.error?.error || err?.error?.message || 'Ocurrió un error al actualizar el contrato.';
        Swal.fire('Error', msg, 'error');
      },
    });
  }

  descargarPdf(): void {
    const header = this.selectedHeader;
    if (!header) return;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = 297;
    let y = 12;

    doc.setFontSize(14);
    doc.text('Contrato', pageW / 2, y, { align: 'center' });
    y += 9;

    doc.setFontSize(9);
    const labelStartX = 10;
    const valueStartX = 52;
    const cabecera: [string, string][] = [
      ['Nº documento', String(header.numerodoc || '')],
      ['Nº contrato', String(header.numero_contrato || '')],
      ['Tipo contratista', String(header.tipo_doc_contratista || '')],
      ['Constructora', String(header.empresa || '')],
      ['NIT', String(header.nit_empresa || '')],
      ['Proyecto', String(header.proyecto || '')],
      ['Ciudad', String(header.ciudad_empresa || '')],
      ['Tipo contrato', String(header.tipo_contrato || '')],
      ['Estado', String(header.estado || '')],
      ['Fecha inicio', this.formatDateForDisplay(header.fecha_inicio)],
      ['Fecha fin', this.formatDateForDisplay(header.fecha_fin)],
      ['Empresa asociada', this.empresaDisplay(header.empresa_asociada)],
      ['Descripción', String(header.descripcion || '').substring(0, 120)],
      ['Valor contrato', String(header.valor_contrato || '')],
    ];

    cabecera.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label + ':', labelStartX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, valueStartX, y);
      y += 5;
      if (y > 185) {
        doc.addPage();
        y = 12;
      }
    });
    y += 4;

    const items = this.selectedItems;
    const tableHeaders = [
      [
        'Tipo',
        'Item',
        'Ref',
        'Cant',
        'Und',
        'Ancho',
        'Alto',
        'Descripción',
        'Insumo',
        'V.Base',
        '%Adm',
        'VrAdm',
        '%Imp',
        'VrImp',
        '%Ut',
        'VrUt',
        '%Iva',
        'VrIva',
        'VrTot',
      ],
    ];
    const tableBody =
      items.length > 0
        ? items.map((it) => [
            String(it.tipo_detalle ?? ''),
            String(it.item ?? ''),
            String(it.ref ?? ''),
            String(it.cant ?? ''),
            String(it.und ?? ''),
            String(it.ancho ?? ''),
            String(it.alto ?? ''),
            String(it.descripcion_detalle ?? '').substring(0, 28),
            String(it.insumo ?? '').substring(0, 14),
            String(it.valor_base ?? ''),
            String(it.porc_adm ?? ''),
            String(it.vr_adm ?? ''),
            String(it.porc_imp ?? ''),
            String(it.vr_imp ?? ''),
            String(it.porc_ut ?? ''),
            String(it.vr_ut ?? ''),
            String(it.porc_iva ?? ''),
            String(it.vr_iva ?? ''),
            String(it.vr_total ?? ''),
          ])
        : [['—', 'Sin ítems', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']];

    autoTable(doc, {
      head: tableHeaders,
      body: tableBody,
      startY: y,
      margin: { left: 10, right: 10 },
      styles: { fontSize: 7 },
      headStyles: { fillColor: [70, 130, 180] },
    });

    const fileName = `contrato-${(header.numerodoc || header.numero_contrato || 'doc').replace(/\s/g, '-')}.pdf`;
    doc.save(fileName);
  }
}
