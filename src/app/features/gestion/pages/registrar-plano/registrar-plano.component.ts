import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import Swal from 'sweetalert2';

import { ContractsService } from '../../../contracts/shared/service/contracts.service';
import {
  ActaMedidaDetalle,
  ActasDisenadorDashboard,
  ActasDisenadorHeader,
} from '../../../contracts/shared/interfaces/Response.interface';
import {
  CatalogService,
  ConstructoraDto,
  ProyectoDto,
} from '../../../../shared/services/catalog.service';

interface PlanoSinActaRow {
  item: string;
  detalle: string;
  numero_plano: string;
  observaciones: string;
  archivo: File | null;
}

@Component({
  selector: 'app-registrar-plano',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    DropdownModule,
    CalendarModule,
    ButtonModule,
    DialogModule,
    TableModule,
  ],
  templateUrl: './registrar-plano.component.html',
  styleUrls: ['./registrar-plano.component.scss'],
})
export class RegistrarPlanoComponent implements OnInit {
  @ViewChild('carouselTrack') carouselTrack?: ElementRef<HTMLElement>;

  loading = false;
  buscar = '';
  estadoFiltro: number | null = null;

  estadoOptions = [
    { label: 'Todos', value: null },
    { label: 'Pendientes', value: 1 },
    { label: 'Completadas', value: 2 },
    { label: 'Anuladas', value: 3 },
  ];

  dashboard: ActasDisenadorDashboard = {
    total_asignadas: 0,
    pendientes: 0,
    finalizadas: 0,
    anuladas: 0,
  };

  private allHeaders: ActasDisenadorHeader[] = [];
  private allDetalle: ActaMedidaDetalle[] = [];
  filteredHeaders: ActasDisenadorHeader[] = [];

  /** Fechas / inputs locales por consecutivo (UI hasta SP de guardado). */
  cardExtras: Record<
    string,
    {
      fechaEnviado: Date | null;
      fechaAprobado: Date | null;
      items: ActaMedidaDetalle[];
    }
  > = {};

  detailVisible = false;
  previewHeader: ActasDisenadorHeader | null = null;
  previewItems: ActaMedidaDetalle[] = [];

  showSinActa = false;
  sinActaConstructoraId: string | null = null;
  sinActaProyectoId: string | null = null;
  sinActaContrato: string | null = null;
  sinActaDetalle = '';
  sinActaFechaEnviado: Date | null = null;
  sinActaFechaAprobado: Date | null = null;
  sinActaRows: PlanoSinActaRow[] = [
    { item: '', detalle: '', numero_plano: '', observaciones: '', archivo: null },
  ];

  constructorasOptions: { label: string; value: string }[] = [];
  proyectosOptions: { label: string; value: string }[] = [];
  contratosOptions: { label: string; value: string }[] = [];

  get isSingleCard(): boolean {
    return this.filteredHeaders.length === 1;
  }

  constructor(
    private contractsService: ContractsService,
    private catalogService: CatalogService
  ) {}

  ngOnInit(): void {
    this.loadCatalogs();
    this.loadData();
  }

