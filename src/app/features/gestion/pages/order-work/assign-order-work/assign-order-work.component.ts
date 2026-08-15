import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { ButtonModule } from 'primeng/button';
import Swal from 'sweetalert2';
import { Subscription } from 'rxjs';
import { BASE_URL } from '../../../../../core/url-constants';
import { GestionService } from '../../../shared/service/gestion.service';
import {
  GestionUser,
  OtActaPlanoDetalle,
  OtActaPlanoHeader,
  CrearOrdenTrabajoAsignadaPayload,
} from '../../../shared/interfaces/Response.interface';

interface OtCardView {
  consecutivo: string;
  constructora: string | null;
  proyecto: string | null;
  numero_contrato: string | null;
  fecha_acta: string | null;
  tipo_documento: string | null;
  descripcion_general: string | null;
  observaciones: string | null;
  evidencia: string | null;
  items: OtActaPlanoDetalle[];
  /** true si todos los ítems tienen estado_asignacion = 4 */
  asignada: boolean;
  consecutivoOrden: string | null;
  encargadoId: number | null;
  tipoActividad: string;
  fechaEntrega: Date | null;
  autorizo: string;
  observacionesOt: string;
  saving: boolean;
}

@Component({
  selector: 'app-assign-order-work',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    DropdownModule,
    CalendarModule,
    ButtonModule,
  ],
  templateUrl: './assign-order-work.component.html',
  styleUrls: ['./assign-order-work.component.scss'],
})
export class AssignOrderWorkComponent implements OnInit, OnDestroy {
  @ViewChild('carouselTrack') carouselTrack?: ElementRef<HTMLDivElement>;

  loading = false;
  buscar = '';

  dashboard = { pendientes: 0, finalizadas: 0, total: 0 };
  allCards: OtCardView[] = [];
  filteredCards: OtCardView[] = [];

  workUsers: GestionUser[] = [];

  readonly tipoActividadOptions = [
    { label: 'FABRICACIÓN', value: 'FABRICACIÓN' },
    { label: 'INSTALACIÓN', value: 'INSTALACIÓN' },
    { label: 'PINTURA', value: 'PINTURA' },
  ];

  private readonly filesBaseUrl = BASE_URL.replace(/\/api\/?$/, '');
  private subscriptions = new Subscription();

  get isSingleCard(): boolean {
    return this.filteredCards.length === 1;
  }

