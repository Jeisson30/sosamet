import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TableModule } from 'primeng/table';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import Swal from 'sweetalert2';

import { CatalogService } from '../../../../shared/services/catalog.service';
import { ContractsService } from '../../shared/service/contracts.service';
import {
  puedeCrearDocumento,
  puedeVerValoresContrato,
} from '../../../../core/auth/permissions';

const COLOR = '#20506A';

interface Opt {
  label: string;
  value: string;
}

interface ActaPagoRow {
  id: number;
  consecutivo: string;
  numero_contrato: string;
  constructora: string;
  proyecto: string;
  empresa_asociada?: string;
  tipo_documento_pago?: string;
  tipo_pago?: string;
  fecha_emision: string;
  estado: string;
  valor_a_pagar: number;
  tiempo_transcurrido_dias?: number | null;
}

@Component({
  selector: 'app-acta-pago-consulta',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    CalendarModule,
    TableModule,
    MenuModule,
    TagModule,
  ],
  templateUrl: './acta-pago-consulta.component.html',
  styleUrls: ['./acta-pago-consulta.component.scss'],
})
export class ActaPagoConsultaComponent implements OnInit {
  private readonly contracts = inject(ContractsService);
  private readonly catalog = inject(CatalogService);
  private readonly router = inject(Router);

  readonly canEdit = puedeCrearDocumento('ACTAS DE PAGO');
  readonly canViewValues =
    puedeVerValoresContrato() || puedeCrearDocumento('ACTAS DE PAGO');

  readonly estadoOptions: Opt[] = [
    { label: 'En Revisión', value: 'EN_REVISION' },
    { label: 'Facturado', value: 'FACTURADO' },
    { label: 'Pago', value: 'PAGO' },
    { label: 'Anulada', value: 'ANULADA' },
  ];
  readonly tipoDocumentoPagoOptions: Opt[] = [
    { label: 'Factura de Venta', value: 'Factura de Venta' },
    { label: 'Cuenta de Cobro', value: 'Cuenta de Cobro' },
    { label: 'Otro', value: 'Otro' },
  ];
  readonly tipoPagoOptions: Opt[] = [
    { label: 'Anticipo', value: 'Anticipo' },
    { label: 'Avance de Obra', value: 'Avance de Obra' },
    { label: 'Rete Garantía', value: 'Rete Garantía' },
    { label: 'Otro', value: 'Otro' },
  ];

  buscar = '';
  estado: string | null = null;
  tipoDocumentoPago: string | null = null;
  tipoPago: string | null = null;
  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;
  empresaAsociada: string | null = null;
  idConstructora: string | null = null;
  constructoraNombre: string | null = null;
  proyectoNombre: string | null = null;

  empresaOptions: Opt[] = [];
  constructoraOptions: Opt[] = [];
  proyectoOptions: Opt[] = [];

  loading = false;
  procesando = false;
  rows: ActaPagoRow[] = [];
  rowMenuItems: MenuItem[] = [];

  ngOnInit(): void {
    this.catalog.getConstructoras().subscribe({
      next: (list) => {
        this.constructoraOptions = (list || []).map((c) => ({
          label: c.nombre,
          value: String(c.id),
        }));
      },
    });
    this.contracts.getCompanies().subscribe({
      next: (list) => {
        const arr = Array.isArray(list) ? list : [];
        this.empresaOptions = arr
          .map((e: any) => ({
            label: String(
              e.nombre_empresa || e.nombre || e.empresa || e.label || ''
            ).trim(),
            value: String(
              e.id ?? e.value ?? e.nombre_empresa ?? e.nombre ?? e.empresa ?? ''
            ).trim(),
          }))
          .filter((o) => o.label && o.value);
      },
      error: () => {
        this.empresaOptions = [];
      },
    });
    this.cargar();
  }