  private loadCatalogs(): void {
    this.catalogService.getConstructoras().subscribe({
      next: (list: ConstructoraDto[]) => {
        this.constructorasOptions = list.map((c) => ({
          label: c.nombre,
          value: String(c.id),
        }));
      },
      error: () => {
        this.constructorasOptions = [];
      },
    });

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

  onSinActaConstructoraChange(id: string | null): void {
    this.sinActaConstructoraId = id;
    this.sinActaProyectoId = null;
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

  loadData(): void {
    this.loading = true;
    this.contractsService
      .consultActasDisenador({ estado: this.estadoFiltro })
      .subscribe({
        next: (res) => {
          this.dashboard = res?.dashboard || {
            total_asignadas: 0,
            pendientes: 0,
            finalizadas: 0,
            anuladas: 0,
          };
          this.allHeaders = Array.isArray(res?.cabecera) ? res.cabecera : [];
          this.allDetalle = Array.isArray(res?.detalle) ? res.detalle : [];
          this.buildCardExtras();
          this.applyLocalSearch();
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.allHeaders = [];
          this.allDetalle = [];
          this.filteredHeaders = [];
          Swal.fire(
            'Error',
            err?.error?.mensaje ||
              'No se pudieron cargar las actas asignadas.',
            'error'
          );
        },
      });
  }

  private buildCardExtras(): void {
    const next: typeof this.cardExtras = {};
    this.allHeaders.forEach((h) => {
      const key = String(h.consecutivo || '').trim();
      const prev = this.cardExtras[key];
      const items = this.allDetalle
        .filter(
          (d) => String(d.amd_consecutivo || '').trim() === key
        )
        .map((d) => {
          const prevItem = prev?.items?.find(
            (p) => String(p.amd_id) === String(d.amd_id)
          );
          return {
            ...d,
            numero_plano:
              prevItem?.numero_plano ??
              d.amd_consecutivo_item ??
              '',
            archivoPlano: prevItem?.archivoPlano ?? null,
          };
        });

      const fechaEnviado =
        prev?.fechaEnviado ??
        this.parseToDate(
          items.find((i) => i.amd_fecha_enviado)?.amd_fecha_enviado
        );
      const fechaAprobado =
        prev?.fechaAprobado ??
        this.parseToDate(
          items.find((i) => i.amd_fecha_aprobado)?.amd_fecha_aprobado
        );

      next[key] = {
        fechaEnviado,
        fechaAprobado,
        items,
      };
    });
    this.cardExtras = next;
  }

  private parseToDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    const raw = String(value).trim();
    if (!raw) return null;
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

  private formatDateParam(date: Date | null): string | null {
    if (!date) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  applyLocalSearch(): void {
    const q = this.normalize(this.buscar);
    if (!q) {
      this.filteredHeaders = [...this.allHeaders];
      return;
    }
    this.filteredHeaders = this.allHeaders.filter((h) => {
      const blob = this.normalize(
        [
          h.consecutivo,
          h.constructora,
          h.proyecto,
          h.numero_contrato,
          h.descripcion_general,
          h.observaciones,
        ]
          .filter(Boolean)
          .join(' ')
      );
      return blob.includes(q);
    });
  }

  onBuscarChange(): void {
    this.applyLocalSearch();
  }

  onEstadoChange(): void {
    this.loadData();
  }

  private normalize(v: unknown): string {
    return String(v ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  estadoLabel(estado: string | number | null | undefined): string {
    const n = Number(estado);
    if (n === 2) return 'Completada';
    if (n === 3) return 'Anulada';
    return 'Pendiente';
  }

  estadoClass(estado: string | number | null | undefined): string {
    const n = Number(estado);
    if (n === 2) return 'rp-badge--ok';
    if (n === 3) return 'rp-badge--anulada';
    return 'rp-badge--pendiente';
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const raw = String(value).trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
    const d = new Date(raw);
    return isNaN(d.getTime())
      ? raw
      : d.toLocaleDateString('es-CO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
  }

  itemsFor(consecutivo: string): ActaMedidaDetalle[] {
    return this.cardExtras[consecutivo]?.items || [];
  }

  scrollCarousel(dir: -1 | 1): void {
    const el = this.carouselTrack?.nativeElement;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.85, 280);
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  }

  toggleSinActa(): void {
    this.showSinActa = !this.showSinActa;
    if (this.showSinActa && this.sinActaRows.length === 0) {
      this.addSinActaRow();
    }
  }

  addSinActaRow(): void {
    this.sinActaRows.push({
      item: '',
      detalle: '',
      numero_plano: '',
      observaciones: '',
      archivo: null,
    });
  }

  removeSinActaRow(index: number): void {
    if (this.sinActaRows.length <= 1) {
      this.sinActaRows[0] = {
        item: '',
        detalle: '',
        numero_plano: '',
        observaciones: '',
        archivo: null,
      };
      return;
    }
    this.sinActaRows.splice(index, 1);
  }

  onAdjuntarPlanoCard(item: ActaMedidaDetalle, input: HTMLInputElement): void {
    input.onchange = () => {
      const file = input.files?.[0] || null;
      item.archivoPlano = file;
      input.value = '';
    };
    input.click();
  }

  planoAdjuntoLabel(item: ActaMedidaDetalle): string {
    if (item.archivoPlano?.name) return item.archivoPlano.name;
    if (item.amd_evidencia_item) {
      return this.evidenciaFileName(item.amd_evidencia_item);
    }
    return 'Adjuntar plano';
  }

  onVerDetalle(row: ActasDisenadorHeader): void {
    this.previewHeader = { ...row };
    this.previewItems = this.itemsFor(row.consecutivo).map((i) => ({ ...i }));
    this.detailVisible = true;
  }

  onCerrarDetalle(): void {
    this.detailVisible = false;
    this.previewHeader = null;
    this.previewItems = [];
  }

  evidenciaFileName(path: string | null | undefined): string {
    if (!path) return '';
    const parts = String(path).split(/[/\\]/);
    return parts[parts.length - 1] || path;
  }

  puedeFinalizar(row: ActasDisenadorHeader): boolean {
    const estado = Number(row.estado);
    return estado !== 2 && estado !== 3;
  }

  onFinalizarCard(row: ActasDisenadorHeader): void {
    if (!this.puedeFinalizar(row)) {
      Swal.fire(
        'No disponible',
        Number(row.estado) === 3
          ? 'El acta está anulada y no se puede finalizar.'
          : 'El acta ya se encuentra finalizada.',
        'info'
      );
      return;
    }

    const consecutivo = String(row.consecutivo || '').trim();
    const extras = this.cardExtras[consecutivo];
    const items = extras?.items || [];

    if (!items.length) {
      Swal.fire(
        'Atención',
        'El acta no tiene ítems para finalizar.',
        'warning'
      );
      return;
    }

    Swal.fire({
      icon: 'question',
      title: 'Finalizar acta de medida',
      html: `
        <p>Se finalizará el acta <strong>${consecutivo}</strong>.</p>
        <p>Los datos diligenciados (No. plano, adjuntos y fechas) se guardarán.</p>
        <p>¿Desea continuar?</p>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, finalizar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#20506A',
      cancelButtonColor: '#6c757d',
      reverseButtons: true,
    }).then((r) => {
      if (!r.isConfirmed) return;

      const formData = new FormData();
      formData.append('consecutivo', consecutivo);

      const fechaEnviado = this.formatDateParam(extras?.fechaEnviado ?? null);
      const fechaAprobado = this.formatDateParam(extras?.fechaAprobado ?? null);
      if (fechaEnviado) formData.append('fecha_enviado', fechaEnviado);
      if (fechaAprobado) formData.append('fecha_aprobado', fechaAprobado);

      const payloadItems = items.map((it) => {
        const amdId = Number(it.amd_id);
        if (it.archivoPlano) {
          formData.append(`evidencia_item_${amdId}`, it.archivoPlano);
        }
        return {
          amd_id: amdId,
          consecutivo_item: String(it.numero_plano || '').trim() || null,
          evidencia_item: it.archivoPlano
            ? null
            : it.amd_evidencia_item || null,
        };
      });

      formData.append('items', JSON.stringify(payloadItems));

      Swal.fire({
        title: 'Finalizando...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(null),
      });

      this.contractsService.finalizarActaMedida(formData).subscribe({
        next: (res) => {
          Swal.fire(
            'Finalizada',
            res?.mensaje || 'Acta finalizada correctamente.',
            'success'
          );
          this.loadData();
        },
        error: (err) => {
          Swal.fire(
            'Error',
            err?.error?.mensaje ||
              err?.error?.Mensaje ||
              'Ocurrió un error al finalizar el acta.',
            'error'
          );
        },
      });
    });
  }

  onAdjuntarPlanoSinActa(row: PlanoSinActaRow, input: HTMLInputElement): void {
    input.onchange = () => {
      const file = input.files?.[0] || null;
      row.archivo = file;
      input.value = '';
    };
    input.click();
  }

  onFinalizarSinActa(): void {
    Swal.fire({
      icon: 'info',
      title: 'Registrar plano',
      text: 'El registro de plano sin acta se habilitará cuando se configure el SP correspondiente.',
      confirmButtonColor: '#20506A',
    });
  }

  get rangeLabel(): string {
    const total = this.filteredHeaders.length;
    if (!total) return 'Mostrando 0 de 0 tareas';
    return `Mostrando 1 a ${total} de ${total} tareas`;
  }
}
