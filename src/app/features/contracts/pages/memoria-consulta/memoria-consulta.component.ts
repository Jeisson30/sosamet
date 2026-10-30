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

interface MemoriaRow {
  id: number;
  consecutivo: string;
  numero_contrato: string;
  constructora: string;
  proyecto: string;
  empresa_asociada?: string;
  fecha_acta: string;
  estado: string;
  valor_neto: number;
}

@Component({
  selector: 'app-memoria-consulta',
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
  templateUrl: './memoria-consulta.component.html',
  styleUrls: ['./memoria-consulta.component.scss'],
})
export class MemoriaConsultaComponent implements OnInit {
  private readonly contracts = inject(ContractsService);
  private readonly catalog = inject(CatalogService);
  private readonly router = inject(Router);

  readonly canEdit = puedeCrearDocumento('MEMORIAS');
  readonly canViewValues =
    puedeVerValoresContrato() || puedeCrearDocumento('MEMORIAS');

  readonly estadoOptions: Opt[] = [
    { label: 'En proceso', value: 'EN_PROCESO' },
    { label: 'Finalizado', value: 'FINALIZADO' },
    { label: 'Anulada', value: 'ANULADA' },
  ];

  buscar = '';
  estado: string | null = null;
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
  rows: MemoriaRow[] = [];
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
      .listarMemorias({
        buscar: this.buscar.trim() || undefined,
        estado: this.estado || undefined,
        constructora: this.constructoraNombre || undefined,
        proyecto: this.proyectoNombre || undefined,
        empresa_asociada: this.empresaAsociada || undefined,
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
            text: 'No se pudieron cargar las memorias.',
            confirmButtonColor: COLOR,
          });
        },
      });
  }

  limpiar(): void {
    this.buscar = '';
    this.estado = null;
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
    this.router.navigate(['/dashboard/contracts/memorias/nuevo']);
  }

  volver(): void {
    this.router.navigate(['/dashboard/contracts']);
  }

  visualizar(row: MemoriaRow): void {
    this.router.navigate(['/dashboard/contracts/memorias/ver', row.id]);
  }

  editar(row: MemoriaRow): void {
    if (!this.canEditFila(row)) return;
    this.router.navigate(['/dashboard/contracts/memorias/ver', row.id]);
  }

  openRowMenu(event: Event, menu: Menu, row: MemoriaRow): void {
    const puedeEditar = this.canEdit && this.canEditFila(row);
    const puedeAnular = this.canEdit && row.estado !== 'ANULADA';
    const puedeEliminar =
      this.canEdit && ['BORRADOR', 'ANULADA'].includes(row.estado);

    this.rowMenuItems = [
      {
        label: 'Editar',
        icon: 'pi pi-pencil',
        disabled: !puedeEditar,
        title: puedeEditar
          ? ''
          : 'Solo memorias en borrador o guardadas.',
        command: () => this.editar(row),
      },
      {
        label: 'Anular',
        icon: 'pi pi-ban',
        disabled: !puedeAnular,
        title: puedeAnular ? '' : 'La memoria ya está anulada.',
        command: () => this.anular(row),
      },
      {
        label: 'Eliminar',
        icon: 'pi pi-trash',
        disabled: !puedeEliminar,
        title: puedeEliminar
          ? ''
          : 'Solo borrador o anuladas. Use Anular para liberar pendientes.',
        command: () => this.eliminar(row),
      },
    ];
    menu.toggle(event);
  }

  canEditFila(row: MemoriaRow): boolean {
    return row.estado === 'BORRADOR' || row.estado === 'GUARDADA';
  }

  labelEstado(estado: string): string {
    switch (String(estado || '').toUpperCase()) {
      case 'FINALIZADA':
        return 'Finalizado';
      case 'GUARDADA':
      case 'BORRADOR':
        return 'En proceso';
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
      case 'FINALIZADA':
        return 'success';
      case 'GUARDADA':
      case 'BORRADOR':
        return 'warn';
      case 'ANULADA':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  anular(row: MemoriaRow): void {
    if (!this.canEdit || row.estado === 'ANULADA') return;
    Swal.fire({
      icon: 'warning',
      title: 'Anular memoria',
      html: `¿Anular <strong>${row.consecutivo}</strong>?<br>El pendiente vuelve a las remisiones.`,
      showCancelButton: true,
      confirmButtonColor: '#c62828',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Anular',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.procesando = true;
      this.contracts.anularMemoria(row.id).subscribe({
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

  eliminar(row: MemoriaRow): void {
    if (!this.canEdit) return;
    if (!['BORRADOR', 'ANULADA'].includes(row.estado)) {
      Swal.fire({
        icon: 'info',
        title: 'No permitido',
        text: 'Anule la memoria antes de eliminarla, o elimínelo solo si está en borrador.',
        confirmButtonColor: COLOR,
      });
      return;
    }
    Swal.fire({
      icon: 'warning',
      title: 'Eliminar memoria',
      html: `¿Eliminar permanentemente <strong>${row.consecutivo}</strong>? Esta acción no se puede deshacer.`,
      showCancelButton: true,
      confirmButtonColor: '#c62828',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Eliminar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.procesando = true;
      this.contracts.eliminarMemoria(row.id).subscribe({
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
