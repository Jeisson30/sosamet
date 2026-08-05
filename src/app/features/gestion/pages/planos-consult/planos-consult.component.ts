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
import { forkJoin } from 'rxjs';

import { ContractsService } from '../../../contracts/shared/service/contracts.service';
import {
  ActaMedidaDetalle,
  ActaMedidaHeader,
} from '../../../contracts/shared/interfaces/Response.interface';
import { UpdateActaMedidaRequest } from '../../../contracts/shared/interfaces/Request.interface';
import {
  CatalogService,
  ConstructoraDto,
  ProyectoDto,
} from '../../../../shared/services/catalog.service';
import { GestionService } from '../../shared/service/gestion.service';
import { GestionUser } from '../../shared/interfaces/Response.interface';

@Component({
  selector: 'app-planos-consult',
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
  templateUrl: './planos-consult.component.html',
  styleUrls: ['./planos-consult.component.scss'],
})
export class PlanosConsultComponent implements OnInit {
  buscar = '';
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
  loadingUsers = false;
  selectedEditDisenadorId: number | null = null;
  editFechaActa: Date | null = null;
  editFechaTerminacion: Date | null = null;

  private allHeaders: ActaMedidaHeader[] = [];
  private allDetalle: ActaMedidaDetalle[] = [];
  results: ActaMedidaHeader[] = [];
  loading = false;
  saving = false;

  rowsPerPage = 10;
  rowsPerPageOptions = [10, 25, 50, 100];

  detailVisible = false;
  editMode = false;
  selectedHeader: ActaMedidaHeader | null = null;
  selectedItems: ActaMedidaDetalle[] = [];
  editableHeader: ActaMedidaHeader | null = null;
  editableItems: ActaMedidaDetalle[] = [];

  rowMenuItems: MenuItem[] = [];
  private menuRow: ActaMedidaHeader | null = null;

  get puedeEditar(): boolean {
    return Number(localStorage.getItem('id_perfil')) === 1;
  }

  constructor(
    private contractsService: ContractsService,
    private catalogService: CatalogService,
    private gestionService: GestionService
  ) {}

  ngOnInit(): void {
    this.loadConstructorasCatalog();
    this.loadContratosOptions();
    this.loadWorkUsers();
  }

