import { Component, OnInit } from '@angular/core';
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

import { BASE_URL } from '../../../../../core/url-constants';
import { ContractsService } from '../../../../contracts/shared/service/contracts.service';
import {
  CatalogService,
  ConstructoraDto,
  ProyectoDto,
} from '../../../../../shared/services/catalog.service';
import { GestionService } from '../../../shared/service/gestion.service';
import {
  GestionUser,
  OrdenTrabajoDetalle,
  OrdenTrabajoHeader,
  UpdateOrdenTrabajoRequest,
} from '../../../shared/interfaces/Response.interface';

@Component({
  selector: 'app-consult-order-work',
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
  ],
  templateUrl: './consult-order-work.component.html',
  styleUrls: ['./consult-order-work.component.scss'],
})
export class ConsultOrderWorkComponent implements OnInit {
  buscar = '';
  encargadoId: number | null = null;
  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;
  contrato: string | null = null;
  constructora = '';
  proyecto = '';

  constructorasOptions: { label: string; value: string }[] = [];
  proyectosOptions: { label: string; value: string }[] = [];
  selectedConstructoraId: string | null = null;
  selectedProyectoId: string | null = null;

  constructorasEditOptions: { label: string; value: string }[] = [];
  proyectosEditOptions: { label: string; value: string }[] = [];
  selectedEditConstructoraId: string | null = null;
  selectedEditProyectoId: string | null = null;

  contratosOptions: { label: string; value: string }[] = [];
  workUsers: GestionUser[] = [];

  readonly tipoActividadOptions = [
    { label: 'FABRICACIÓN', value: 'FABRICACIÓN' },
    { label: 'INSTALACIÓN', value: 'INSTALACIÓN' },
    { label: 'PINTURA', value: 'PINTURA' },
  ];

  private allHeaders: OrdenTrabajoHeader[] = [];
  private allDetalle: OrdenTrabajoDetalle[] = [];
  results: OrdenTrabajoHeader[] = [];
  loading = false;
  saving = false;

  rowsPerPage = 10;
  rowsPerPageOptions = [10, 25, 50, 100];

  detailVisible = false;
  editMode = false;
  selectedHeader: OrdenTrabajoHeader | null = null;
  selectedItems: OrdenTrabajoDetalle[] = [];
  editableHeader: OrdenTrabajoHeader | null = null;
  editableItems: OrdenTrabajoDetalle[] = [];
  editFechaEntrega: Date | null = null;
  selectedEditEncargadoId: number | null = null;

  rowMenuItems: MenuItem[] = [];
  private menuRow: OrdenTrabajoHeader | null = null;

  private readonly filesBaseUrl = BASE_URL.replace(/\/api\/?$/, '');

  get puedeEditar(): boolean {
    return Number(localStorage.getItem('id_perfil')) === 1;
  }

  constructor(
    private gestionService: GestionService,
    private catalogService: CatalogService,
    private contractsService: ContractsService
  ) {}

  ngOnInit(): void {
    this.loadConstructorasCatalog();
    this.loadContratosOptions();
    this.loadWorkUsers();
    this.onBuscar();
  }

