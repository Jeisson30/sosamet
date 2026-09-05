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

import { BASE_URL } from '../../../../../core/url-constants';
import { GestionService } from '../../../shared/service/gestion.service';
import {
  Company,
  EjecucionCorteConsultRow,
  GestionUser,
  TrazabilidadOtActa,
  TrazabilidadOtCabecera,
  TrazabilidadOtItem,
  UpdateEjecucionCorteRequest,
} from '../../../shared/interfaces/Response.interface';

@Component({
  selector: 'app-consult-ejecucion-cortes',
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
  templateUrl: './consult-ejecucion-cortes.component.html',
  styleUrls: ['./consult-ejecucion-cortes.component.scss'],
})
export class ConsultEjecucionCortesComponent implements OnInit {
  buscar = '';
  encargadoId: number | null = null;
  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;

  workUsers: GestionUser[] = [];
  companies: Company[] = [];
  companiesActivas: Company[] = [];

  results: EjecucionCorteConsultRow[] = [];
  loading = false;
  saving = false;

  rowsPerPage = 10;
  rowsPerPageOptions = [10, 25, 50, 100];
  veTodas = false;

  viewVisible = false;
  viewLoading = false;
  selectedRow: EjecucionCorteConsultRow | null = null;
  trazabilidadCabecera: TrazabilidadOtCabecera | null = null;
  trazabilidadItems: TrazabilidadOtItem[] = [];
  trazabilidadActas: TrazabilidadOtActa[] = [];

  editVisible = false;
  editRow: EjecucionCorteConsultRow | null = null;
  editTipoCorte: string | null = null;
  editEmpresaId: number | null = null;
  editEncargadoId: number | null = null;
  editObservaciones = '';

  rowMenuItems: MenuItem[] = [];
  private menuRow: EjecucionCorteConsultRow | null = null;

  readonly tipoCorteOptions = [
    { label: 'FABRICACIÓN', value: 'FABRICACIÓN' },
    { label: 'INSTALACIÓN', value: 'INSTALACIÓN' },
    { label: 'PINTURA', value: 'PINTURA' },
  ];

  private readonly filesBaseUrl = BASE_URL.replace(/\/api\/?$/, '');
  private readonly idPerfil = Number(localStorage.getItem('id_perfil') || 0);

  get puedeEditar(): boolean {
    return this.idPerfil === 1;
  }

  constructor(private gestionService: GestionService) {}

  ngOnInit(): void {
    this.veTodas = this.calcVeTodasLocal();
    this.loadWorkUsers();
    this.loadCompanies();
    this.onBuscar();
  }

  private calcVeTodasLocal(): boolean {
    return [1, 2, 4, 10].includes(this.idPerfil);
  }

