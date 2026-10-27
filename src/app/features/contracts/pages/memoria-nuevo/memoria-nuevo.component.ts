import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CalendarModule } from 'primeng/calendar';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import Swal from 'sweetalert2';

import { CatalogService } from '../../../../shared/services/catalog.service';
import { ContractsService } from '../../shared/service/contracts.service';
import {
  MemoriaPdfPayload,
  MemoriaPdfService,
} from '../../shared/service/memoria-pdf.service';
import { TIPO_CONTRATO_DOCUMENTO_OPTIONS } from '../../shared/constants/tipo-contrato.constants';
import {
  puedeCrearDocumento,
  puedeVerValoresContrato,
} from '../../../../core/auth/permissions';

const COLOR = '#20506A';
const HUB = '/dashboard/contracts';

interface Opt {
  label: string;
  value: string;
}

interface RemisionLinea {
  remision_plano_id: number;
  remision_numerodoc: string;
  remision_material: string;
  fecha: string;
  item: string;
  detalle: string;
  cantidad_enviada: number;
  cantidad_ya_facturada: number;
  cantidad_pendiente: number;
  cantidad_a_facturar: number;
  diferencia: number;
  um: string;
  locacion: string;
  observaciones: string;
  valor_unitario?: number;
  selected?: boolean;
  enActa?: boolean;
}

interface EvidenciaRow {
  item: string;
  detalle: string;
  observaciones: string;
}

interface ConceptoExtra {
  nombre: string;
  porc: number;
}

type PorcentajeKey =
  | 'porc_adm'
  | 'porc_imp'
  | 'porc_ut'
  | 'porc_iva'
  | 'porc_amort_anticipo'
  | 'porc_rete_garantia';

interface FilaFinanciera {
  label: string;
  porcKey?: PorcentajeKey;
  porc?: number;
  editable: boolean;
  ant: number;
  pre: number;
  tot: number;
  isNeto?: boolean;
  isSub?: boolean;
  extraIdx?: number;
}

