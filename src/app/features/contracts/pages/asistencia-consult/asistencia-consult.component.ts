import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextarea } from 'primeng/inputtextarea';
import { Menu, MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { MenuItem } from 'primeng/api';
import { jsPDF } from 'jspdf';
import { Router } from '@angular/router';

import { ContractsService } from '../../shared/service/contracts.service';
import { AsistenciaResponse } from '../../shared/interfaces/Response.interface';
import { UpdateAsistenciaRequest } from '../../shared/interfaces/Request.interface';
import {
  CatalogService,
  ConstructoraDto,
  ProyectoDto,
} from '../../../../shared/services/catalog.service';
import { GestionService } from '../../../gestion/shared/service/gestion.service';
import { GestionUser } from '../../../gestion/shared/interfaces/Response.interface';
import { buildFileUrl } from '../../../../core/file-url';
import Swal from 'sweetalert2';

interface TrabajadorOption {
  label: string;
  value: string | null;
}

@Component({
  selector: 'app-asistencia-consult',
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
    InputTextarea,
    MenuModule,
    TooltipModule,
  ],
  templateUrl: './asistencia-consult.component.html',
  styleUrls: ['./asistencia-consult.component.scss'],
})
export class AsistenciaConsultComponent implements OnInit {
  @ViewChild('rowMenu') rowMenu?: Menu;

  buscar = '';
  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;
  trabajadorFiltro: string | null = null;
  trabajadorOptions: TrabajadorOption[] = [{ label: 'Todos', value: null }];

  constructorasOptions: { label: string; value: string }[] = [];
  proyectosOptions: { label: string; value: string }[] = [];
  selectedConstructoraId: string | null = null;
  selectedProyectoId: string | null = null;

  constructorasEditOptions: { label: string; value: string }[] = [];
  proyectosEditOptions: { label: string; value: string }[] = [];
  selectedEditConstructoraId: string | null = null;
  selectedEditProyectoId: string | null = null;

  results: AsistenciaResponse[] = [];
  loading = false;

  rowsPerPage = 10;
  rowsPerPageOptions = [10, 25, 50, 100];

  detailVisible = false;
  modoEdicion = false;
  selectedRow: AsistenciaResponse | null = null;
  editable: AsistenciaResponse | null = null;
  rowMenuItems: MenuItem[] = [];

  get puedeEditar(): boolean {
    return Number(localStorage.getItem('id_perfil')) === 1;
  }

  constructor(
    private contractsService: ContractsService,
    private catalogService: CatalogService,
    private gestionService: GestionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadConstructorasCatalog();
    this.loadUsuariosOrdenTrabajo();
    this.onBuscar();
  }

  private normalizeText(value: unknown): string {
    return String(value ?? '')
      .trim()
      .toLowerCase();
  }

  esSinSalida(row: AsistenciaResponse | null | undefined): boolean {
    if (!row) return false;
    if (row.sin_salida) return true;
    const estado = String(row.estado_visita || '').toUpperCase();
    if (estado === 'CERRADA' || estado === 'ANULADA') return false;
    return !String(row.hora_fin || '').trim() || estado === 'ABIERTA';
  }