  private formatDateParam(date: Date | null): string | null {
    if (!date) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private loadWorkUsers(): void {
    this.gestionService.getAllUsers().subscribe({
      next: (res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.workUsers = list
          .filter((u) => String(u.estado || '').toUpperCase() === 'ACTIVO')
          .map((u) => ({
            ...u,
            displayName: `${u.nombre} ${u.apellido} - ${u.perfil}`,
          }));
      },
      error: () => {
        this.workUsers = [];
      },
    });
  }

  private loadCompanies(): void {
    this.gestionService.getCompanies().subscribe({
      next: (list) => {
        const all = Array.isArray(list) ? list : [];
        this.companies = all;
        this.companiesActivas = all.filter((c) => Number(c.estado) === 1);
      },
      error: () => {
        this.companies = [];
        this.companiesActivas = [];
      },
    });
  }

  onBuscar(): void {
    this.loading = true;
    this.gestionService
      .consultEjecucionesCorte({
        buscar: this.buscar?.trim() || null,
        encargado_id: this.veTodas ? this.encargadoId : null,
        fecha_desde: this.formatDateParam(this.fechaDesde),
        fecha_hasta: this.formatDateParam(this.fechaHasta),
      })
      .subscribe({
        next: (res) => {
          this.veTodas =
            typeof res?.ve_todas === 'boolean'
              ? res.ve_todas
              : this.calcVeTodasLocal();
          const items = Array.isArray(res?.items) ? res.items : [];
          this.results = this.sortByRecent(items);
          this.loading = false;
        },
        error: (err) => {
          this.results = [];
          this.loading = false;
          Swal.fire({
            title: 'Error',
            text:
              err?.error?.Mensaje ||
              err?.error?.mensaje ||
              'No se pudieron consultar las ejecuciones de corte.',
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
    this.onBuscar();
  }

  private sortByRecent(
    items: EjecucionCorteConsultRow[]
  ): EjecucionCorteConsultRow[] {
    return [...items].sort((a, b) => {
      const da =
        this.parseToDate(a.fecha_terminada)?.getTime() ||
        this.parseToDate(a.fecha_creacion)?.getTime() ||
        0;
      const db =
        this.parseToDate(b.fecha_terminada)?.getTime() ||
        this.parseToDate(b.fecha_creacion)?.getTime() ||
        0;
      return db - da;
    });
  }

  consecutivoDisplay(row: EjecucionCorteConsultRow): string {
    const corte = String(row.consecutivo_corte || '').trim();
    if (corte) return corte;
    return String(row.consecutivo_ot || '').trim() || '—';
  }

  esPendienteSinEjecucion(row: EjecucionCorteConsultRow): boolean {
    return !row.consecutivo_corte || row.id_ejecucion == null;
  }

  estadoLabel(row: EjecucionCorteConsultRow): string {
    if (row.estado_label) return String(row.estado_label);
    const e = Number(row.estado);
    if (e === 3) return 'Anulado';
    if (e === 2) return 'Completado';
    return 'Pendiente';
  }

  estadoClass(row: EjecucionCorteConsultRow): string {
    const e = Number(row.estado);
    if (e === 3) return 'ecc-badge-anulado';
    if (e === 2) return 'ecc-badge-completado';
    return 'ecc-badge-pendiente';
  }

  isAnulado(row: EjecucionCorteConsultRow | null | undefined): boolean {
    return Number(row?.estado) === 3;
  }

  puedeMostrarAcciones(row: EjecucionCorteConsultRow): boolean {
    return (
      this.puedeEditar &&
      row.id_ejecucion != null &&
      !this.isAnulado(row)
    );
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
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  onVer(row: EjecucionCorteConsultRow): void {
    const id = Number(row.id_order_work);
    if (!id) return;

    this.selectedRow = row;
    this.viewVisible = true;
    this.viewLoading = true;
    this.trazabilidadCabecera = null;
    this.trazabilidadItems = [];
    this.trazabilidadActas = [];

    this.gestionService.consultTrazabilidadOt(id).subscribe({
      next: (res) => {
        this.viewLoading = false;
        if (Number(res?.Codigo) !== 1) {
          Swal.fire({
            icon: 'warning',
            title: 'Visualizar',
            text: res?.Mensaje || 'No se encontró trazabilidad para esta OT.',
            confirmButtonColor: '#20506A',
          });
        }
        this.trazabilidadCabecera = res?.cabecera || null;
        this.trazabilidadItems = Array.isArray(res?.items) ? res.items : [];
        this.trazabilidadActas = Array.isArray(res?.actas) ? res.actas : [];
      },
      error: (err) => {
        this.viewLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'Visualizar',
          text:
            err?.error?.Mensaje ||
            err?.error?.mensaje ||
            'No se pudo cargar la trazabilidad.',
          confirmButtonColor: '#20506A',
        });
      },
    });
  }

  onCerrarVista(): void {
    this.viewVisible = false;
    this.viewLoading = false;
    this.selectedRow = null;
    this.trazabilidadCabecera = null;
    this.trazabilidadItems = [];
    this.trazabilidadActas = [];
  }

  onEditar(row: EjecucionCorteConsultRow): void {
    if (!this.puedeEditar) {
      Swal.fire({
        title: 'Sin permiso',
        text: 'Solo un administrador puede editar ejecuciones.',
        icon: 'warning',
        confirmButtonColor: '#20506A',
      });
      return;
    }
    if (row.id_ejecucion == null) {
      Swal.fire({
        title: 'Sin ejecución',
        text: 'Este registro aún no tiene ejecución asociada (pendiente de finalizar).',
        icon: 'info',
        confirmButtonColor: '#20506A',
      });
      return;
    }
    if (this.isAnulado(row)) {
      Swal.fire({
        title: 'Anulado',
        text: 'No se puede editar un corte anulado.',
        icon: 'warning',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    this.editRow = row;
    this.editTipoCorte = row.tipo_corte || null;
    this.editEmpresaId = row.empresa_asociada_id ?? null;
    this.editEncargadoId = row.encargado_id ?? null;
    this.editObservaciones = row.observaciones || '';
    this.editVisible = true;
  }

  onCerrarEditar(): void {
    this.editVisible = false;
    this.saving = false;
    this.editRow = null;
    this.editTipoCorte = null;
    this.editEmpresaId = null;
    this.editEncargadoId = null;
    this.editObservaciones = '';
  }

  guardarEdicion(): void {
    if (!this.editRow?.id_ejecucion) return;
    if (!this.puedeEditar) return;

    if (!this.editTipoCorte || !this.editEmpresaId || !this.editEncargadoId) {
      Swal.fire({
        title: 'Validación',
        text: 'Complete tipo de corte, empresa y encargado.',
        icon: 'warning',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    const payload: UpdateEjecucionCorteRequest = {
      id_ejecucion: Number(this.editRow.id_ejecucion),
      empresa_asociada_id: Number(this.editEmpresaId),
      encargado_id: Number(this.editEncargadoId),
      tipo_corte: this.editTipoCorte,
      observaciones: this.editObservaciones?.trim() || null,
    };

    this.saving = true;
    Swal.fire({
      title: 'Actualizando…',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(null),
    });

    this.gestionService.updateEjecucionCorte(payload).subscribe({
      next: (res) => {
        this.saving = false;
        Swal.fire({
          title: 'Actualizado',
          text: res?.Mensaje || 'El corte se actualizó correctamente.',
          icon: 'success',
          confirmButtonColor: '#20506A',
        });
        this.onCerrarEditar();
        this.onBuscar();
      },
      error: (err) => {
        this.saving = false;
        Swal.fire({
          title: 'Error',
          text:
            err?.error?.Mensaje ||
            err?.error?.mensaje ||
            'No se pudo actualizar el corte.',
          icon: 'error',
          confirmButtonColor: '#20506A',
        });
      },
    });
  }

  openRowMenu(
    event: Event,
    menu: { toggle: (e: Event) => void },
    row: EjecucionCorteConsultRow
  ): void {
    if (!this.puedeMostrarAcciones(row)) return;
    this.menuRow = row;
    const puede = this.puedeEditar;
    this.rowMenuItems = [
      {
        label: 'Editar',
        icon: 'pi pi-pencil',
        disabled: !puede,
        command: () => this.menuRow && this.onEditar(this.menuRow),
      },
      {
        label: 'Eliminar',
        icon: 'pi pi-trash',
        disabled: !puede,
        command: () => this.menuRow && this.onEliminar(this.menuRow),
      },
      {
        label: 'Anular',
        icon: 'pi pi-ban',
        disabled: !puede,
        command: () => this.menuRow && this.onAnular(this.menuRow),
      },
    ];
    menu.toggle(event);
  }

  onEliminar(row: EjecucionCorteConsultRow): void {
    if (!this.puedeEditar) return;
    const id = Number(row.id_ejecucion);
    if (!id) return;
    const consecutivo = this.consecutivoDisplay(row);

    Swal.fire({
      icon: 'warning',
      title: 'Eliminar ejecución',
      html: `<p>Se eliminará el corte <strong>${consecutivo}</strong>.</p>
             <p>La OT volverá a pendiente. Operación irreversible.</p>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c0392b',
      cancelButtonColor: '#6c757d',
      reverseButtons: true,
    }).then((r) => {
      if (!r.isConfirmed) return;
      Swal.fire({
        title: 'Eliminando…',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(null),
      });
      this.gestionService.deleteEjecucionCorte(id).subscribe({
        next: (res) => {
          Swal.fire({
            title: 'Eliminado',
            text: res?.Mensaje || `El corte ${consecutivo} fue eliminado.`,
            icon: 'success',
            confirmButtonColor: '#20506A',
          });
          this.onBuscar();
        },
        error: (err) => {
          Swal.fire({
            title: 'Error',
            text:
              err?.error?.Mensaje ||
              err?.error?.mensaje ||
              'No se pudo eliminar.',
            icon: 'error',
            confirmButtonColor: '#20506A',
          });
        },
      });
    });
  }

  onAnular(row: EjecucionCorteConsultRow): void {
    if (!this.puedeEditar) return;
    if (this.isAnulado(row)) return;
    const id = Number(row.id_ejecucion);
    if (!id) return;
    const consecutivo = this.consecutivoDisplay(row);

    Swal.fire({
      icon: 'warning',
      title: 'Anular ejecución',
      html: `<p>Se anulará el corte <strong>${consecutivo}</strong>.</p>
             <p>Una vez anulado no podrá editarse.</p>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c0392b',
      cancelButtonColor: '#6c757d',
      reverseButtons: true,
    }).then((r) => {
      if (!r.isConfirmed) return;
      Swal.fire({
        title: 'Anulando…',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(null),
      });
      this.gestionService.anularEjecucionCorte(id).subscribe({
        next: (res) => {
          Swal.fire({
            title: 'Anulado',
            text: res?.Mensaje || `El corte ${consecutivo} fue anulado.`,
            icon: 'success',
            confirmButtonColor: '#20506A',
          });
          this.onBuscar();
        },
        error: (err) => {
          Swal.fire({
            title: 'Error',
            text:
              err?.error?.Mensaje ||
              err?.error?.mensaje ||
              'No se pudo anular.',
            icon: 'error',
            confirmButtonColor: '#20506A',
          });
        },
      });
    });
  }

  fileUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    const clean = String(path).replace(/\\/g, '/').replace(/^\/+/, '');
    if (/^https?:\/\//i.test(clean)) return clean;
    return `${this.filesBaseUrl}/${clean}`;
  }

  esItemCompletado(estado: number | string | null | undefined): boolean {
    return Number(estado) === 2;
  }
}