@Component({
  selector: 'app-memoria-nuevo',
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
  ],
  templateUrl: './memoria-nuevo.component.html',
  styleUrls: ['./memoria-nuevo.component.scss'],
})
export class MemoriaNuevoComponent implements OnInit {
  private readonly catalog = inject(CatalogService);
  private readonly contracts = inject(ContractsService);
  private readonly memoriaPdf = inject(MemoriaPdfService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  generatingPdf = false;

  readonly tipoDocOptions = TIPO_CONTRATO_DOCUMENTO_OPTIONS;
  readonly canEdit = puedeCrearDocumento('MEMORIAS');
  readonly canViewValues =
    puedeVerValoresContrato() || puedeCrearDocumento('MEMORIAS');

  constructoraOptions: Opt[] = [];
  proyectoOptions: Opt[] = [];
  documentoOptions: Opt[] = [];

  idConstructora: string | null = null;
  constructoraNombre = '';
  proyectoNombre = '';
  tipoDocumento: string | null = null;
  numeroContrato: string | null = null;

  loading = false;
  saving = false;
  contratoSeleccionado = false;
  contexto: any = null;
  remisiones: RemisionLinea[] = [];
  control: any[] = [];
  consecutivoPreview = '';

  /** Memoria existente (consulta Ver). */
  memoriaId: number | null = null;
  estadoMemoria = '';
  readOnly = false;
  isExisting = false;

  fechaActa: Date | null = new Date();
  observaciones = '';
  porcentajes = {
    porc_adm: 0,
    porc_imp: 0,
    porc_ut: 0,
    porc_iva: 0,
    porc_amort_anticipo: 0,
    porc_rete_garantia: 0,
  };

  evidencias: EvidenciaRow[] = [{ item: '', detalle: '', observaciones: '' }];
  conceptosExtra: ConceptoExtra[] = [];
  /** Cache: evita bucle de change detection del getter en *ngFor. */
  filasFinCache: FilaFinanciera[] = [];

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
        text: 'No puede crear Memorias.',
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
    this.contracts.getMemoria(id).subscribe({
      next: (res) => {
        const h = res?.header;
        const det = Array.isArray(res?.detalle) ? res.detalle : [];
        if (!h) {
          this.loading = false;
          Swal.fire({
            icon: 'error',
            title: 'No encontrada',
            text: 'La memoria no existe.',
            confirmButtonColor: COLOR,
          }).then(() => this.volverLista());
          return;
        }
        this.memoriaId = Number(h.id);
        this.estadoMemoria = String(h.estado || '');
        this.readOnly = ['FINALIZADA', 'ANULADA'].includes(this.estadoMemoria);
        this.consecutivoPreview = h.consecutivo || '';
        this.observaciones = h.observaciones || '';
        this.tipoDocumento = h.tipo_documento || null;
        this.numeroContrato = h.numero_contrato || null;
        this.constructoraNombre = h.constructora || '';
        this.proyectoNombre = h.proyecto || '';
        if (h.fecha_acta) {
          const d = new Date(h.fecha_acta);
          this.fechaActa = Number.isNaN(d.getTime()) ? null : d;
        }
        this.porcentajes = {
          porc_adm: toPercentUi(h.porc_adm),
          porc_imp: toPercentUi(h.porc_imp),
          porc_ut: toPercentUi(h.porc_ut),
          porc_iva: toPercentUi(h.porc_iva),
          porc_amort_anticipo: toPercentUi(h.porc_amort_anticipo),
          porc_rete_garantia: toPercentUi(h.porc_rete_garantia),
        };
        try {
          const ev = h.evidencias_json
            ? JSON.parse(h.evidencias_json)
            : null;
          this.evidencias =
            Array.isArray(ev) && ev.length
              ? ev.map((e: any) => ({
                  item: e.item || '',
                  detalle: e.detalle || '',
                  observaciones: e.observaciones || '',
                }))
              : [{ item: '', detalle: '', observaciones: '' }];
        } catch {
          this.evidencias = [{ item: '', detalle: '', observaciones: '' }];
        }

        // Pintar de inmediato con lo guardado (no esperar contexto → evita UI colgada)
        this.contexto = {
          contrato: {
            numerodoc: h.numerodoc_contrato,
            numero_contrato: h.numero_contrato,
            constructora: h.constructora,
            proyecto: h.proyecto,
            tipo_contrato: h.tipo_documento,
            tipo_documento: h.tipo_documento,
            empresa_asociada: h.empresa_asociada,
            encargado_contrato: h.encargado_contrato,
          },
          resumen: {
            valor_inicial: null,
            acumulado_anterior: toNum(h.valor_neto),
            saldo_por_ejecutar: null,
            pct_ejecutado: null,
          },
          control: [],
          fecha_ultimo_corte: h.fecha_ultimo_corte,
        };
        this.contratoSeleccionado = true;
        this.applySavedDetalle(det, this.contexto);
        this.loading = false;

        // Enriquecer KPIs/contrato en segundo plano (si falla, la vista ya funciona)
        this.contracts
          .getMemoriasContexto({
            constructora: h.constructora || undefined,
            proyecto: h.proyecto || undefined,
            numero_contrato: String(h.numero_contrato || ''),
            tipo_documento: h.tipo_documento || undefined,
          })
          .subscribe({
            next: (ctx) => {
              if (!ctx) return;
              this.contexto = {
                ...ctx,
                // conservar detalle ya pintado; solo traer cabecera/resumen del contrato
              };
              this.applySavedDetalle(det, ctx);
            },
            error: () => {
              /* vista ya operativa con snapshot */
            },
          });
      },
      error: (err) => {
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.mensaje || 'No se pudo cargar la memoria.',
          confirmButtonColor: COLOR,
        }).then(() => this.volverLista());
      },
    });
  }

  /** Pinta el detalle guardado como líneas en acta + control. */
  private applySavedDetalle(det: any[], ctx: any): void {
    const vuByItem = new Map<string, number>(
      (ctx.control || []).map((c: any) => [
        String(c.item),
        Number(c.valor_unitario) || 0,
      ])
    );
    this.remisiones = det.map((d) => {
      const enviada = toNum(d.cantidad_enviada);
      const facturar = toNum(d.cantidad_facturar);
      return {
        remision_plano_id: Number(d.remision_plano_id) || 0,
        remision_numerodoc: d.remision_numerodoc || '',
        remision_material: d.remision_material || '',
        fecha: '',
        item: String(d.item || '').trim(),
        detalle: d.detalle || '',
        cantidad_enviada: enviada,
        cantidad_ya_facturada: 0,
        cantidad_pendiente: enviada,
        cantidad_a_facturar: facturar,
        diferencia: toNum(d.diferencia),
        um: d.um || '',
        locacion: d.locacion || '',
        observaciones: d.observaciones || '',
        valor_unitario:
          toNum(d.valor_unitario) ||
          vuByItem.get(String(d.item || '').trim()) ||
          0,
        selected: false,
        enActa: true,
      } as RemisionLinea;
    });
    this.syncControlFromActa();
  }

  onConstructoraChange(): void {
    this.proyectoOptions = [];
    this.proyectoNombre = '';
    this.documentoOptions = [];
    this.numeroContrato = null;
    this.resetContexto();
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
    this.resetContexto();
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

  buscar(): void {
    if (!this.numeroContrato) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Seleccione constructora, proyecto y N° documento.',
        confirmButtonColor: COLOR,
      });
      return;
    }
    this.loading = true;
    this.contratoSeleccionado = false;
    this.contracts
      .getMemoriasContexto({
        constructora: this.constructoraNombre,
        proyecto: this.proyectoNombre,
        numero_contrato: this.numeroContrato,
        tipo_documento: this.tipoDocumento || undefined,
      })
      .subscribe({
        next: (ctx) => {
          this.loading = false;
          this.contexto = ctx;
          this.consecutivoPreview = String(
            ctx?.siguiente_consecutivo || ctx?.consecutivo || 'MEM-0001'
          ).trim();
          const pct = ctx.porcentajes || {};
          this.porcentajes = {
            porc_adm: toPercentUi(pct.porc_adm),
            porc_imp: toPercentUi(pct.porc_imp),
            porc_ut: toPercentUi(pct.porc_ut),
            porc_iva: toPercentUi(pct.porc_iva),
            porc_amort_anticipo: toPercentUi(pct.porc_amort_anticipo),
            porc_rete_garantia: toPercentUi(pct.porc_rete_garantia),
          };
          const vuByItem = new Map<string, number>(
            (ctx.control || []).map((c: any) => [
              c.item,
              Number(c.valor_unitario) || 0,
            ])
          );
          this.remisiones = (ctx.remisiones || []).map((r: any) => ({
            ...r,
            selected: false,
            enActa: false,
            cantidad_a_facturar: toNum(r.cantidad_pendiente),
            diferencia: 0,
            valor_unitario: vuByItem.get(String(r.item || '').trim()) || 0,
          }));
          this.recalcDiferencias();
          this.control = (ctx.control || []).map((c: any) =>
            this.mapControlRow(c, 0)
          );
          this.refreshFilasFinancieras();
        },
        error: (err) => {
          this.loading = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.mensaje || 'No se pudo cargar el contrato.',
            confirmButtonColor: COLOR,
          });
        },
      });
  }

  seleccionarContrato(): void {
    this.contratoSeleccionado = true;
    if (!this.consecutivoPreview && this.contexto?.siguiente_consecutivo) {
      this.consecutivoPreview = String(this.contexto.siguiente_consecutivo);
    }
    if (!this.consecutivoPreview) {
      this.consecutivoPreview = 'MEM-0001';
    }
  }

  onCantFacturarChange(row: RemisionLinea): void {
    const max = toNum(row.cantidad_pendiente);
    if (toNum(row.cantidad_a_facturar) > max) {
      row.cantidad_a_facturar = max;
    }
    if (toNum(row.cantidad_a_facturar) < 0) {
      row.cantidad_a_facturar = 0;
    }
    this.recalcDiferencias();
    if (row.enActa) this.syncControlFromActa();
  }

  recalcDiferencias(): void {
    for (const r of this.remisiones) {
      r.diferencia = Number(
        (toNum(r.cantidad_pendiente) - toNum(r.cantidad_a_facturar)).toFixed(4)
      );
    }
  }

  adicionarRemisionesAActa(): void {
    const picked = this.remisiones.filter((r) => r.selected);
    if (!picked.length) {
      Swal.fire({
        icon: 'info',
        title: 'Sin selección',
        text: 'Marque al menos una remisión.',
        confirmButtonColor: COLOR,
      });
      return;
    }
    for (const r of picked) {
      r.enActa = true;
      r.selected = false;
    }
    this.syncControlFromActa();
    Swal.fire({
      icon: 'success',
      title: 'Agregado',
      text: `${picked.length} elemento(s) adicionados al acta.`,
      timer: 1400,
      showConfirmButton: false,
    });
  }

  syncControlFromActa(): void {
    const byItem = new Map<string, number>();
    for (const r of this.remisiones) {
      if (!r.enActa) continue;
      const item = String(r.item || '').trim();
      if (!item) continue;
      byItem.set(item, (byItem.get(item) || 0) + toNum(r.cantidad_a_facturar));
    }
    // Si el contrato no trae control, armar filas desde lo facturado en esta memoria
    const baseControl =
      this.contexto?.control?.length > 0
        ? this.contexto.control
        : [...byItem.keys()].map((item) => {
            const line = this.remisiones.find((r) => r.item === item && r.enActa);
            return {
              item,
              detalle: line?.detalle || '',
              um: line?.um || '',
              cantidad_contratada: 0,
              valor_unitario: line?.valor_unitario || 0,
              acumulado_anterior_cant: 0,
            };
          });
    this.control = baseControl.map((c: any) =>
      this.mapControlRow(c, byItem.get(String(c.item)) || 0)
    );
    this.refreshFilasFinancieras();
  }

  private mapControlRow(c: any, cantActa: number) {
    const vu = toNum(c.valor_unitario);
    const acumAnt = toNum(c.acumulado_anterior_cant);
    const acum = acumAnt + cantActa;
    return {
      ...c,
      cant_acta: cantActa,
      vr_parcial: Number((cantActa * vu).toFixed(2)),
      acumulado_anterior_valor: Number((acumAnt * vu).toFixed(2)),
      acumulado_total_cant: acum,
      acumulado_total_valor: Number((acum * vu).toFixed(2)),
      pct_ejecucion:
        toNum(c.cantidad_contratada) > 0
          ? Number(((acum / toNum(c.cantidad_contratada)) * 100).toFixed(2))
          : 0,
    };
  }

  get subtotalAnterior(): number {
    return this.control.reduce(
      (s, c) => s + toNum(c.acumulado_anterior_valor),
      0
    );
  }

  get subtotalPresente(): number {
    return this.control.reduce((s, c) => s + toNum(c.vr_parcial), 0);
  }

  get subtotalTotal(): number {
    return this.subtotalAnterior + this.subtotalPresente;
  }

  refreshFilasFinancieras(): void {
    this.filasFinCache = this.buildFilasFinancieras();
  }

  trackFilaFin(_index: number, f: FilaFinanciera): string {
    return `${f.label}-${f.extraIdx ?? f.porcKey ?? ''}`;
  }

  /** Filas de INFORMACIÓN DE CONTRATO (AIU / IVA / retenciones). */
  private buildFilasFinancieras(): FilaFinanciera[] {
    const p = this.porcentajes;
    const ant = this.subtotalAnterior;
    const pre = this.subtotalPresente;
    const tot = this.subtotalTotal;

    const admAnt = ant * (toNum(p.porc_adm) / 100);
    const admPre = pre * (toNum(p.porc_adm) / 100);
    const impAnt = ant * (toNum(p.porc_imp) / 100);
    const impPre = pre * (toNum(p.porc_imp) / 100);
    const utAnt = ant * (toNum(p.porc_ut) / 100);
    const utPre = pre * (toNum(p.porc_ut) / 100);
    const ivaAnt = utAnt * (toNum(p.porc_iva) / 100);
    const ivaPre = utPre * (toNum(p.porc_iva) / 100);

    const baseAnt = ant + admAnt + impAnt + utAnt + ivaAnt;
    const basePre = pre + admPre + impPre + utPre + ivaPre;

    const amortAnt = baseAnt * (toNum(p.porc_amort_anticipo) / 100);
    const amortPre = basePre * (toNum(p.porc_amort_anticipo) / 100);
    const reteAnt = baseAnt * (toNum(p.porc_rete_garantia) / 100);
    const retePre = basePre * (toNum(p.porc_rete_garantia) / 100);

    let extraAnt = 0;
    let extraPre = 0;
    const extraRows = this.conceptosExtra.map((c, i) => {
      const a = baseAnt * (toNum(c.porc) / 100);
      const pr = basePre * (toNum(c.porc) / 100);
      extraAnt += a;
      extraPre += pr;
      return {
        label: c.nombre || `Concepto ${i + 1}`,
        porc: toNum(c.porc),
        editable: true,
        ant: a,
        pre: pr,
        tot: a + pr,
        extraIdx: i,
      } as FilaFinanciera;
    });

    const netoAnt = baseAnt - amortAnt - reteAnt - extraAnt;
    const netoPre = basePre - amortPre - retePre - extraPre;

    return [
      {
        label: 'SUB - TOTAL COSTOS DIRECTOS',
        editable: false,
        ant,
        pre,
        tot,
        isSub: true,
      },
      {
        label: 'ADMINISTRACIÓN',
        porcKey: 'porc_adm',
        porc: p.porc_adm,
        editable: true,
        ant: admAnt,
        pre: admPre,
        tot: admAnt + admPre,
      },
      {
        label: 'IMPREVISTOS',
        porcKey: 'porc_imp',
        porc: p.porc_imp,
        editable: true,
        ant: impAnt,
        pre: impPre,
        tot: impAnt + impPre,
      },
      {
        label: 'UTILIDAD',
        porcKey: 'porc_ut',
        porc: p.porc_ut,
        editable: true,
        ant: utAnt,
        pre: utPre,
        tot: utAnt + utPre,
      },
      {
        label: 'IVA SOBRE UTILIDAD',
        porcKey: 'porc_iva',
        porc: p.porc_iva,
        editable: true,
        ant: ivaAnt,
        pre: ivaPre,
        tot: ivaAnt + ivaPre,
      },
      {
        label: 'AMORTIZACIÓN ANTICIPO',
        porcKey: 'porc_amort_anticipo',
        porc: p.porc_amort_anticipo,
        editable: true,
        ant: amortAnt,
        pre: amortPre,
        tot: amortAnt + amortPre,
      },
      {
        label: 'RETE GARANTÍA',
        porcKey: 'porc_rete_garantia',
        porc: p.porc_rete_garantia,
        editable: true,
        ant: reteAnt,
        pre: retePre,
        tot: reteAnt + retePre,
      },
      ...extraRows,
      {
        label: 'VALOR NETO A PAGAR',
        editable: false,
        ant: netoAnt,
        pre: netoPre,
        tot: netoAnt + netoPre,
        isNeto: true,
      },
    ];
  }

  onPorcChange(key: PorcentajeKey | undefined, value: number | null): void {
    if (!key) return;
    this.porcentajes[key] = toNum(value);
    this.refreshFilasFinancieras();
  }

  getPorc(key: PorcentajeKey | undefined): number {
    return key ? this.porcentajes[key] : 0;
  }

  extraNombre(i: number): string {
    return this.conceptosExtra[i]?.nombre ?? '';
  }

  setExtraNombre(i: number, v: string): void {
    if (this.conceptosExtra[i]) this.conceptosExtra[i].nombre = v;
  }

  extraPorc(i: number): number {
    return this.conceptosExtra[i]?.porc ?? 0;
  }

  setExtraPorc(i: number, v: number | null): void {
    if (this.conceptosExtra[i]) this.conceptosExtra[i].porc = toNum(v);
    this.refreshFilasFinancieras();
  }

  agregarConcepto(): void {
    this.conceptosExtra.push({ nombre: 'Nuevo concepto', porc: 0 });
    this.refreshFilasFinancieras();
  }

  quitarConcepto(i: number): void {
    this.conceptosExtra.splice(i, 1);
    this.refreshFilasFinancieras();
  }

  agregarEvidencia(): void {
    this.evidencias.push({ item: '', detalle: '', observaciones: '' });
  }

  quitarEvidencia(i: number): void {
    if (this.evidencias.length <= 1) {
      this.evidencias[0] = { item: '', detalle: '', observaciones: '' };
      return;
    }
    this.evidencias.splice(i, 1);
  }

  adicionarEvidenciaAActa(): void {
    const filled = this.evidencias.filter(
      (e) => e.item.trim() || e.detalle.trim() || e.observaciones.trim()
    );
    if (!filled.length) {
      Swal.fire({
        icon: 'info',
        title: 'Sin evidencia',
        text: 'Complete al menos un campo de evidencia.',
        confirmButtonColor: COLOR,
      });
      return;
    }
    Swal.fire({
      icon: 'success',
      title: 'Evidencia lista',
      text: 'Se incluirá al guardar la memoria.',
      timer: 1400,
      showConfirmButton: false,
    });
  }

  /** Anexo 1 · Registro fotográfico */
  async generarAnexoFotografico(): Promise<void> {
    await this.runPdf('Anexo fotográfico', (p) => this.memoriaPdf.generateAnexo(p));
  }

  /** Memoria de cálculo de cantidades (presente corte) */
  async generarFormatoActaActual(): Promise<void> {
    await this.runPdf('Formato acta actual', (p) =>
      this.memoriaPdf.generateMemoriaCalculo(p)
    );
  }

  /** Acta parcial de ejecución (acumulado + presente + total) */
  async generarAcumuladoActas(): Promise<void> {
    await this.runPdf('Acumulado actas', (p) =>
      this.memoriaPdf.generateActaParcial(p)
    );
  }

  private async runPdf(
    label: string,
    fn: (payload: MemoriaPdfPayload) => Promise<void>
  ): Promise<void> {
    if (!this.contratoSeleccionado || !this.contexto) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin contexto',
        text: 'Seleccione un contrato antes de generar el PDF.',
        confirmButtonColor: COLOR,
      });
      return;
    }
    if (this.generatingPdf) return;
    this.generatingPdf = true;
    Swal.fire({
      title: 'Generando PDF...',
      text: label,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(null),
    });
    try {
      // Cerrar el modal antes de capturar: el overlay de Swal interfiere con html2canvas.
      await new Promise((r) => setTimeout(r, 120));
      Swal.close();
      await new Promise((r) => setTimeout(r, 60));
      await fn(this.buildPdfPayload());
    } catch (err) {
      console.error('[Memorias PDF]', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `No se pudo generar el PDF (${label}).`,
        confirmButtonColor: COLOR,
      });
    } finally {
      this.generatingPdf = false;
    }
  }

  private buildPdfPayload(): MemoriaPdfPayload {
    const c = this.contexto?.contrato || {};
    const r = this.contexto?.resumen || {};
    const nombre = localStorage.getItem('nombreUsuario') || '';
    const apellido = localStorage.getItem('apellidoUsuario') || '';
    const elaboradoPor = `${nombre} ${apellido}`.trim() || 'Usuario';

    const control = (this.control || []).map((row) => ({
      item: String(row.item || ''),
      detalle: String(row.detalle || ''),
      um: String(row.um || ''),
      cantidad_contratada: toNum(row.cantidad_contratada),
      valor_unitario: toNum(row.valor_unitario),
      vr_total: Number(
        (toNum(row.cantidad_contratada) * toNum(row.valor_unitario)).toFixed(2)
      ),
      acumulado_anterior_cant: toNum(row.acumulado_anterior_cant),
      acumulado_anterior_valor: toNum(row.acumulado_anterior_valor),
      cant_acta: toNum(row.cant_acta),
      vr_parcial: toNum(row.vr_parcial),
      acumulado_total_cant: toNum(row.acumulado_total_cant),
      acumulado_total_valor: toNum(row.acumulado_total_valor),
    }));

    const remisionesActa = this.remisiones
      .filter((x) => x.enActa && toNum(x.cantidad_a_facturar) > 0)
      .map((x) => ({
        item: x.item,
        detalle: x.detalle,
        locacion: x.locacion || '',
        cantidad_a_facturar: toNum(x.cantidad_a_facturar),
        um: x.um || '',
        observaciones: x.observaciones || '',
      }));

    const vrContrato = toNum(r.valor_inicial ?? c.valor_contrato ?? c.valor_inicial);
    const vrAcumulado = this.subtotalTotal || toNum(r.acumulado_anterior);
    const saldo =
      r.saldo_por_ejecutar != null
        ? toNum(r.saldo_por_ejecutar)
        : Math.max(0, vrContrato - vrAcumulado);

    return {
      consecutivo: this.consecutivoPreview || 'MEM-0001',
      fechaActa: this.fechaActa,
      fechaCorte: this.contexto?.fecha_ultimo_corte || this.fechaActa,
      constructora: String(
        c.constructora || this.constructoraNombre || ''
      ),
      proyecto: String(c.proyecto || this.proyectoNombre || ''),
      numeroContrato: String(
        c.numero_contrato || this.numeroContrato || ''
      ),
      detalleObra: String(
        c.descripcion || c.detalle || c.objeto || c.proyecto || ''
      ),
      tipoContrato: String(
        c.tipo_documento || c.tipo_contrato || this.tipoDocumento || ''
      ),
      contratista: String(c.empresa_asociada || ''),
      empresaAsociadaId: c.empresa_asociada_id ?? c.empresa_asociada ?? null,
      vrContrato,
      vrAcumulado,
      saldo,
      vrAnticipo: toNum(c.valor_anticipo),
      control,
      remisionesActa,
      evidencias: (this.evidencias || []).map((e) => ({
        item: e.item,
        detalle: e.detalle,
        observaciones: e.observaciones,
      })),
      porcentajes: { ...this.porcentajes },
      conceptosExtra: this.conceptosExtra.map((x) => ({
        nombre: x.nombre,
        porc: toNum(x.porc),
      })),
      observaciones: this.observaciones || '',
      elaboradoPor,
      canViewValues: this.canViewValues,
    };
  }

  guardar(estado: 'BORRADOR' | 'GUARDADA', luegoFinalizar = false): void {
    if (this.readOnly || !this.canEdit) return;
    if (!this.contexto?.contrato || !this.contratoSeleccionado) return;

    const lineas = this.remisiones
      .filter((r) => r.enActa && toNum(r.cantidad_a_facturar) > 0)
      .map((r) => ({
        remision_plano_id: r.remision_plano_id,
        remision_numerodoc: r.remision_numerodoc,
        remision_material: r.remision_material,
        item: r.item,
        detalle: r.detalle,
        um: r.um,
        cantidad_enviada: r.cantidad_enviada,
        cantidad_facturar: r.cantidad_a_facturar,
        diferencia: r.diferencia,
        locacion: r.locacion,
        observaciones: r.observaciones,
        valor_unitario: r.valor_unitario || 0,
      }));

    if (estado === 'GUARDADA' && !lineas.length) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin cantidades',
        text: 'Adicione remisiones al acta con cantidad a facturar.',
        confirmButtonColor: COLOR,
      });
      return;
    }

    const cab = this.contexto.contrato;
    const payload: Record<string, unknown> = {
      estado,
      cabecera: {
        numerodoc_contrato: cab.numerodoc,
        numero_contrato: cab.numero_contrato,
        constructora: cab.constructora,
        proyecto: cab.proyecto,
        tipo_documento: this.tipoDocumento || cab.tipo_documento,
        empresa_asociada: cab.empresa_asociada,
        fecha_acta: this.fechaActa
          ? this.fechaActa.toISOString().slice(0, 10)
          : null,
        fecha_ultimo_corte: this.contexto.fecha_ultimo_corte,
        observaciones: this.observaciones,
      },
      porcentajes: this.porcentajes,
      lineas,
      evidencias: this.evidencias.filter(
        (e) => e.item.trim() || e.detalle.trim() || e.observaciones.trim()
      ),
    };
    if (this.memoriaId) payload['id'] = this.memoriaId;

    this.saving = true;
    this.contracts.guardarMemoria(payload).subscribe({
      next: (res) => {
        const id = Number(res?.data?.id);
        if (luegoFinalizar && id) {
          this.contracts.finalizarMemoria(id).subscribe({
            next: (fin) => {
              this.saving = false;
              Swal.fire({
                icon: 'success',
                title: 'Finalizada',
                text: fin?.mensaje || 'Memoria finalizada.',
                confirmButtonColor: COLOR,
              }).then(() =>
                this.volverLista()
              );
            },
            error: (err) => {
              this.saving = false;
              Swal.fire({
                icon: 'warning',
                title: 'Guardada, no finalizada',
                text:
                  err?.error?.mensaje ||
                  'La memoria se guardó pero no se pudo finalizar.',
                confirmButtonColor: COLOR,
              }).then(() => this.volverLista());
            },
          });
          return;
        }
        this.saving = false;
        Swal.fire({
          icon: 'success',
          title: 'Listo',
          text: res?.mensaje || 'Memoria guardada.',
          confirmButtonColor: COLOR,
        }).then(() => this.volverLista());
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
    if (this.readOnly || !this.canEdit) return;
    Swal.fire({
      icon: 'question',
      title: 'Finalizar memoria',
      text: 'Se guardará y quedará finalizada (no editable).',
      showCancelButton: true,
      confirmButtonColor: COLOR,
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Finalizar',
    }).then((r) => {
      if (r.isConfirmed) this.guardar('GUARDADA', true);
    });
  }

  volver(): void {
    if (this.isExisting) {
      this.volverLista();
      return;
    }
    this.router.navigate([HUB]);
  }

  volverLista(): void {
    this.router.navigate(['/dashboard/contracts/memorias']);
  }

  private resetContexto(): void {
    this.contexto = null;
    this.contratoSeleccionado = false;
    this.remisiones = [];
    this.control = [];
  }
}

function toNum(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** AIU: 0.09 = 9%. Escala UI 0–100. */
function toPercentUi(v: unknown): number {
  const n = toNum(v);
  if (n > 0 && n <= 1) return Number((n * 100).toFixed(4));
  return n;
}
