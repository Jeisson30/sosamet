import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import Swal from 'sweetalert2';
import { firstValueFrom } from 'rxjs';

import { OtroSiService } from '../../shared/service/otro-si.service';
import {
  ESTADO_OTROSI_OPTIONS,
  OtroSiConsultaRow,
  OtroSiDetalleResponse,
  TIPO_OTROSI_OPTIONS,
  labelTipoOtroSi,
  toIsoDate,
} from '../../shared/otro-si.model';

const COLOR_SWAL = '#20506A';

const esc = (v: unknown): string =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

interface Opcion {
  label: string;
  value: string;
}

const distintos = (valores: (string | null | undefined)[]): Opcion[] =>
  [...new Set(valores.map((v) => String(v || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es'))
    .map((v) => ({ label: v, value: v }));

@Component({
  selector: 'app-otro-si-consulta',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    CalendarModule,
    TableModule,
    DialogModule,
    MenuModule,
  ],
  templateUrl: './otro-si-consulta.component.html',
  styleUrls: ['./otro-si-consulta.component.scss'],
})
export class OtroSiConsultaComponent implements OnInit {
  readonly tipoOptions = TIPO_OTROSI_OPTIONS.map((t) => ({ label: t.label, value: t.value }));
  readonly estadoOptions = ESTADO_OTROSI_OPTIONS;
  readonly labelTipo = labelTipoOtroSi;

  buscarTexto = '';
  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;
  constructora: string | null = null;
  proyecto: string | null = null;
  tipo: string | null = null;
  estado: string | null = null;

  rowMenuItems: MenuItem[] = [];
  procesando = false;

  /** Constructora / proyecto de todos los Otros Sí (listas de los filtros). */
  private universo: OtroSiConsultaRow[] = [];
  rows: OtroSiConsultaRow[] = [];
  loading = false;

  showDetalle = false;
  detalle: OtroSiDetalleResponse | null = null;
  loadingDetalle = false;

  constructor(private otroSiService: OtroSiService, private router: Router) {}

  ngOnInit(): void {
    this.consultar(true);
  }

  get constructoraOptions(): Opcion[] {
    return distintos(this.universo.map((r) => r.constructora));
  }

  get proyectoOptions(): Opcion[] {
    return distintos(
      this.universo
        .filter((r) => !this.constructora || r.constructora === this.constructora)
        .map((r) => r.proyecto)
    );
  }

  onConstructoraChange(): void {
    this.proyecto = null;
  }

  consultar(inicial = false): void {
    if (this.fechaDesde && this.fechaHasta && this.fechaDesde > this.fechaHasta) {
      Swal.fire({ icon: 'warning', title: 'Fechas', text: 'La fecha "Desde" no puede ser mayor que "Hasta".', confirmButtonColor: COLOR_SWAL });
      return;
    }
    this.loading = true;
    this.otroSiService
      .listar({
        buscar: this.buscarTexto,
        constructora: this.constructora,
        proyecto: this.proyecto,
        tipo: this.tipo,
        estado: this.estado,
        fecha_desde: toIsoDate(this.fechaDesde),
        fecha_hasta: toIsoDate(this.fechaHasta),
      })
      .subscribe({
        next: (rows) => {
          this.rows = rows;
          if (inicial) this.universo = rows;
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.mensaje || 'No se pudieron consultar los Otros Sí.',
            confirmButtonColor: COLOR_SWAL,
          });
        },
      });
  }

  limpiar(): void {
    this.buscarTexto = '';
    this.fechaDesde = null;
    this.fechaHasta = null;
    this.constructora = null;
    this.proyecto = null;
    this.tipo = null;
    this.estado = null;
    this.consultar(true);
  }

  visualizar(row: OtroSiConsultaRow): void {
    this.detalle = null;
    this.showDetalle = true;
    this.loadingDetalle = true;
    this.otroSiService.detalle(row.id_otrosi).subscribe({
      next: (d) => {
        this.detalle = d;
        this.loadingDetalle = false;
      },
      error: (err) => {
        this.loadingDetalle = false;
        this.showDetalle = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.mensaje || 'No se pudo cargar el Otro Sí.',
          confirmButtonColor: COLOR_SWAL,
        });
      },
    });
  }

  aplicaFecha(tipo: string | null | undefined): boolean {
    return tipo === 'FECHA' || tipo === 'AMBOS';
  }

  aplicaCantidades(tipo: string | null | undefined): boolean {
    return tipo === 'CANTIDAD' || tipo === 'AMBOS';
  }

  // ===================== Editar / Anular / Eliminar (solo ADMIN) =====================

  get puedeGestionar(): boolean {
    return Number(localStorage.getItem('id_perfil')) === 1;
  }

  esAnulado(row: { estado: string }): boolean {
    return row.estado === 'ANULADO';
  }

  private contratoActivo(row: OtroSiConsultaRow): boolean {
    return String(row.estado_contrato || 'Activo').trim().toUpperCase() === 'ACTIVO';
  }

  /** Motivo por el que no se puede editar / anular (null = sí se puede). */
  private bloqueoModificar(row: OtroSiConsultaRow): string | null {
    if (this.esAnulado(row)) return 'El Otro Sí está anulado.';
    if (!row.es_ultimo) return 'Solo el último Otro Sí activo del contrato.';
    if (!this.contratoActivo(row)) return `El contrato está ${row.estado_contrato}.`;
    return null;
  }

  openRowMenu(event: Event, menu: Menu, row: OtroSiConsultaRow): void {
    const bloqueo = this.bloqueoModificar(row);
    const bloqueoEliminar = this.esAnulado(row) ? null : bloqueo;
    this.rowMenuItems = [
      { label: 'Editar', icon: 'pi pi-pencil', disabled: !!bloqueo, title: bloqueo ?? '', command: () => this.editar(row) },
      { label: 'Anular', icon: 'pi pi-ban', disabled: !!bloqueo, title: bloqueo ?? '', command: () => this.anular(row) },
      {
        label: 'Eliminar',
        icon: 'pi pi-trash',
        disabled: !!bloqueoEliminar,
        title: bloqueoEliminar ?? '',
        command: () => this.eliminar(row),
      },
    ];
    menu.toggle(event);
  }

  /** Aviso si ítems del Otro Sí ya tienen actas de medida (no bloquea). */
  private async avisoActas(row: OtroSiConsultaRow): Promise<string | null> {
    try {
      const d = await firstValueFrom(this.otroSiService.detalle(row.id_otrosi));
      return d.items_con_actas?.length
        ? `<p><b>Atención:</b> los ítems <b>${esc(d.items_con_actas.join(', '))}</b> ya tienen actas de medida registradas.</p>`
        : '';
    } catch (err) {
      this.alertaError('No se pudo cargar el Otro Sí.', err);
      return null;
    }
  }

  async editar(row: OtroSiConsultaRow): Promise<void> {
    const aviso = await this.avisoActas(row);
    if (aviso === null) return;
    if (aviso) {
      const r = await Swal.fire({
        icon: 'warning',
        title: 'Editar Otro Sí',
        html: `${aviso}<p>¿Desea continuar con la edición?</p>`,
        showCancelButton: true,
        confirmButtonText: 'Sí, editar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: COLOR_SWAL,
      });
      if (!r.isConfirmed) return;
    }
    this.router.navigate(['/dashboard/contracts/otro-si/editar', row.id_otrosi]);
  }

  async anular(row: OtroSiConsultaRow): Promise<void> {
    const aviso = await this.avisoActas(row);
    if (aviso === null) return;
    const r = await Swal.fire({
      icon: 'warning',
      title: 'Anular Otro Sí',
      html: `
        <p>Se anulará el Otro Sí N° <strong>${row.consecutivo}</strong> (${esc(row.no_documento)}) del contrato <strong>${esc(row.numerodoc)}</strong>.</p>
        <p>Se reversarán sus cambios en el contrato (fecha fin, cantidades, ítems nuevos y valor). El registro permanecerá visible como anulado.</p>
        ${aviso}`,
      input: 'textarea',
      inputLabel: 'Motivo de la anulación',
      inputPlaceholder: 'Digite el motivo…',
      inputAttributes: { maxlength: '500' },
      inputValidator: (v) => (!String(v || '').trim() ? 'Digite el motivo de la anulación.' : null),
      showCancelButton: true,
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: COLOR_SWAL,
    });
    if (!r.isConfirmed) return;

    this.procesando = true;
    this.otroSiService.anular(row.id_otrosi, String(r.value).trim()).subscribe({
      next: (res) => this.exitoAccion('Otro Sí anulado', res.mensaje),
      error: (err) => this.errorAccion('No se pudo anular el Otro Sí.', err),
    });
  }

  async eliminar(row: OtroSiConsultaRow): Promise<void> {
    const anulado = this.esAnulado(row);
    const aviso = anulado ? '' : await this.avisoActas(row);
    if (aviso === null) return;
    const r = await Swal.fire({
      icon: 'warning',
      title: 'Eliminar Otro Sí',
      html: `
        <p>Se eliminará el Otro Sí N° <strong>${row.consecutivo}</strong> (${esc(row.no_documento)}) del contrato <strong>${esc(row.numerodoc)}</strong>.</p>
        <p>${anulado
          ? 'Está anulado: sus cambios ya se reversaron; solo se borrará el registro.'
          : 'Se reversarán sus cambios en el contrato y se borrará el registro con su detalle.'}</p>
        ${aviso}
        <p>Esta operación es <strong>irreversible</strong>. ¿Está seguro de continuar?</p>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: COLOR_SWAL,
    });
    if (!r.isConfirmed) return;

    this.procesando = true;
    this.otroSiService.eliminar(row.id_otrosi).subscribe({
      next: (res) => this.exitoAccion('Otro Sí eliminado', res.mensaje),
      error: (err) => this.errorAccion('No se pudo eliminar el Otro Sí.', err),
    });
  }

  private exitoAccion(titulo: string, mensaje: string): void {
    this.procesando = false;
    Swal.fire({ icon: 'success', title: titulo, text: mensaje, confirmButtonColor: COLOR_SWAL });
    this.consultar();
  }

  private errorAccion(texto: string, err: unknown): void {
    this.procesando = false;
    const codigo = (err as { error?: { codigo?: number } })?.error?.codigo;
    if (codigo === 0) {
      const msg = (err as { error?: { mensaje?: string } })?.error?.mensaje || texto;
      Swal.fire({ icon: 'warning', title: 'No se puede completar', text: msg, confirmButtonColor: COLOR_SWAL });
    } else {
      this.alertaError(texto, err);
    }
  }

  private alertaError(texto: string, err: unknown): void {
    const msg = (err as { error?: { mensaje?: string } })?.error?.mensaje;
    Swal.fire({ icon: 'error', title: 'Error', text: msg || texto, confirmButtonColor: COLOR_SWAL });
  }

  nuevo(): void {
    this.router.navigate(['/dashboard/contracts/otro-si/nuevo']);
  }

  volver(): void {
    this.router.navigate(['/dashboard/contracts']);
  }
}