  formatFechaCorta(row: AsistenciaResponse): string {
    const raw =
      String(row.fecha || '').trim() ||
      String(row.hora_inicio || '').trim().slice(0, 10);
    if (!raw) return '—';
    const d = new Date(raw.includes('T') || raw.includes(' ') ? raw.replace(' ', 'T') : `${raw}T12:00:00`);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'numeric',
      year: '2-digit',
    });
  }

  formatHora(value: string | null | undefined): string {
    const raw = String(value || '').trim();
    if (!raw) return '—';
    // `YYYY-MM-DD HH:mm:ss` or ISO
    const m = raw.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
    if (!m) return raw;
    let h = Number(m[1]);
    const min = m[2];
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${min}${ampm}`;
  }

  private loadUsuariosOrdenTrabajo(): void {
    this.gestionService.getAllUsers().subscribe({
      next: (res) => {
        const list = res.data || [];
        const mapped = list.map((u: GestionUser) => {
          const nombreCompleto = `${u.nombre ?? ''} ${u.apellido ?? ''}`.trim();
          return {
            label: `${nombreCompleto} — ${u.perfil}`,
            value: nombreCompleto,
          };
        });
        this.trabajadorOptions = [{ label: 'Todos', value: null }, ...mapped];
      },
      error: () => {
        this.trabajadorOptions = [{ label: 'Todos', value: null }];
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
        if (this.detailVisible && this.editable) {
          this.syncEditConstructoraYProyecto();
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

  constructoraNombreFiltro(): string {
    return (
      this.constructorasOptions.find((c) => c.value === this.selectedConstructoraId)
        ?.label ?? ''
    );
  }

  proyectoNombreFiltro(): string {
    return (
      this.proyectosOptions.find((p) => p.value === this.selectedProyectoId)?.label ??
      ''
    );
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

  private syncEditConstructoraYProyecto(): void {
    if (!this.editable) {
      this.selectedEditConstructoraId = null;
      this.selectedEditProyectoId = null;
      this.proyectosEditOptions = [];
      return;
    }

    const currentConstructora = this.normalizeText(this.editable.constructora);
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

    if (!this.editable) return;

    if (!id) {
      this.editable.constructora = '';
      this.editable.proyecto = '';
      return;
    }

    const cons = this.constructorasEditOptions.find((c) => c.value === id);
    this.editable.constructora = cons?.label ?? '';

    this.catalogService.getProyectosByConstructora(id).subscribe({
      next: (list: ProyectoDto[]) => {
        this.proyectosEditOptions = list.map((p) => ({
          label: p.nombre,
          value: String(p.id),
        }));

        if (!resetProyecto) {
          const currentProyecto = this.normalizeText(this.editable!.proyecto);
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
    if (!this.editable) return;
    this.editable.proyecto =
      this.proyectosEditOptions.find((p) => p.value === id)?.label ?? '';
  }

  onBuscar(): void {
    this.loading = true;
    this.contractsService
      .consultAsistencia({
        buscar: this.buscar?.trim() || null,
        fecha_desde: this.formatDate(this.fechaDesde),
        fecha_hasta: this.formatDate(this.fechaHasta),
        trabajador: this.trabajadorFiltro,
        constructora: this.constructoraNombreFiltro()?.trim() || null,
        proyecto: this.proyectoNombreFiltro()?.trim() || null,
      })
      .subscribe({
        next: (res) => {
          this.results = res.data || [];
          this.loading = false;
        },
        error: () => {
          this.results = [];
          this.loading = false;
        },
      });
  }

  onLimpiar(): void {
    this.buscar = '';
    this.fechaDesde = null;
    this.fechaHasta = null;
    this.trabajadorFiltro = null;
    this.selectedConstructoraId = null;
    this.selectedProyectoId = null;
    this.proyectosOptions = [];
    this.onBuscar();
  }

  fotoUrl(path: string | null | undefined): string | null {
    return buildFileUrl(path);
  }

  onVisualizar(row: AsistenciaResponse): void {
    this.selectedRow = row;
    this.editable = { ...row };
    this.modoEdicion = false;
    this.syncEditConstructoraYProyecto();
    this.detailVisible = true;
  }

  onEditar(row: AsistenciaResponse): void {
    if (!this.puedeEditar) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin permiso',
        text: 'Solo un administrador puede editar asistencias.',
        confirmButtonColor: '#20506A',
      });
      return;
    }
    this.selectedRow = row;
    this.editable = { ...row };
    this.modoEdicion = true;
    this.syncEditConstructoraYProyecto();
    this.detailVisible = true;
  }

  openRowMenu(event: Event, row: AsistenciaResponse): void {
    this.rowMenuItems = [
      {
        label: 'Visualizar',
        icon: 'pi pi-eye',
        command: () => this.onVisualizar(row),
      },
      {
        label: 'Editar',
        icon: 'pi pi-pencil',
        disabled: !this.puedeEditar,
        command: () => this.onEditar(row),
      },
      {
        label: 'Continuar visita',
        icon: 'pi pi-play',
        visible: this.esSinSalida(row),
        command: () =>
          this.router.navigate(['/dashboard/contracts/asistencia-nuevo']),
      },
      { separator: true },
      {
        label: 'Anular',
        icon: 'pi pi-ban',
        disabled: !this.puedeEditar,
        command: () => this.anular(row),
      },
      {
        label: 'Eliminar',
        icon: 'pi pi-trash',
        disabled: !this.puedeEditar,
        command: () => this.eliminar(row),
      },
    ];
    this.rowMenu?.toggle(event);
  }

  onCerrarDetalle(): void {
    this.detailVisible = false;
    this.modoEdicion = false;
    this.selectedRow = null;
    this.editable = null;
    this.selectedEditConstructoraId = null;
    this.selectedEditProyectoId = null;
  }

  private buildCamposPayload(
    h: AsistenciaResponse
  ): { nombre: string; valor: string }[] {
    const v = (x: string | null | undefined) => String(x ?? '');
    return [
      { nombre: 'consecutivo', valor: v(h.consecutivo) },
      { nombre: 'constructora', valor: v(h.constructora) },
      { nombre: 'proyecto', valor: v(h.proyecto) },
      { nombre: 'ubicacion', valor: v(h.ubicacion) },
      { nombre: 'detalle_visita', valor: v(h.detalle_visita) },
      { nombre: 'foto1', valor: v(h.foto1) },
      { nombre: 'fecha', valor: v(h.fecha) },
      { nombre: 'trabajador', valor: v(h.trabajador) },
      { nombre: 'cargo', valor: v(h.cargo) },
      { nombre: 'hora_inicio', valor: v(h.hora_inicio) },
      { nombre: 'hora_fin', valor: v(h.hora_fin) },
      { nombre: 'estado_visita', valor: v(h.estado_visita) },
    ];
  }

  actualizar(): void {
    if (!this.editable) return;
    if (!this.puedeEditar) {
      Swal.fire(
        'Sin permiso',
        'Solo un administrador puede actualizar asistencias.',
        'warning'
      );
      return;
    }

    const numerodoc = String(this.editable.numerodoc ?? '').trim();
    if (!numerodoc) return;

    const payload: UpdateAsistenciaRequest = {
      numerodoc,
      campos: this.buildCamposPayload(this.editable),
    };

    this.contractsService.updateAsistencia(payload).subscribe({
      next: () => {
        this.onCerrarDetalle();
        this.onBuscar();
        Swal.fire({
          icon: 'success',
          title: 'Actualizado',
          text: 'La asistencia se actualizó correctamente.',
          confirmButtonColor: '#20506A',
        });
      },
      error: (err) => {
        const msg =
          err?.error?.error ||
          err?.error?.message ||
          'Ocurrió un error al actualizar la asistencia.';
        Swal.fire('Error', msg, 'error');
      },
    });
  }

  anular(row: AsistenciaResponse): void {
    if (!this.puedeEditar) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin permiso',
        text: 'Solo un administrador puede anular asistencias.',
        confirmButtonColor: '#20506A',
      });
      return;
    }
    const doc = String(row.numerodoc || row.consecutivo || '').trim();
    Swal.fire({
      title: '¿Anular asistencia?',
      html: `Se anulará <strong>${row.consecutivo || doc}</strong>.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.contractsService.anularAsistencia(doc).subscribe({
        next: () => {
          this.onBuscar();
          Swal.fire({
            icon: 'success',
            title: 'Anulada',
            text: 'Asistencia anulada correctamente.',
            confirmButtonColor: '#20506A',
          });
        },
        error: (err) => {
          Swal.fire(
            'Error',
            err?.error?.error || 'No se pudo anular.',
            'error'
          );
        },
      });
    });
  }

  eliminar(row: AsistenciaResponse): void {
    if (!this.puedeEditar) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin permiso',
        text: 'Solo un administrador puede eliminar asistencias.',
        confirmButtonColor: '#20506A',
      });
      return;
    }
    const doc = String(row.numerodoc || row.consecutivo || '').trim();
    Swal.fire({
      title: '¿Eliminar asistencia?',
      html: `Se eliminará permanentemente <strong>${row.consecutivo || doc}</strong>.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.contractsService.deleteAsistencia(doc).subscribe({
        next: () => {
          this.onBuscar();
          Swal.fire({
            icon: 'success',
            title: 'Eliminada',
            text: 'Asistencia eliminada correctamente.',
            confirmButtonColor: '#20506A',
          });
        },
        error: (err) => {
          Swal.fire(
            'Error',
            err?.error?.error || 'No se pudo eliminar.',
            'error'
          );
        },
      });
    });
  }

  descargarPdf(): void {
    const h = this.selectedRow || this.editable;
    if (!h) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    let y = 14;

    doc.setFontSize(14);
    doc.text('Asistencia', pageW / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(10);
    const lx = 14;
    const vx = 58;
    const salida = this.esSinSalida(h)
      ? 'No registra'
      : this.formatHora(h.hora_fin);
    const lines: [string, string][] = [
      ['Consecutivo', String(h.consecutivo ?? h.numerodoc ?? '')],
      ['Fecha', this.formatFechaCorta(h)],
      ['Trabajador', String(h.trabajador ?? '')],
      ['Identificación', String(h.identificacion ?? '')],
      ['Cargo', String(h.cargo ?? '')],
      ['Constructora', String(h.constructora ?? '')],
      ['Proyecto', String(h.proyecto ?? '')],
      ['Hora entrada', this.formatHora(h.hora_inicio)],
      ['Hora salida', salida],
      ['Ubicación', String(h.ubicacion ?? '').substring(0, 90)],
      ['Detalle', String(h.detalle_visita ?? '').substring(0, 120)],
    ];

    lines.forEach(([label, val]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label + ':', lx, y);
      doc.setFont('helvetica', 'normal');
      doc.text(val, vx, y);
      y += 6;
    });

    const fileName = `asistencia-${(h.numerodoc || h.consecutivo || 'doc').replace(/\s/g, '-')}.pdf`;
    doc.save(fileName);
  }
}