  private formatDateParam(date: Date | null): string | null {
    if (!date) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
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
      },
      error: () => {
        this.constructorasOptions = [];
        this.constructorasEditOptions = [];
      },
    });
  }

  private loadContratosOptions(): void {
    this.contractsService.consultarContratos().subscribe({
      next: (res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.contratosOptions = list.map((c) => ({
          label: c.label || c.numero_contrato || c.value,
          value: c.value || c.numero_contrato,
        }));
      },
      error: () => {
        this.contratosOptions = [];
      },
    });
  }

  private loadWorkUsers(): void {
    this.gestionService.getAllUsers().subscribe({
      next: (res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.workUsers = list
          .filter((u) => String(u.estado || '').toUpperCase() === 'ACTIVO')
          .map((user) => ({
          ...user,
            displayName: `${user.nombre} ${user.apellido} - ${user.perfil}`,
          }));
      },
      error: () => {
        this.workUsers = [];
      },
    });
  }

  onConstructoraFilterChange(id: string | null): void {
    this.selectedConstructoraId = id;
    this.selectedProyectoId = null;
    this.proyectosOptions = [];
    this.constructora = '';
    this.proyecto = '';

    if (!id) return;

    const cons = this.constructorasOptions.find((c) => c.value === id);
    this.constructora = cons?.label || '';

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
    this.proyecto = '';
    if (!id) return;
    const proy = this.proyectosOptions.find((p) => p.value === id);
    this.proyecto = proy?.label || '';
  }

  onBuscar(): void {
    this.loading = true;
    this.gestionService
      .consultOrdenesTrabajo({
        buscar: this.buscar?.trim() || null,
        encargado_id: this.encargadoId,
        fecha_desde: this.formatDateParam(this.fechaDesde),
        fecha_hasta: this.formatDateParam(this.fechaHasta),
        constructora: this.constructora?.trim() || null,
        proyecto: this.proyecto?.trim() || null,
        contrato: this.contrato?.trim() || null,
      })
      .subscribe({
        next: (res) => {
          this.allDetalle = res?.detalle || [];
          this.allHeaders = (res?.cabecera || []).map((h) => ({
            ...h,
            tiempo_transcurrido: this.calcTiempoTranscurrido(h.fecha_creacion),
          }));
          this.results = this.allHeaders;
          this.loading = false;
        },
        error: (err) => {
          this.allHeaders = [];
          this.allDetalle = [];
          this.results = [];
          this.loading = false;
          Swal.fire({
            title: 'Error',
            text:
              err?.error?.mensaje ||
              err?.error?.error ||
              'No se pudieron consultar las órdenes de trabajo.',
            icon: 'error',
            confirmButtonColor: '#20506A',
          });
        },
      });
  }

  onLimpiar(): void {
    this.buscar = '';
    this.encargadoId = null;
    this.fechaDesde = null;
    this.fechaHasta = null;
    this.contrato = null;
    this.constructora = '';
    this.proyecto = '';
    this.selectedConstructoraId = null;
    this.selectedProyectoId = null;
    this.proyectosOptions = [];
    this.onBuscar();
  }

  isAnulada(row: OrdenTrabajoHeader | null | undefined): boolean {
    return Number(row?.estado) === 3;
  }

  private calcTiempoTranscurrido(
    fechaCreacion: string | null | undefined
  ): number | null {
    if (!fechaCreacion) return null;
    const created = this.parseToDate(fechaCreacion);
    if (!created) return null;
    const now = new Date();
    const start = new Date(
      created.getFullYear(),
      created.getMonth(),
      created.getDate()
    );
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.floor(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff < 0 ? 0 : diff;
  }

  formatDateForDisplay(value: string | null | undefined): string {
    if (!value) return '—';
    const d = this.parseToDate(value);
    return d
      ? d.toLocaleDateString('es-CO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : String(value);
  }

  formatTiempo(dias: number | null | undefined): string {
    if (dias == null) return '—';
    if (dias === 0) return 'Hoy';
    if (dias === 1) return '1 Día';
    return `${dias} Días`;
  }

  formatContrato(row: OrdenTrabajoHeader): string {
    const tipo = String(row.tipo_documento || '').trim();
    const num = String(row.numero_contrato || '').trim();
    if (tipo && num) return `${tipo} ${num}`;
    return num || tipo || '—';
  }

  private parseToDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    const raw = String(value).trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const d = new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
      );
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  private itemsFor(idOrderWork: number): OrdenTrabajoDetalle[] {
    return this.allDetalle.filter(
      (d) => Number(d.id_order_work) === Number(idOrderWork)
    );
  }

  private openDetail(row: OrdenTrabajoHeader, edit: boolean): void {
    this.selectedHeader = row;
    this.selectedItems = this.itemsFor(row.id_order_work);
    this.editableHeader = { ...row };
    this.editableItems = this.selectedItems.map((i) => ({ ...i }));
    this.editMode = edit && !this.isAnulada(row);
    this.editFechaEntrega = this.parseToDate(row.fecha_entrega);
    this.selectedEditEncargadoId = Number(row.encargado_id) || null;
    this.syncEditConstructorayProyecto();
    this.detailVisible = true;
  }

  private syncEditConstructorayProyecto(): void {
    if (!this.editableHeader) {
      this.selectedEditConstructoraId = null;
      this.selectedEditProyectoId = null;
      this.proyectosEditOptions = [];
      return;
    }

    const consName = String(this.editableHeader.constructora || '').trim();
    const cons = this.constructorasEditOptions.find(
      (c) => c.label.toLowerCase() === consName.toLowerCase()
    );
    this.selectedEditConstructoraId = cons?.value || null;
    this.proyectosEditOptions = [];
    this.selectedEditProyectoId = null;

    if (!this.selectedEditConstructoraId) return;

    this.catalogService
      .getProyectosByConstructora(this.selectedEditConstructoraId)
      .subscribe({
        next: (list: ProyectoDto[]) => {
          this.proyectosEditOptions = list.map((p) => ({
            label: p.nombre,
            value: String(p.id),
          }));
          const proyName = String(this.editableHeader?.proyecto || '').trim();
          const proy = this.proyectosEditOptions.find(
            (p) => p.label.toLowerCase() === proyName.toLowerCase()
          );
          this.selectedEditProyectoId = proy?.value || null;
        },
        error: () => {
          this.proyectosEditOptions = [];
        },
      });
  }

  onConstructoraEditChange(id: string | null): void {
    this.selectedEditConstructoraId = id;
    this.selectedEditProyectoId = null;
    this.proyectosEditOptions = [];
    if (!this.editableHeader) return;

    const cons = this.constructorasEditOptions.find((c) => c.value === id);
    this.editableHeader.constructora = cons?.label || '';
    this.editableHeader.proyecto = '';

    if (!id) return;
    this.catalogService.getProyectosByConstructora(id).subscribe({
      next: (list: ProyectoDto[]) => {
        this.proyectosEditOptions = list.map((p) => ({
          label: p.nombre,
          value: String(p.id),
        }));
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

  onEncargadoEditChange(id: number | null): void {
    this.selectedEditEncargadoId = id;
    if (!this.editableHeader) return;
    this.editableHeader.encargado_id = id ?? this.editableHeader.encargado_id;
    const user = this.workUsers.find((u) => Number(u.id_usuario) === Number(id));
    this.editableHeader.encargado = user
      ? `${user.nombre} ${user.apellido}`
      : this.editableHeader.encargado;
  }

  onVer(row: OrdenTrabajoHeader): void {
    this.openDetail(row, false);
  }

  onEditar(row: OrdenTrabajoHeader): void {
    if (this.isAnulada(row)) {
      Swal.fire({
        title: 'Orden anulada',
        text: 'No se puede editar una orden de trabajo anulada.',
        icon: 'warning',
        confirmButtonColor: '#20506A',
      });
      return;
    }
    if (!this.puedeEditar) {
      Swal.fire({
        title: 'Sin permiso',
        text: 'Solo un administrador puede editar órdenes de trabajo.',
        icon: 'warning',
        confirmButtonColor: '#20506A',
      });
      return;
    }
    this.openDetail(row, true);
  }

  onCerrarDetalle(): void {
    this.detailVisible = false;
    this.editMode = false;
    this.saving = false;
    this.selectedHeader = null;
    this.selectedItems = [];
    this.editableHeader = null;
    this.editableItems = [];
    this.editFechaEntrega = null;
    this.selectedEditEncargadoId = null;
  }

  openRowMenu(
    event: Event,
    menu: { toggle: (e: Event) => void },
    row: OrdenTrabajoHeader
  ): void {
    this.menuRow = row;
    const anulada = this.isAnulada(row);
    this.rowMenuItems = [
      {
        label: 'Editar',
        icon: 'pi pi-pencil',
        disabled: anulada,
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
        disabled: anulada,
        command: () => this.menuRow && this.onAnular(this.menuRow),
      },
    ];
    menu.toggle(event);
  }

  onEliminar(row: OrdenTrabajoHeader): void {
    if (!this.puedeEditar) {
      Swal.fire({
        title: 'Sin permiso',
        text: 'Solo un administrador puede eliminar órdenes de trabajo.',
        icon: 'warning',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    const id = Number(row.id_order_work);
    const consecutivo = String(row.consecutivo || '').trim() || String(id);

    Swal.fire({
      icon: 'warning',
      title: 'Eliminar orden de trabajo',
      html: `
        <p>Se eliminará la orden <strong>${consecutivo}</strong>.</p>
        <p>Esta operación es <strong>irreversible</strong>.</p>
        <p>Los planos vinculados quedarán disponibles para asignar de nuevo.</p>
        <p>¿Está seguro de continuar?</p>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c0392b',
      cancelButtonColor: '#6c757d',
      reverseButtons: true,
    }).then((r) => {
      if (!r.isConfirmed) return;

      Swal.fire({
        title: 'Eliminando...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(null),
      });

      this.gestionService.deleteOrdenTrabajo(id).subscribe({
        next: (res) => {
          Swal.fire({
            title: 'Eliminada',
            text: res?.mensaje || `La orden ${consecutivo} fue eliminada.`,
            icon: 'success',
            confirmButtonColor: '#20506A',
          });
          this.onBuscar();
        },
        error: (err) => {
          Swal.fire({
            title: 'Error',
            text:
              err?.error?.mensaje ||
              err?.error?.error ||
              'No se pudo eliminar la orden de trabajo.',
            icon: 'error',
            confirmButtonColor: '#20506A',
          });
        },
      });
    });
  }

  onAnular(row: OrdenTrabajoHeader): void {
    if (!this.puedeEditar) {
      Swal.fire({
        title: 'Sin permiso',
        text: 'Solo un administrador puede anular órdenes de trabajo.',
        icon: 'warning',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    if (this.isAnulada(row)) {
      Swal.fire({
        title: 'Ya anulada',
        text: 'Esta orden de trabajo ya se encuentra anulada.',
        icon: 'info',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    const id = Number(row.id_order_work);
    const consecutivo = String(row.consecutivo || '').trim() || String(id);

    Swal.fire({
      icon: 'warning',
      title: 'Anular orden de trabajo',
      html: `
        <p>Se anulará la orden <strong>${consecutivo}</strong>.</p>
        <p>Una vez anulada <strong>no podrá editarse</strong>.</p>
        <p>¿Está seguro de continuar?</p>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c0392b',
      cancelButtonColor: '#6c757d',
      reverseButtons: true,
    }).then((r) => {
      if (!r.isConfirmed) return;

      Swal.fire({
        title: 'Anulando...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(null),
      });

      this.gestionService.anularOrdenTrabajo(id).subscribe({
        next: (res) => {
          Swal.fire({
            title: 'Anulada',
            text: res?.mensaje || `La orden ${consecutivo} fue anulada.`,
            icon: 'success',
            confirmButtonColor: '#20506A',
          });
          this.onBuscar();
        },
        error: (err) => {
          Swal.fire({
            title: 'Error',
            text:
              err?.error?.mensaje ||
              err?.error?.error ||
              'No se pudo anular la orden de trabajo.',
            icon: 'error',
            confirmButtonColor: '#20506A',
          });
        },
      });
    });
  }

  actualizarOrden(): void {
    if (!this.editableHeader) return;

    if (this.isAnulada(this.editableHeader)) {
      Swal.fire({
        title: 'Orden anulada',
        text: 'No se puede editar una orden de trabajo anulada.',
        icon: 'warning',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    if (!this.puedeEditar) {
      Swal.fire({
        title: 'Sin permiso',
        text: 'Solo un administrador puede actualizar órdenes de trabajo.',
        icon: 'warning',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    if (!this.selectedEditEncargadoId) {
      Swal.fire({
        title: 'Validación',
        text: 'Debe seleccionar un encargado.',
        icon: 'warning',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    if (!this.editFechaEntrega) {
      Swal.fire({
        title: 'Validación',
        text: 'Debe indicar la fecha de entrega.',
        icon: 'warning',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    const id = Number(this.editableHeader.id_order_work);
    this.saving = true;
    Swal.fire({
      title: 'Actualizando...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(null),
    });

    const headerPayload: UpdateOrdenTrabajoRequest = {
      id_order_work: id,
      actualizar_cabecera: true,
      actualizar_detalle: false,
      encargado_id: this.selectedEditEncargadoId,
      fecha_entrega: this.formatDateParam(this.editFechaEntrega),
      observaciones: this.editableHeader.observaciones ?? null,
      tipo_actividad: this.editableHeader.tipo_actividad ?? null,
      constructora: this.editableHeader.constructora ?? null,
      proyecto: this.editableHeader.proyecto ?? null,
      tipo_documento: this.editableHeader.tipo_documento ?? null,
      numero_contrato: this.editableHeader.numero_contrato ?? null,
      autorizo: this.editableHeader.autorizo ?? null,
      empresa_asociada_id: this.editableHeader.empresa_asociada_id ?? null,
    };

    this.gestionService.updateOrdenTrabajo(headerPayload).subscribe({
      next: () => {
        const items = this.editableItems || [];
        if (!items.length) {
          this.saving = false;
          Swal.fire({
            title: 'Actualizado',
            text: 'La orden de trabajo se actualizó correctamente.',
            icon: 'success',
            confirmButtonColor: '#20506A',
          });
          this.onCerrarDetalle();
          this.onBuscar();
          return;
        }

        const detailRequests = items.map((it) => {
          const payload: UpdateOrdenTrabajoRequest = {
            id_order_work: id,
            actualizar_cabecera: false,
            actualizar_detalle: true,
            id_order_work_detail: it.id_order_work_detail,
            item: it.item ?? null,
            ref: it.ref ?? null,
            descripcion: it.descripcion ?? null,
            cantidad: it.cantidad != null ? Number(it.cantidad) : null,
            um: it.um ?? null,
            ancho: it.ancho != null ? Number(it.ancho) : null,
            alto: it.alto != null ? Number(it.alto) : null,
            observaciones_item: it.observaciones_item ?? null,
          };
          return this.gestionService.updateOrdenTrabajo(payload);
        });

        forkJoin(detailRequests.length ? detailRequests : [of(null)]).subscribe({
          next: () => {
            this.saving = false;
            Swal.fire({
              title: 'Actualizado',
              text: 'La orden de trabajo se actualizó correctamente.',
              icon: 'success',
              confirmButtonColor: '#20506A',
            });
            this.onCerrarDetalle();
            this.onBuscar();
          },
          error: (err) => {
            this.saving = false;
            Swal.fire({
              title: 'Error',
              text:
                err?.error?.mensaje ||
                'La cabecera se actualizó, pero falló un ítem del detalle.',
              icon: 'error',
              confirmButtonColor: '#20506A',
            });
            this.onBuscar();
          },
        });
      },
      error: (err) => {
        this.saving = false;
        Swal.fire({
          title: 'Error',
          text:
            err?.error?.mensaje ||
            err?.error?.error ||
            'No se pudo actualizar la orden de trabajo.',
          icon: 'error',
          confirmButtonColor: '#20506A',
        });
      },
    }); 
  }

  fileUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    const clean = String(path).replace(/\\/g, '/').replace(/^\/+/, '');
    if (/^https?:\/\//i.test(clean)) return clean;
    return `${this.filesBaseUrl}/${clean}`;
  }

  isImage(path: string | null | undefined): boolean {
    if (!path) return false;
    return /\.(jpe?g|png|gif|webp|bmp|heic)$/i.test(String(path));
  }

  verAdjunto(path: string | null | undefined, titulo: string): void {
    const url = this.fileUrl(path);
    if (!url) {
      Swal.fire({
        title: 'Sin adjunto',
        text: `No hay archivo de ${titulo} para visualizar.`,
        icon: 'info',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    if (this.isImage(path)) {
      Swal.fire({
        title: titulo,
        imageUrl: url,
        imageAlt: titulo,
        width: 'auto',
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#20506A',
        imageHeight: 420,
      });
      return;
    }

    window.open(url, '_blank');
}
}