  onConstructoraChange(): void {
    this.proyectoOptions = [];
    this.proyectoNombre = null;
    const id = this.idConstructora;
    const opt = this.constructoraOptions.find((o) => o.value === id);
    this.constructoraNombre = opt?.label || null;
    if (!id) return;
    this.catalog.getProyectosByConstructora(id).subscribe({
      next: (list) => {
        this.proyectoOptions = (list || []).map((p) => ({
          label: p.nombre,
          value: p.nombre,
        }));
      },
    });
  }

  cargar(): void {
    this.loading = true;
    const toIso = (d: Date | null) =>
      d ? d.toISOString().slice(0, 10) : undefined;
    this.contracts
      .listarActasPago({
        buscar: this.buscar.trim() || undefined,
        estado: this.estado || undefined,
        constructora: this.constructoraNombre || undefined,
        proyecto: this.proyectoNombre || undefined,
        empresa_asociada: this.empresaAsociada || undefined,
        tipo_documento_pago: this.tipoDocumentoPago || undefined,
        tipo_pago: this.tipoPago || undefined,
        fecha_desde: toIso(this.fechaDesde),
        fecha_hasta: toIso(this.fechaHasta),
      })
      .subscribe({
        next: (res) => {
          this.loading = false;
          this.rows = res?.data || [];
        },
        error: () => {
          this.loading = false;
          this.rows = [];
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar las Actas de Pago.',
            confirmButtonColor: COLOR,
          });
        },
      });
  }

  limpiar(): void {
    this.buscar = '';
    this.estado = null;
    this.tipoDocumentoPago = null;
    this.tipoPago = null;
    this.fechaDesde = null;
    this.fechaHasta = null;
    this.empresaAsociada = null;
    this.idConstructora = null;
    this.constructoraNombre = null;
    this.proyectoNombre = null;
    this.proyectoOptions = [];
    this.cargar();
  }

  nuevo(): void {
    this.router.navigate(['/dashboard/contracts/actas-pago/nuevo']);
  }

  volver(): void {
    this.router.navigate(['/dashboard/contracts']);
  }

  visualizar(row: ActaPagoRow): void {
    this.router.navigate(['/dashboard/contracts/actas-pago/ver', row.id]);
  }

  editar(row: ActaPagoRow): void {
    if (!this.canEditFila(row)) return;
    this.router.navigate(['/dashboard/contracts/actas-pago/ver', row.id]);
  }

  openRowMenu(event: Event, menu: Menu, row: ActaPagoRow): void {
    const puedeEditar = this.canEdit && this.canEditFila(row);
    const puedeAnular = this.canEdit && row.estado !== 'ANULADA';
    const puedeEliminar =
      this.canEdit && ['EN_REVISION', 'ANULADA'].includes(row.estado);

    this.rowMenuItems = [
      {
        label: 'Editar',
        icon: 'pi pi-pencil',
        disabled: !puedeEditar,
        command: () => this.editar(row),
      },
      {
        label: 'Anular',
        icon: 'pi pi-ban',
        disabled: !puedeAnular,
        command: () => this.anular(row),
      },
      {
        label: 'Eliminar',
        icon: 'pi pi-trash',
        disabled: !puedeEliminar,
        command: () => this.eliminar(row),
      },
    ];
    menu.toggle(event);
  }

  canEditFila(row: ActaPagoRow): boolean {
    return row.estado === 'EN_REVISION';
  }

  labelEstado(estado: string): string {
    switch (String(estado || '').toUpperCase()) {
      case 'EN_REVISION':
        return 'En Revisión';
      case 'FACTURADO':
        return 'Facturado';
      case 'PAGO':
        return 'Pago';
      case 'ANULADA':
        return 'Anulada';
      default:
        return estado || '—';
    }
  }

  severity(
    estado: string
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (String(estado || '').toUpperCase()) {
      case 'PAGO':
        return 'success';
      case 'FACTURADO':
        return 'warn';
      case 'EN_REVISION':
        return 'danger';
      case 'ANULADA':
        return 'secondary';
      default:
        return 'secondary';
    }
  }

  labelTiempo(dias: number | null | undefined): string {
    if (dias == null) return '—';
    if (dias === 1) return '1 Día';
    return `${dias} Días`;
  }

  marcarPago(row: ActaPagoRow): void {
    if (!this.canEdit) return;
    if (!['FACTURADO', 'EN_REVISION'].includes(row.estado)) {
      Swal.fire({
        icon: 'info',
        title: 'No aplica',
        text: 'Solo actas Facturado (o En Revisión) pueden pasar a Pago.',
        confirmButtonColor: COLOR,
      });
      return;
    }
    Swal.fire({
      title: 'Marcar como Pago',
      html: `
        <p style="margin-bottom:0.75rem;">Acta <strong>${row.consecutivo}</strong></p>
        <input id="ap-recibo" class="swal2-input" placeholder="Recibo de caja No." />
        <input id="ap-fecha" type="date" class="swal2-input" />
      `,
      showCancelButton: true,
      confirmButtonText: 'Confirmar pago',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: COLOR,
      preConfirm: () => {
        const recibo = (
          document.getElementById('ap-recibo') as HTMLInputElement
        )?.value?.trim();
        const fecha = (
          document.getElementById('ap-fecha') as HTMLInputElement
        )?.value?.trim();
        if (!recibo || !fecha) {
          Swal.showValidationMessage('Recibo y fecha son obligatorios.');
          return false;
        }
        return { recibo_caja: recibo, fecha_pago: fecha };
      },
    }).then((r) => {
      if (!r.isConfirmed || !r.value) return;
      this.procesando = true;
      this.contracts.marcarPagoActa(row.id, r.value).subscribe({
        next: (res) => {
          this.procesando = false;
          Swal.fire({
            icon: 'success',
            title: 'OK',
            text: res?.mensaje || 'Marcada como Pago.',
            confirmButtonColor: COLOR,
          });
          this.cargar();
        },
        error: (err) => {
          this.procesando = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.mensaje || 'No se pudo marcar el pago.',
            confirmButtonColor: COLOR,
          });
        },
      });
    });
  }

  anular(row: ActaPagoRow): void {
    if (!this.canEdit || row.estado === 'ANULADA') return;
    Swal.fire({
      icon: 'warning',
      title: 'Anular acta de pago',
      html: `¿Anular <strong>${row.consecutivo}</strong>?<br>La memoria queda libre para un nuevo pago.`,
      showCancelButton: true,
      confirmButtonColor: '#c62828',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Anular',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.procesando = true;
      this.contracts.anularActaPago(row.id).subscribe({
        next: (res) => {
          this.procesando = false;
          Swal.fire({
            icon: 'success',
            title: 'OK',
            text: res?.mensaje || 'Anulada.',
            confirmButtonColor: COLOR,
          });
          this.cargar();
        },
        error: (err) => {
          this.procesando = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.mensaje || 'No se pudo anular.',
            confirmButtonColor: COLOR,
          });
        },
      });
    });
  }

  eliminar(row: ActaPagoRow): void {
    if (!this.canEdit) return;
    if (!['EN_REVISION', 'ANULADA'].includes(row.estado)) {
      Swal.fire({
        icon: 'info',
        title: 'No permitido',
        text: 'Anule el acta antes de eliminarla, o elimínelo solo si está en revisión.',
        confirmButtonColor: COLOR,
      });
      return;
    }
    Swal.fire({
      icon: 'warning',
      title: 'Eliminar acta de pago',
      html: `¿Eliminar permanentemente <strong>${row.consecutivo}</strong>?`,
      showCancelButton: true,
      confirmButtonColor: '#c62828',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Eliminar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.procesando = true;
      this.contracts.eliminarActaPago(row.id).subscribe({
        next: (res) => {
          this.procesando = false;
          Swal.fire({
            icon: 'success',
            title: 'OK',
            text: res?.mensaje || 'Eliminada.',
            confirmButtonColor: COLOR,
          });
          this.cargar();
        },
        error: (err) => {
          this.procesando = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.mensaje || 'No se pudo eliminar.',
            confirmButtonColor: COLOR,
          });
        },
      });
    });
  }
}
