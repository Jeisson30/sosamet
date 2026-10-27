import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CalendarModule } from 'primeng/calendar';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { RadioButtonModule } from 'primeng/radiobutton';
import Swal from 'sweetalert2';

import { CatalogService } from '../../../../shared/services/catalog.service';
import { ContractsService } from '../../shared/service/contracts.service';
import { TIPO_CONTRATO_DOCUMENTO_OPTIONS } from '../../shared/constants/tipo-contrato.constants';
import {
  puedeCrearDocumento,
  puedeVerValoresContrato,
} from '../../../../core/auth/permissions';

const COLOR = '#20506A';
const HUB = '/dashboard/contracts';
const LISTA = '/dashboard/contracts/actas-pago';

interface Opt {
  label: string;
  value: string;
}

interface MemoriaCard {
  id: number;
  consecutivo: string;
  numero_contrato: string;
  constructora: string;
  proyecto: string;
  empresa_asociada?: string;
  fecha_acta?: string;
  valor_neto: number;
  selected?: boolean;
}

interface DescuentoRow {
  concepto: string;
  tipo: 'PORCENTAJE' | 'VALOR';
  porcentaje: number;
  valor: number;
}

@Component({
  selector: 'app-acta-pago-nuevo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DropdownModule,
    InputTextModule,
    InputNumberModule,
    CalendarModule,
    TableModule,
    TextareaModule,
    TagModule,
    RadioButtonModule,
  ],
  templateUrl: './acta-pago-nuevo.component.html',
  styleUrls: ['./acta-pago-nuevo.component.scss'],
})
export class ActaPagoNuevoComponent implements OnInit {
  private readonly catalog = inject(CatalogService);
  private readonly contracts = inject(ContractsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly tipoDocOptions = TIPO_CONTRATO_DOCUMENTO_OPTIONS;
  readonly canEdit = puedeCrearDocumento('ACTAS DE PAGO');
  readonly canViewValues =
    puedeVerValoresContrato() || puedeCrearDocumento('ACTAS DE PAGO');

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
  readonly tipoDescOptions: Opt[] = [
    { label: 'Porcentaje', value: 'PORCENTAJE' },
    { label: 'Valor', value: 'VALOR' },
  ];

  constructoraOptions: Opt[] = [];
  proyectoOptions: Opt[] = [];
  documentoOptions: Opt[] = [];

  idConstructora: string | null = null;
  constructoraNombre = '';
  proyectoNombre = '';
  tipoDocumento: string | null = null;
  numeroContrato: string | null = null;
  actaNoBusqueda = '';

  loading = false;
  saving = false;
  memorias: MemoriaCard[] = [];
  memoriaSeleccionadaId: number | null = null;

  actaId: number | null = null;
  estadoActa = '';
  readOnly = false;
  isExisting = false;

  consecutivo = '';
  tipoDocumentoPago: string | null = 'Factura de Venta';
  tipoPago: string | null = 'Avance de Obra';
  reciboCaja = '';
  fechaPago: Date | null = null;
  observaciones = '';

  valorContrato = 0;
  valorAcumulado = 0;
  valorActa = 0;
  saldoKpi = 0;
  pagosAnteriores = 0;

  descuentos: DescuentoRow[] = [];

  ngOnInit(): void {
    const idParam = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isFinite(idParam) && idParam > 0) {
      this.loadExisting(idParam);
      return;
    }
    if (!this.canEdit) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin permiso',
        text: 'No puede crear Actas de Pago.',
        confirmButtonColor: COLOR,
      }).then(() => this.router.navigate([HUB]));
      return;
    }
    this.catalog.getConstructoras().subscribe({
      next: (list) => {
        this.constructoraOptions = (list || []).map((c) => ({
          label: c.nombre,
          value: String(c.id),
        }));
      },
    });
  }

  private loadExisting(id: number): void {
    this.loading = true;
    this.isExisting = true;
    this.contracts.getActaPago(id).subscribe({
      next: (res) => {
        this.loading = false;
        const h = res?.header;
        if (!h) {
          Swal.fire({
            icon: 'error',
            title: 'No encontrada',
            text: 'El acta de pago no existe.',
            confirmButtonColor: COLOR,
          }).then(() => this.volverLista());
          return;
        }
        this.actaId = Number(h.id);
        this.estadoActa = String(h.estado || '');
        this.readOnly = ['FACTURADO', 'PAGO', 'ANULADA'].includes(this.estadoActa);
        this.consecutivo = h.consecutivo || '';
        this.tipoDocumentoPago = h.tipo_documento_pago || null;
        this.tipoPago = h.tipo_pago || null;
        this.reciboCaja = h.recibo_caja || '';
        if (h.fecha_pago) {
          const d = new Date(h.fecha_pago);
          this.fechaPago = Number.isNaN(d.getTime()) ? null : d;
        }
        this.observaciones = h.observaciones || '';
        this.valorContrato = toNum(h.valor_contrato);
        this.valorActa = toNum(h.valor_acta);
        this.pagosAnteriores = toNum(h.pagos_anteriores);
        this.valorAcumulado = this.pagosAnteriores;
        this.saldoKpi = toNum(h.saldo_por_pagar);
        this.memoriaSeleccionadaId = Number(h.id_memoria) || null;
        this.memorias = [
          {
            id: Number(h.id_memoria),
            consecutivo: h.memoria_consecutivo || '',
            numero_contrato: h.numero_contrato || '',
            constructora: h.constructora || '',
            proyecto: h.proyecto || '',
            empresa_asociada: h.empresa_asociada || '',
            valor_neto: toNum(h.valor_acta),
            selected: true,
          },
        ];
        this.descuentos = (res?.descuentos || []).map((d: any) => ({
          concepto: d.concepto || '',
          tipo: String(d.tipo || 'PORCENTAJE').toUpperCase() === 'VALOR'
            ? 'VALOR'
            : 'PORCENTAJE',
          porcentaje: toNum(d.porcentaje),
          valor: toNum(d.valor),
        }));
        this.constructoraNombre = h.constructora || '';
        this.proyectoNombre = h.proyecto || '';
        this.numeroContrato = h.numero_contrato || null;
      },
      error: (err) => {
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.mensaje || 'No se pudo cargar el acta.',
          confirmButtonColor: COLOR,
        }).then(() => this.volverLista());
      },
    });
  }

  onConstructoraChange(): void {
    this.proyectoOptions = [];
    this.proyectoNombre = '';
    this.documentoOptions = [];
    this.numeroContrato = null;
    this.resetSeleccion();
    const id = this.idConstructora;
    const opt = this.constructoraOptions.find((o) => o.value === id);
    this.constructoraNombre = opt?.label || '';
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

  onProyectoChange(): void {
    this.documentoOptions = [];
    this.numeroContrato = null;
    this.resetSeleccion();
    if (!this.constructoraNombre || !this.proyectoNombre) return;
    this.contracts
      .consultarContratosFiltrados({
        constructora: this.constructoraNombre,
        proyecto: this.proyectoNombre,
      })
      .subscribe({
        next: (res) => {
          const data = Array.isArray(res?.data) ? res.data : [];
          this.documentoOptions = data.map((r) => ({
            label: r.label || r.numero_contrato,
            value: String(r.numero_contrato || r.value || ''),
          }));
        },
      });
  }

  buscarMemorias(): void {
    if (!this.canEdit && !this.isExisting) return;
    this.loading = true;
    this.resetSeleccion(false);
    this.contracts
      .listarMemoriasParaPago({
        constructora: this.constructoraNombre || undefined,
        proyecto: this.proyectoNombre || undefined,
        numero_contrato: this.numeroContrato || undefined,
        tipo_documento: this.tipoDocumento || undefined,
        acta_no: this.actaNoBusqueda || undefined,
      })
      .subscribe({
        next: (res) => {
          this.loading = false;
          this.memorias = (res?.data || []).map((m: any) => ({
            id: Number(m.id),
            consecutivo: m.consecutivo,
            numero_contrato: m.numero_contrato,
            constructora: m.constructora,
            proyecto: m.proyecto,
            empresa_asociada: m.empresa_asociada,
            fecha_acta: m.fecha_acta,
            valor_neto: toNum(m.valor_neto),
            selected: false,
          }));
          if (!this.memorias.length) {
            Swal.fire({
              icon: 'info',
              title: 'Sin resultados',
              text: 'No hay memorias disponibles para pago con esos filtros.',
              confirmButtonColor: COLOR,
            });
          }
        },
        error: (err) => {
          this.loading = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.mensaje || 'No se pudo buscar.',
            confirmButtonColor: COLOR,
          });
        },
      });
  }

  seleccionarMemoria(m: MemoriaCard): void {
    if (this.readOnly) return;
    this.memoriaSeleccionadaId = m.id;
    for (const x of this.memorias) x.selected = x.id === m.id;
    this.loading = true;
    this.contracts.getActaPagoContexto(m.id).subscribe({
      next: (ctx) => {
        this.loading = false;
        this.consecutivo = ctx?.siguiente_consecutivo || this.consecutivo || '';
        const r = ctx?.resumen || {};
        this.valorContrato = toNum(r.valor_contrato);
        this.valorAcumulado = toNum(r.valor_acumulado);
        this.valorActa = toNum(r.valor_acta);
        this.saldoKpi = toNum(r.saldo_por_pagar);
        this.pagosAnteriores = toNum(r.pagos_anteriores);
        this.descuentos = [];
      },
      error: (err) => {
        this.loading = false;
        this.memoriaSeleccionadaId = null;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.mensaje || 'No se pudo cargar el contexto.',
          confirmButtonColor: COLOR,
        });
      },
    });
  }

  get totalDescuentos(): number {
    return this.descuentos.reduce((s, d) => s + this.valorDescuento(d), 0);
  }

  get valorAPagar(): number {
    return Math.max(0, this.valorActa - this.totalDescuentos);
  }

  get saldoResumen(): number {
    return Math.max(0, this.valorAPagar - this.pagosAnteriores);
  }

  valorDescuento(d: DescuentoRow): number {
    if (d.tipo === 'VALOR') return toNum(d.valor);
    return Number(((this.valorActa * toNum(d.porcentaje)) / 100).toFixed(2));
  }

  onDescChange(d: DescuentoRow): void {
    if (d.tipo === 'PORCENTAJE') {
      d.valor = this.valorDescuento(d);
    }
  }

  agregarDescuento(): void {
    if (this.readOnly) return;
    this.descuentos.push({
      concepto: '',
      tipo: 'PORCENTAJE',
      porcentaje: 0,
      valor: 0,
    });
  }

  quitarDescuento(i: number): void {
    if (this.readOnly) return;
    this.descuentos.splice(i, 1);
  }

  guardar(luegoFinalizar = false): void {
    if (this.readOnly || !this.canEdit) return;
    if (!this.memoriaSeleccionadaId) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin memoria',
        text: 'Seleccione una memoria de corte.',
        confirmButtonColor: COLOR,
      });
      return;
    }
    this.saving = true;
    const payload = {
      id: this.actaId || undefined,
      cabecera: {
        id_memoria: this.memoriaSeleccionadaId,
        consecutivo: this.consecutivo,
        tipo_documento_pago: this.tipoDocumentoPago,
        tipo_pago: this.tipoPago,
        valor_contrato: this.valorContrato,
        valor_acta: this.valorActa,
        observaciones: this.observaciones,
        fecha_emision: new Date().toISOString().slice(0, 10),
      },
      descuentos: this.descuentos
        .filter((d) => d.concepto.trim())
        .map((d) => ({
          concepto: d.concepto,
          tipo: d.tipo,
          porcentaje: d.porcentaje,
          valor: this.valorDescuento(d),
        })),
    };
    this.contracts.guardarActaPago(payload).subscribe({
      next: (res) => {
        this.actaId = Number(res?.data?.id) || this.actaId;
        this.consecutivo = res?.data?.consecutivo || this.consecutivo;
        this.estadoActa = 'EN_REVISION';
        if (luegoFinalizar && this.actaId) {
          this.contracts.finalizarActaPago(this.actaId).subscribe({
            next: () => {
              this.saving = false;
              this.estadoActa = 'FACTURADO';
              this.readOnly = true;
              Swal.fire({
                icon: 'success',
                title: 'Finalizada',
                text: 'Acta de Pago en estado Facturado.',
                confirmButtonColor: COLOR,
              }).then(() => this.volverLista());
            },
            error: (err) => {
              this.saving = false;
              Swal.fire({
                icon: 'error',
                title: 'Guardada, pero no finalizó',
                text: err?.error?.mensaje || 'Error al finalizar.',
                confirmButtonColor: COLOR,
              });
            },
          });
          return;
        }
        this.saving = false;
        Swal.fire({
          icon: 'success',
          title: 'Guardada',
          text: `Acta ${this.consecutivo} en revisión.`,
          confirmButtonColor: COLOR,
        });
      },
      error: (err) => {
        this.saving = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.mensaje || 'No se pudo guardar.',
          confirmButtonColor: COLOR,
        });
      },
    });
  }

  finalizar(): void {
    this.guardar(true);
  }

  cancelar(): void {
    this.volverLista();
  }

  vistaPrevia(): void {
    Swal.fire({
      icon: 'info',
      title: 'Vista previa',
      html: `
        <div style="text-align:left;font-size:0.9rem;">
          <p><b>Consecutivo:</b> ${esc(this.consecutivo || '—')}</p>
          <p><b>Tipo doc:</b> ${esc(this.tipoDocumentoPago || '—')}</p>
          <p><b>Tipo pago:</b> ${esc(this.tipoPago || '—')}</p>
          <p><b>Valor acta:</b> ${fmt(this.valorActa)}</p>
          <p><b>Descuentos:</b> ${fmt(this.totalDescuentos)}</p>
          <p><b>Valor a pagar:</b> ${fmt(this.valorAPagar)}</p>
        </div>`,
      confirmButtonColor: COLOR,
    });
  }

  volverLista(): void {
    this.router.navigate([LISTA]);
  }

  private resetSeleccion(clearList = true): void {
    this.memoriaSeleccionadaId = null;
    if (clearList) this.memorias = [];
    this.valorContrato = 0;
    this.valorAcumulado = 0;
    this.valorActa = 0;
    this.saldoKpi = 0;
    this.pagosAnteriores = 0;
    this.descuentos = [];
  }
}

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmt(n: number): string {
  return '$' + toNum(n).toLocaleString('es-CO', { maximumFractionDigits: 2 });
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