  private normalizeText(value: unknown): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
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
    this.loadingUsers = true;
    this.gestionService.getAllUsers().subscribe({
      next: (res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.workUsers = list
          .filter((u) => String(u.estado || '').toUpperCase() === 'ACTIVO')
          .map((user) => ({
            ...user,
            displayName: `${user.nombre} ${user.apellido} - ${user.perfil}`,
          }));
        this.loadingUsers = false;
      },
      error: () => {
        this.workUsers = [];
        this.loadingUsers = false;
      },
    });
  }

  private syncEditDisenador(): void {
    if (!this.editableHeader) {
      this.selectedEditDisenadorId = null;
      return;
    }
    const id = Number(this.editableHeader.id_disenador);
    this.selectedEditDisenadorId = Number.isFinite(id) && id > 0 ? id : null;
  }

  onDisenadorEditChange(id: number | null): void {
    this.selectedEditDisenadorId = id;
    if (!this.editableHeader) return;
    this.editableHeader.id_disenador = id;
    const user = this.workUsers.find((u) => Number(u.id_usuario) === Number(id));
    this.editableHeader.disenador_encargado = user?.displayName || '';
  }

  onConstructoraFilterChange(id: string | null): void {
    this.selectedConstructoraId = id;
    this.selectedProyectoId = null;
    this.proyectosOptions = [];
    this.constructora = '';
    this.proyecto = '';

    if (!id) return;

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

  private daysElapsed(from: string | Date | null | undefined): number | null {
    if (!from) return null;
    const start = new Date(from);
    if (isNaN(start.getTime())) return null;
    const today = new Date();
    start.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor(
      (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff >= 0 ? diff : 0;
  }

  private enrichHeaders(
    cabecera: ActaMedidaHeader[],
    detalle: ActaMedidaDetalle[]
  ): ActaMedidaHeader[] {
    return cabecera.map((h) => {
      const items = detalle.filter(
        (d) =>
          String(d.amd_consecutivo || '').trim() ===
          String(h.consecutivo || '').trim()
      );
      const fechas = items
        .map((i) => i.amd_fecha_creacion)
        .filter(Boolean)
        .map((f) => new Date(String(f)))
        .filter((d) => !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());

      const fechaCreacion =
        fechas.length > 0
          ? fechas[0].toISOString()
          : h.fecha_acta || null;

      const estadoFromDetalle = items.find(
        (i) => i.amd_estado != null && String(i.amd_estado).trim() !== ''
      )?.amd_estado;
      const estado =
        h.estado != null && String(h.estado).trim() !== ''
          ? h.estado
          : estadoFromDetalle ?? null;

      const planos = Array.from(
        new Set(
          items
            .map((i) => String(i.amd_consecutivo_item || '').trim())
            .filter(Boolean)
        )
      );

      return {
        ...h,
        estado,
        planos_asignados: planos.length ? planos.join(', ') : null,
        fecha_creacion: fechaCreacion,
        tiempo_transcurrido: this.daysElapsed(fechaCreacion),
      };
    });
  }

  isAnulada(row: ActaMedidaHeader | null | undefined): boolean {
    return Number(row?.estado) === 3;
  }

  private applyFilters(rows: ActaMedidaHeader[]): ActaMedidaHeader[] {
    const q = this.normalizeText(this.buscar);
    const desde = this.fechaDesde
      ? new Date(this.formatDateParam(this.fechaDesde) + 'T00:00:00')
      : null;
    const hasta = this.fechaHasta
      ? new Date(this.formatDateParam(this.fechaHasta) + 'T23:59:59')
      : null;
    const cons = this.normalizeText(this.constructora);
    const proy = this.normalizeText(this.proyecto);
    const contrato = this.normalizeText(this.contrato);

    return rows.filter((row) => {
      if (q) {
        const blob = this.normalizeText(
          [
            row.consecutivo,
            row.constructora,
            row.proyecto,
            row.numero_contrato,
            row.descripcion_general,
            row.observaciones,
            row.disenador_encargado,
            row.planos_asignados,
          ].join(' ')
        );
        if (!blob.includes(q)) return false;
      }

      if (cons && this.normalizeText(row.constructora) !== cons) return false;
      if (proy && this.normalizeText(row.proyecto) !== proy) return false;
      if (contrato && this.normalizeText(row.numero_contrato) !== contrato) {
        return false;
      }

      const fechaRef = row.fecha_creacion || row.fecha_acta;
      if (fechaRef && (desde || hasta)) {
        const d = new Date(fechaRef);
        if (!isNaN(d.getTime())) {
          if (desde && d < desde) return false;
          if (hasta && d > hasta) return false;
        }
      }

      return true;
    });
  }

  onBuscar(): void {
    this.loading = true;
    this.contractsService
      .consultActasMedida({
        buscar: this.buscar?.trim() || null,
        constructora: this.constructora?.trim() || null,
        proyecto: this.proyecto?.trim() || null,
        contrato: this.contrato?.trim() || null,
        fecha_desde: this.formatDateParam(this.fechaDesde),
        fecha_hasta: this.formatDateParam(this.fechaHasta),
      })
      .subscribe({
        next: (res) => {
          this.allHeaders = this.enrichHeaders(
            res?.cabecera || [],
            res?.detalle || []
          );
          this.allDetalle = res?.detalle || [];
          // El SP ya filtra; enrich solo calcula fecha/tiempo
          this.results = this.allHeaders;
          this.loading = false;
        },
        error: (err) => {
          this.allHeaders = [];
          this.allDetalle = [];
          this.results = [];
          this.loading = false;
          Swal.fire(
            'Error',
            err?.error?.mensaje ||
              err?.error?.error ||
              'No se pudieron consultar los planos.',
            'error'
          );
        },
      });
  }

  onLimpiar(): void {
    this.buscar = '';
    this.fechaDesde = null;
    this.fechaHasta = null;
    this.contrato = null;
    this.constructora = '';
    this.proyecto = '';
    this.selectedConstructoraId = null;
    this.selectedProyectoId = null;
    this.proyectosOptions = [];
    this.results = [];
  }

  formatDateForDisplay(value: string | null | undefined): string {
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

  private itemsFor(consecutivo: string): ActaMedidaDetalle[] {
    return this.allDetalle.filter(
      (d) =>
        String(d.amd_consecutivo || '').trim() === String(consecutivo || '').trim()
    );
  }

  private openDetail(row: ActaMedidaHeader, edit: boolean): void {
    this.selectedHeader = row;
    this.selectedItems = this.itemsFor(row.consecutivo);
    this.editableHeader = { ...row };
    this.editableItems = this.selectedItems.map((i) => ({ ...i }));
    this.editMode = edit && !this.isAnulada(row);
    this.editFechaActa = this.parseToDate(row.fecha_acta);
    this.editFechaTerminacion = this.parseToDate(row.fecha_terminacion);
    this.syncEditConstructorayProyecto();
    this.syncEditDisenador();
    this.detailVisible = true;
  }

  private parseToDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    // Prefer YYYY-MM-DD to avoid timezone shifts
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

  onVer(row: ActaMedidaHeader): void {
    this.openDetail(row, false);
  }

  onEditar(row: ActaMedidaHeader): void {
    if (this.isAnulada(row)) {
      Swal.fire(
        'Anulado',
        'No se puede editar un plano anulado.',
        'warning'
      );
      return;
    }
    if (!this.puedeEditar) {
      Swal.fire(
        'Sin permiso',
        'Solo un administrador puede editar planos.',
        'warning'
      );
      return;
    }
    this.openDetail(row, true);
  }

  openRowMenu(event: Event, menu: { toggle: (e: Event) => void }, row: ActaMedidaHeader): void {
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

  onEliminar(row: ActaMedidaHeader): void {
    if (!this.puedeEditar) {
      Swal.fire(
        'Sin permiso',
        'Solo un administrador puede eliminar planos.',
        'warning'
      );
      return;
    }

    const consecutivo = String(row.consecutivo || '').trim();
    if (!consecutivo) {
      Swal.fire('Atención', 'No se encontró el consecutivo del acta.', 'warning');
      return;
    }

    Swal.fire({
      icon: 'warning',
      title: 'Eliminar plano',
      html: `
        <p>Se eliminará el plano / acta <strong>${consecutivo}</strong>.</p>
        <p>Esta operación es <strong>irreversible</strong>.</p>
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

      this.contractsService.deleteActaMedida(consecutivo).subscribe({
        next: (res) => {
          Swal.fire(
            'Eliminada',
            res?.mensaje ||
              `El Acta de Medida ${consecutivo} fue eliminada correctamente.`,
            'success'
          );
          this.onBuscar();
        },
        error: (err) => {
          Swal.fire(
            'Error',
            err?.error?.mensaje ||
              err?.error?.error ||
              'Ocurrió un error al eliminar el plano.',
            'error'
          );
        },
      });
    });
  }

  onAnular(row: ActaMedidaHeader): void {
    if (!this.puedeEditar) {
      Swal.fire(
        'Sin permiso',
        'Solo un administrador puede anular planos.',
        'warning'
      );
      return;
    }

    if (this.isAnulada(row)) {
      Swal.fire(
        'Ya anulada',
        'Este plano ya se encuentra anulado.',
        'info'
      );
      return;
    }

    const consecutivo = String(row.consecutivo || '').trim();
    if (!consecutivo) {
      Swal.fire('Atención', 'No se encontró el consecutivo del acta.', 'warning');
      return;
    }

    Swal.fire({
      icon: 'warning',
      title: 'Anular plano',
      html: `
        <p>Se anulará el plano / acta <strong>${consecutivo}</strong>.</p>
        <p>Una vez anulado <strong>no podrá editarse</strong>.</p>
        <p>¿Desea continuar?</p>
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

      this.contractsService.anularActaMedida(consecutivo).subscribe({
        next: (res) => {
          Swal.fire(
            'Anulada',
            res?.mensaje || `Acta ${consecutivo} anulada correctamente.`,
            'success'
          );
          this.onBuscar();
        },
        error: (err) => {
          Swal.fire(
            'Error',
            err?.error?.mensaje ||
              err?.error?.error ||
              'Ocurrió un error al anular el plano.',
            'error'
          );
        },
      });
    });
  }

  onCerrarDetalle(): void {
    this.detailVisible = false;
    this.editMode = false;
    this.saving = false;
    this.selectedHeader = null;
    this.selectedItems = [];
    this.editableHeader = null;
    this.editableItems = [];
    this.selectedEditConstructoraId = null;
    this.selectedEditProyectoId = null;
    this.selectedEditDisenadorId = null;
    this.editFechaActa = null;
    this.editFechaTerminacion = null;
    this.proyectosEditOptions = [];
  }

  private syncEditConstructorayProyecto(): void {
    if (!this.editableHeader) {
      this.selectedEditConstructoraId = null;
      this.selectedEditProyectoId = null;
      this.proyectosEditOptions = [];
      return;
    }

    const currentConstructora = this.normalizeText(
      this.editableHeader.constructora
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

  onConstructoraEditChange(id: string | null, resetProyecto = true): void {
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
            this.editableHeader?.proyecto
          );
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

  actualizarActa(): void {
    if (!this.editableHeader) return;
    if (this.isAnulada(this.editableHeader)) {
      Swal.fire(
        'Anulado',
        'No se puede editar un plano anulado.',
        'warning'
      );
      return;
    }
    if (!this.puedeEditar) {
      Swal.fire(
        'Sin permiso',
        'Solo un administrador puede actualizar planos.',
        'warning'
      );
      return;
    }

    const consecutivo = String(this.editableHeader.consecutivo || '').trim();
    if (!consecutivo) {
      Swal.fire('Atención', 'El consecutivo es obligatorio.', 'warning');
      return;
    }

    this.saving = true;
    Swal.fire({
      title: 'Actualizando...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(null),
    });

    const headerPayload: UpdateActaMedidaRequest = {
      consecutivo,
      actualizar_cabecera: true,
      actualizar_detalle: false,
      constructora: this.editableHeader.constructora ?? null,
      proyecto: this.editableHeader.proyecto ?? null,
      numero_contrato: this.editableHeader.numero_contrato ?? null,
      fecha_acta: this.formatDateParam(this.editFechaActa),
      fecha_terminacion: this.formatDateParam(this.editFechaTerminacion),
      observaciones: this.editableHeader.observaciones ?? null,
      tipo_documento: this.editableHeader.tipo_documento ?? null,
      descripcion_general: this.editableHeader.descripcion_general ?? null,
      id_disenador:
        this.selectedEditDisenadorId != null
          ? Number(this.selectedEditDisenadorId)
          : this.editableHeader.id_disenador != null
            ? Number(this.editableHeader.id_disenador)
            : null,
    };

    this.contractsService.updateActaMedida(headerPayload).subscribe({
      next: () => {
        const items = this.editableItems || [];
        if (!items.length) {
          this.saving = false;
          Swal.fire(
            'Actualizado',
            'El plano se actualizó correctamente.',
            'success'
          );
          this.onCerrarDetalle();
          this.onBuscar();
          return;
        }

        const detailRequests = items.map((it) => {
          const detailPayload: UpdateActaMedidaRequest = {
            consecutivo,
            actualizar_cabecera: false,
            actualizar_detalle: true,
            amd_id: it.amd_id != null ? Number(it.amd_id) : null,
            item: it.amd_item ?? null,
            detalle: it.amd_detalle ?? null,
            cantidad:
              it.amd_cantidad != null && it.amd_cantidad !== ''
                ? Number(it.amd_cantidad)
                : null,
            unidad_medida: it.amd_unidad_medida ?? null,
            ancho:
              it.amd_ancho != null && it.amd_ancho !== ''
                ? Number(it.amd_ancho)
                : null,
            alto:
              it.amd_alto != null && it.amd_alto !== ''
                ? Number(it.amd_alto)
                : null,
            observaciones_detalle: it.amd_observaciones ?? null,
            evidencia: it.amd_evidencia ?? null,
            consecutivo_item: it.amd_consecutivo_item ?? null,
            evidencia_item: it.amd_evidencia_item ?? null,
            fecha_enviado: it.amd_fecha_enviado ?? null,
            fecha_aprobado: it.amd_fecha_aprobado ?? null,
          };
          return this.contractsService.updateActaMedida(detailPayload);
        });

        forkJoin(detailRequests).subscribe({
          next: () => {
            this.saving = false;
            Swal.fire(
              'Actualizado',
              'El plano se actualizó correctamente.',
              'success'
            );
            this.onCerrarDetalle();
            this.onBuscar();
          },
          error: (err) => {
            this.saving = false;
            Swal.fire(
              'Error',
              err?.error?.mensaje ||
                'Ocurrió un error al actualizar el detalle del plano.',
              'error'
            );
          },
        });
      },
      error: (err) => {
        this.saving = false;
        Swal.fire(
          'Error',
          err?.error?.mensaje ||
            'Ocurrió un error al actualizar la cabecera del plano.',
          'error'
        );
      },
    });
  }

  evidenciaFileName(path: string | null | undefined): string {
    if (!path) return '';
    const parts = String(path).split(/[/\\]/);
    return parts[parts.length - 1] || path;
  }
}