  constructor(
    private router: Router,
    private gestionService: GestionService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  goBack(): void {
    this.router.navigate(['/dashboard/gestion/order-work']);
  }

  loadData(): void {
    this.loading = true;
    const sub = this.gestionService.getActasPlanosDisponiblesOt().subscribe({
      next: (res) => {
        this.dashboard = res?.dashboard || {
          pendientes: 0,
          finalizadas: 0,
          total: 0,
        };
        this.allCards = this.buildCards(res?.cabecera || [], res?.detalle || []);
        this.applyLocalSearch();
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.allCards = [];
        this.filteredCards = [];
        Swal.fire({
          title: 'Error',
          text:
            err?.error?.mensaje ||
            'No se pudieron cargar las actas disponibles para OT.',
          icon: 'error',
          confirmButtonColor: '#20506A',
        });
      },
    });
    this.subscriptions.add(sub);
  }

  private loadUsers(): void {
    const sub = this.gestionService.getAllUsers().subscribe({
      next: (res) => {
        this.workUsers = (res.data || []).map((user) => ({
          ...user,
          displayName: `${user.nombre} ${user.apellido} - ${user.perfil}`,
        }));
      },
      error: () => {
        this.workUsers = [];
      },
    });
    this.subscriptions.add(sub);
  }

  private createEmptyCard(
    key: string,
    partial: Partial<OtCardView> = {}
  ): OtCardView {
    return {
      consecutivo: key,
      constructora: null,
      proyecto: null,
      numero_contrato: null,
      fecha_acta: null,
      tipo_documento: null,
      descripcion_general: null,
      observaciones: null,
      evidencia: null,
      items: [],
      asignada: false,
      consecutivoOrden: null,
      encargadoId: null,
      tipoActividad: '',
      fechaEntrega: null,
      autorizo: '',
      observacionesOt: '',
      saving: false,
      ...partial,
    };
  }

  private buildCards(
    cabecera: OtActaPlanoHeader[],
    detalle: OtActaPlanoDetalle[]
  ): OtCardView[] {
    const map = new Map<string, OtCardView>();

    cabecera.forEach((row) => {
      const key = String(row.consecutivo || '').trim();
      if (!key) return;
      if (!map.has(key)) {
        map.set(
          key,
          this.createEmptyCard(key, {
            constructora: row.constructora,
            proyecto: row.proyecto,
            numero_contrato: row.numero_contrato,
            fecha_acta: row.fecha_acta,
            tipo_documento: row.tipo_documento,
            descripcion_general: row.descripcion_general,
            observaciones: row.observaciones,
          })
        );
      }
      this.applyOtFieldsFromRow(map.get(key)!, row);
    });

    detalle.forEach((item) => {
      const key = String(item.consecutivo_acta || '').trim();
      if (!key) return;
      if (!map.has(key)) {
        map.set(
          key,
          this.createEmptyCard(key, {
            numero_contrato: item.numero_contrato,
            evidencia: item.evidencia || null,
          })
        );
      }
      const card = map.get(key)!;
      card.items.push(item);
      if (!card.evidencia && item.evidencia) {
        card.evidencia = item.evidencia;
      }
      this.applyOtFieldsFromRow(card, item);
    });

    map.forEach((card) => {
      card.asignada =
        card.items.length > 0 &&
        card.items.every((it) => Number(it.estado_asignacion) === 4);
    });

    return Array.from(map.values()).sort((a, b) =>
      b.consecutivo.localeCompare(a.consecutivo)
    );
  }

  /** Completa encargado/tipo/fecha/autorizo si el plano ya está en una OT. */
  private applyOtFieldsFromRow(
    card: OtCardView,
    row: OtActaPlanoHeader | OtActaPlanoDetalle
  ): void {
    if (Number(row.estado_asignacion) !== 4) return;

    if (
      card.encargadoId == null &&
      row.encargado_orden_trabajo != null &&
      String(row.encargado_orden_trabajo).trim() !== ''
    ) {
      const id = Number(row.encargado_orden_trabajo);
      if (Number.isFinite(id) && id > 0) card.encargadoId = id;
    }

    if (!card.tipoActividad && row.tipo_actividad) {
      card.tipoActividad = String(row.tipo_actividad);
    }

    if (!card.fechaEntrega && row.fecha_entrega_orden) {
      card.fechaEntrega = this.parseDateValue(row.fecha_entrega_orden);
    }

    if (!card.autorizo && row.ot_autorizo) {
      card.autorizo = String(row.ot_autorizo);
    }

    if (!card.consecutivoOrden && row.consecutivo_orden_trabajo) {
      card.consecutivoOrden = String(row.consecutivo_orden_trabajo);
    }
  }

  private parseDateValue(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }
    const raw = String(value).trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
      );
    }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  applyLocalSearch(): void {
    const q = this.normalize(this.buscar);
    if (!q) {
      this.filteredCards = [...this.allCards];
      return;
    }
    this.filteredCards = this.allCards.filter((c) =>
      this.normalize(c.consecutivo).includes(q)
    );
  }

  onBuscarChange(): void {
    this.applyLocalSearch();
  }

  scrollCarousel(dir: -1 | 1): void {
    const el = this.carouselTrack?.nativeElement;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.85, 280);
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
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

  fileUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    const clean = String(path).replace(/\\/g, '/').replace(/^\/+/, '');
    if (/^https?:\/\//i.test(clean)) return clean;
    return `${this.filesBaseUrl}/${clean}`;
  }

  fileName(path: string | null | undefined): string {
    if (!path) return '';
    const parts = String(path).split(/[/\\]/);
    return parts[parts.length - 1] || path;
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
    window.open(url, '_blank');
  }

  crearOrden(card: OtCardView): void {
    if (card.asignada) {
      Swal.fire({
        title: 'Orden ya asignada',
        text: 'Esta acta ya tiene una orden de trabajo y no se puede reasignar.',
        icon: 'info',
        confirmButtonColor: '#20506A',
      });
      return;
    }
    if (!card.encargadoId) {
      Swal.fire({
        title: 'Validación',
        text: 'Debe seleccionar un encargado.',
        icon: 'warning',
        confirmButtonColor: '#20506A',
      });
      return;
    }
    if (!card.tipoActividad) {
      Swal.fire({
        title: 'Validación',
        text: 'Debe seleccionar el tipo de actividad.',
        icon: 'warning',
        confirmButtonColor: '#20506A',
      });
      return;
    }
    if (!card.fechaEntrega) {
      Swal.fire({
        title: 'Validación',
        text: 'Debe seleccionar la fecha de entrega.',
        icon: 'warning',
        confirmButtonColor: '#20506A',
      });
      return;
    }
    if (!card.autorizo.trim()) {
      Swal.fire({
        title: 'Validación',
        text: 'El campo Autorizo es obligatorio.',
        icon: 'warning',
        confirmButtonColor: '#20506A',
      });
      return;
    }
    if (!card.observacionesOt.trim()) {
      Swal.fire({
        title: 'Validación',
        text: 'El campo Observaciones es obligatorio.',
        icon: 'warning',
        confirmButtonColor: '#20506A',
      });
      return;
    }
    if (!card.items.length) {
      Swal.fire({
        title: 'Validación',
        text: 'El acta no tiene ítems para la orden.',
        icon: 'warning',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    const amdItems = card.items
      .map((it) => ({ amd_id: Number(it.amd_id) }))
      .filter((it) => Number.isFinite(it.amd_id) && it.amd_id > 0);

    if (!amdItems.length) {
      Swal.fire({
        title: 'Validación',
        text: 'No hay ítems válidos (amd_id) para crear la orden.',
        icon: 'warning',
        confirmButtonColor: '#20506A',
      });
      return;
    }

    const payload: CrearOrdenTrabajoAsignadaPayload = {
      consecutivo: `OT-${card.consecutivo}`,
      empresa_asociada_id: null,
      encargado_id: card.encargadoId,
      fecha_entrega: card.fechaEntrega,
      observaciones: card.observacionesOt.trim(),
      tipo_actividad: card.tipoActividad,
      ot_constructora: card.constructora || '',
      ot_proyecto: card.proyecto || '',
      ot_tipo_documento: card.tipo_documento || '',
      ot_contrato: card.numero_contrato || '',
      ot_autorizo: card.autorizo.trim(),
      items: amdItems,
    };

    card.saving = true;
    const sub = this.gestionService.crearOrdenTrabajoAsignada(payload).subscribe({
      next: (res) => {
        card.saving = false;
        if (Number(res?.Codigo) !== 1) {
          Swal.fire({
            title: 'Atención',
            text: res?.Mensaje || 'No se pudo crear la orden de trabajo.',
            icon: 'warning',
            confirmButtonColor: '#20506A',
          });
          return;
        }
        Swal.fire({
          title: 'Éxito',
          text: res?.Mensaje || 'Orden de trabajo creada correctamente.',
          icon: 'success',
          confirmButtonColor: '#20506A',
        });
        this.loadData();
      },
      error: (err) => {
        card.saving = false;
        Swal.fire({
          title: 'Error',
          text:
            err?.error?.Mensaje ||
            err?.error?.mensaje ||
            err?.error?.message ||
            'No se pudo crear la orden de trabajo.',
          icon: 'error',
          confirmButtonColor: '#20506A',
        });
      },
    });
    this.subscriptions.add(sub);
  }

  private normalize(v: unknown): string {
    return String(v ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
