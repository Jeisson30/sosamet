import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

import Swal from 'sweetalert2';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ContractsService } from '../../../contracts/shared/service/contracts.service';
import { RemissionResponse } from '../../../contracts/shared/interfaces/Response.interface';
import { UpdateRemissionRequest } from '../../../contracts/shared/interfaces/Request.interface';
import {
  CatalogService,
  ConstructoraDto,
  ProyectoDto,
} from '../../../../shared/services/catalog.service';
import { RemisionPrintFormatComponent } from '../../../contracts/shared/remision-print-format/remision-print-format.component';
import {
  RemisionPrintHeader,
  RemisionPrintItem,
} from '../../../contracts/shared/remision-print-format/remision-print-format.model';
import { TIPO_CONTRATO_DOCUMENTO_OPTIONS } from '../../../contracts/shared/constants/tipo-contrato.constants';

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
    MenuModule,
    RemisionPrintFormatComponent,
  ],
  templateUrl: './remissions-consult.component.html',
  styleUrls: ['./remissions-consult.component.scss'],
})
export class RemissionsConsultComponent implements OnInit {
  readonly tipoContratoOptions = TIPO_CONTRATO_DOCUMENTO_OPTIONS;

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

  constructorasOptions: { label: string; value: string }[] = [];
  proyectosOptions: { label: string; value: string }[] = [];
  selectedConstructoraId: string | null = null;
  selectedProyectoId: string | null = null;

  constructorasEditOptions: { label: string; value: string }[] = [];
  proyectosEditOptions: { label: string; value: string }[] = [];
  selectedEditConstructoraId: string | null = null;
  selectedEditProyectoId: string | null = null;

  private rawResults: RemissionResponse[] = [];
  results: RemissionResponse[] = [];
  loading: boolean = false;

  rowsPerPage = 10;
  rowsPerPageOptions = [10, 25, 50, 100];

  detailVisible = false;
  editMode = false;
  selectedHeader: RemissionResponse | null = null;
  selectedItems: RemissionResponse[] = [];

  editableHeader: RemissionResponse | null = null;
  editableItems: RemissionResponse[] = [];
  /** ids de ítems eliminados pendientes de confirmar al guardar */
  private pendingDeleteIds: number[] = [];

  menuRow: RemissionResponse | null = null;
  rowMenuItems: MenuItem[] = [];

  showPdfForExport = false;
  pdfHeader: RemisionPrintHeader | null = null;
  pdfItems: RemisionPrintItem[] = [];

  @ViewChild('remisionPrint') remisionPrintRef?: RemisionPrintFormatComponent;

  get puedeEditarRemision(): boolean {
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
    return (
      row.numerodoc ||
      row.remision_material ||
      row.numero_contrato ||
      row.contrato ||
      ''
    );
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
    if (key === '1') return 'SOSAMET SAS';
    if (key === '2') return 'HIERROS Y SERVICIOS SAS';
    return key;
  }

  isAnulada(row: RemissionResponse | null | undefined): boolean {
    return (
      String(row?.estado ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') === 'anulado'
    );
  }

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

  onConstructoraEditChange(
    id: string | null,
    resetProyecto: boolean = true
  ): void {
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

  private openDetail(row: RemissionResponse, edit: boolean): void {
    const key = this.remissionKey(row);
    this.selectedHeader = row;
    this.selectedItems = this.rawResults.filter(
      (item) => this.remissionKey(item) === key
    );
    this.editableHeader = { ...this.selectedHeader };
    this.editableItems = this.selectedItems
      .filter((i) => i.item != null || i.cantidad != null || i.detalle)
      .map((i) => ({ ...i }));
    if (!this.editableItems.length && this.selectedItems.length) {
      this.editableItems = this.selectedItems.map((i) => ({ ...i }));
    }
    this.pendingDeleteIds = [];
    this.editMode = edit && !this.isAnulada(row);
    this.syncEditConstructorayProyecto();
    this.detailVisible = true;
  }

  onVer(row: RemissionResponse): void {
    this.openDetail(row, false);
  }

  onEditar(row: RemissionResponse): void {
    if (this.isAnulada(row)) {
      Swal.fire(
        'Remisión anulada',
        'No se puede editar una remisión anulada.',
        'warning'
      );
      return;
    }
    if (!this.puedeEditarRemision) {
      Swal.fire(
        'Sin permiso',
        'Solo un administrador puede editar remisiones.',
        'warning'
      );
      return;
    }
    this.openDetail(row, true);
  }

  openRowMenu(
    event: Event,
    menu: { toggle: (e: Event) => void },
    row: RemissionResponse
  ): void {
    if (!this.puedeEditarRemision) {
      Swal.fire(
        'Sin permiso',
        'Solo un administrador puede usar estas opciones.',
        'warning'
      );
      return;
    }
    this.menuRow = row;
    const anulado = this.isAnulada(row);
    this.rowMenuItems = [
      {
        label: 'Editar',
        icon: 'pi pi-pencil',
        disabled: anulado,
        command: () => this.menuRow && this.onEditar(this.menuRow),
      },
      {
        label: 'Eliminar',
        icon: 'pi pi-trash',
        command: () => this.menuRow && this.onEliminar(this.menuRow),
      },
      {
        label: 'Anular',
        icon: 'pi pi-ban',
        disabled: anulado,
        command: () => this.menuRow && this.onAnular(this.menuRow),
      },
    ];
    menu.toggle(event);
  }

  onCerrarDetalle(): void {
    this.detailVisible = false;
    this.editMode = false;
    this.selectedHeader = null;
    this.selectedItems = [];
    this.editableHeader = null;
    this.editableItems = [];
    this.pendingDeleteIds = [];
    this.selectedEditConstructoraId = null;
    this.selectedEditProyectoId = null;
  }

  agregarItem(): void {
    if (!this.editMode || !this.puedeEditarRemision) return;
    this.editableItems = [
      ...this.editableItems,
      {
        id: 0,
        numerodoc: this.editableHeader?.numerodoc ?? null,
        contrato: this.editableHeader?.numero_contrato ?? null,
        empresa: null,
        item: '',
        cantidad: null,
        um: '',
        detalle: '',
        observaciones: '',
        tipo_doc: 'Remisión',
        fecha_creacion: '',
        tipo_doc_rem: this.editableHeader?.tipo_doc_rem ?? null,
        tipo_contrato: this.editableHeader?.tipo_contrato ?? null,
        numero_contrato: this.editableHeader?.numero_contrato ?? null,
        remision_material: this.editableHeader?.remision_material ?? null,
        fecha_remision: this.editableHeader?.fecha_remision ?? null,
        constructora: this.editableHeader?.constructora ?? null,
        proyecto: this.editableHeader?.proyecto ?? null,
        despacho: this.editableHeader?.despacho ?? null,
        transporto: this.editableHeader?.transporto ?? null,
        empresa_asociada: this.editableHeader?.empresa_asociada ?? null,
        direccion_empresa: this.editableHeader?.direccion_empresa ?? null,
        orden_de_compra: this.editableHeader?.orden_de_compra ?? null,
      },
    ];
  }

  quitarItem(index: number): void {
    if (!this.editMode || !this.puedeEditarRemision) return;
    const row = this.editableItems[index];
    if (!row) return;
    const id = Number(row.id);
    if (Number.isFinite(id) && id > 0) {
      this.pendingDeleteIds.push(id);
    }
    this.editableItems = this.editableItems.filter((_, i) => i !== index);
  }

  private resolveNumerodoc(): string {
    if (!this.editableHeader) return '';
    return String(
      this.editableHeader.numerodoc ||
        this.editableHeader.remision_material ||
        this.editableHeader.numero_contrato ||
        this.editableHeader.contrato ||
        ''
    ).trim();
  }

  actualizarRemision(): void {
    if (!this.editableHeader || !this.editMode) return;
    if (!this.puedeEditarRemision) {
      Swal.fire(
        'Sin permiso',
        'Solo un administrador puede actualizar remisiones.',
        'warning'
      );
      return;
    }
    if (this.isAnulada(this.editableHeader)) {
      Swal.fire(
        'Remisión anulada',
        'No se puede actualizar una remisión anulada.',
        'warning'
      );
      return;
    }

    const numerodoc = this.resolveNumerodoc();
    if (!numerodoc) {
      Swal.fire('Atención', 'No se encontró el documento de la remisión.', 'warning');
      return;
    }

    const headerPayload: UpdateRemissionRequest = {
      numerodoc,
      actualizar_cabecera: true,
      actualizar_detalle: false,
      tipo_doc_rem: this.editableHeader.tipo_doc_rem ?? null,
      tipo_contrato: this.editableHeader.tipo_contrato ?? null,
      numero_contrato:
        this.editableHeader.numero_contrato ??
        this.editableHeader.contrato ??
        null,
      remision_material: this.editableHeader.remision_material ?? null,
      fecha_remision: this.editableHeader.fecha_remision ?? null,
      cliente: this.editableHeader.constructora ?? null,
      proyecto: this.editableHeader.proyecto ?? null,
      despacho: this.editableHeader.despacho ?? null,
      transporto: this.editableHeader.transporto ?? null,
      empresa_asociada: this.editableHeader.empresa_asociada ?? null,
      direccion_empresa: this.editableHeader.direccion_empresa ?? null,
      orden_de_compra: this.editableHeader.orden_de_compra ?? null,
      elaboro: this.editableHeader.elaboro ?? null,
    };

    const deleteReqs = this.pendingDeleteIds.map((id) =>
      this.contractsService.deleteRemissionDetalle(id).pipe(
        catchError(() => of(null))
      )
    );

    const items = this.editableItems || [];
    const detailReqs = items
      .filter((it) => String(it.item ?? '').trim() || it.cantidad != null)
      .map((it) => {
        const detailPayload: UpdateRemissionRequest = {
          numerodoc,
          actualizar_cabecera: false,
          actualizar_detalle: true,
          numero_contrato:
            this.editableHeader!.numero_contrato ??
            this.editableHeader!.contrato ??
            null,
          remision_material: this.editableHeader!.remision_material ?? null,
          id: Number(it.id) > 0 ? Number(it.id) : null,
          item: it.item ?? null,
          empresa: it.empresa ?? null,
          cantidad: it.cantidad ?? null,
          um: it.um ?? null,
          detalle: it.detalle ?? null,
          observaciones: it.observaciones ?? null,
        };
        return this.contractsService.updateRemission(detailPayload);
      });

    this.contractsService.updateRemission(headerPayload).subscribe({
      next: () => {
        const all = [...deleteReqs, ...detailReqs];
        if (!all.length) {
          Swal.fire(
            'Actualizado',
            'La remisión se actualizó correctamente.',
            'success'
          );
          this.onCerrarDetalle();
          this.onBuscar();
          return;
        }
        forkJoin(all).subscribe({
          next: () => {
            Swal.fire(
              'Actualizado',
              'La remisión se actualizó correctamente.',
              'success'
            );
            this.onCerrarDetalle();
            this.onBuscar();
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
      error: (err) => {
        Swal.fire(
          'Error',
          err?.error?.error ||
            'Ocurrió un error al actualizar la cabecera de la remisión.',
          'error'
        );
      },
    });
  }

  onEliminar(row: RemissionResponse): void {
    if (!this.puedeEditarRemision) {
      Swal.fire(
        'Sin permiso',
        'Solo un administrador puede eliminar remisiones.',
        'warning'
      );
      return;
    }
    const numerodoc = String(row.numerodoc || '').trim();
    const remision = String(row.remision_material || '').trim();
    if (!numerodoc && !remision) {
      Swal.fire('Atención', 'No se encontró el documento de la remisión.', 'warning');
      return;
    }

    Swal.fire({
      icon: 'warning',
      title: 'Eliminar remisión',
      html: `
        <p>Se eliminará la remisión <strong>${remision || numerodoc}</strong>.</p>
        <p>Se borrarán cabecera y detalle (si no hay otras remisiones del mismo contrato).</p>
        <p>Esta operación es <strong>irreversible</strong>.</p>
        <p>¿Está seguro de continuar?</p>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c0392b',
      cancelButtonColor: '#6c757d',
      reverseButtons: true,
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.contractsService
        .deleteRemission({
          numerodoc: numerodoc || undefined,
          remision_material: remision || undefined,
        })
        .subscribe({
          next: (res) => {
            Swal.fire(
              'Eliminada',
              res?.mensaje || 'Remisión eliminada correctamente.',
              'success'
            );
            this.onCerrarDetalle();
            this.onBuscar();
          },
          error: (err) => {
            Swal.fire(
              'Error',
              err?.error?.error || 'No se pudo eliminar la remisión.',
              'error'
            );
          },
        });
    });
  }

  onAnular(row: RemissionResponse): void {
    if (!this.puedeEditarRemision) {
      Swal.fire(
        'Sin permiso',
        'Solo un administrador puede anular remisiones.',
        'warning'
      );
      return;
    }
    if (this.isAnulada(row)) {
      Swal.fire('Atención', 'La remisión ya está anulada.', 'info');
      return;
    }
    const numerodoc = String(row.numerodoc || '').trim();
    const remision = String(row.remision_material || '').trim();
    if (!numerodoc && !remision) {
      Swal.fire('Atención', 'No se encontró el documento de la remisión.', 'warning');
      return;
    }

    Swal.fire({
      icon: 'warning',
      title: 'Anular remisión',
      html: `
        <p>Se anulará la remisión <strong>${remision || numerodoc}</strong>.</p>
        <p>No se podrá editar después. El registro permanecerá visible.</p>
        <p>¿Desea continuar?</p>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e67e22',
      cancelButtonColor: '#6c757d',
      reverseButtons: true,
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.contractsService
        .anularRemission({
          numerodoc: numerodoc || undefined,
          remision_material: remision || undefined,
        })
        .subscribe({
          next: (res) => {
            Swal.fire(
              'Anulada',
              res?.mensaje || 'Remisión anulada correctamente.',
              'success'
            );
            this.onCerrarDetalle();
            this.onBuscar();
          },
          error: (err) => {
            Swal.fire(
              'Error',
              err?.error?.error || 'No se pudo anular la remisión.',
              'error'
            );
          },
        });
    });
  }

  descargarPdf(): void {
    const header = this.editableHeader;
    const items = this.editableItems;

    if (!header || !items.length) {
      Swal.fire(
        'Atención',
        'No hay datos de la remisión para generar el PDF.',
        'warning'
      );
      return;
    }

    this.pdfHeader = this.buildPdfHeader(header);
    this.pdfItems = items.map((it) => ({
      item: it.item,
      cantidad: it.cantidad,
      um: it.um,
      detalle: it.detalle,
      observaciones: it.observaciones,
    }));
    this.showPdfForExport = true;

    setTimeout(() => {
      const printCmp = this.remisionPrintRef;
      if (!printCmp) {
        this.showPdfForExport = false;
        Swal.fire('Error', 'No se pudo preparar el formato del PDF.', 'error');
        return;
      }

      const fileName = `Remision_${
        header.remision_material || header.numero_contrato || 'REM'
      }.pdf`;

      printCmp
        .generatePdf(fileName)
        .catch(() => {
          Swal.fire(
            'Error',
            'No se pudo generar el PDF de la remisión.',
            'error'
          );
        })
        .finally(() => {
          this.showPdfForExport = false;
        });
    }, 200);
  }

  private buildPdfHeader(header: RemissionResponse): RemisionPrintHeader {
    return {
      remision_material: header.remision_material,
      empresa_asociada: header.empresa_asociada,
      tipo_doc_rem: header.tipo_doc_rem,
      numero_contrato: header.numero_contrato || header.contrato,
      cliente: header.constructora,
      proyecto: header.proyecto,
      direccion_empresa: header.direccion_empresa,
      orden_de_compra: header.orden_de_compra,
      fecha_remision: header.fecha_remision,
      despacho: header.despacho,
      transporto: header.transporto,
    };
  }
}
