import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import html2pdf from 'html2pdf.js';

import { labelTipoContratoDocumento } from '../../../contracts/shared/constants/tipo-contrato.constants';
import { INVENTARIO_HUB_ROUTE, SelectOption } from '../../shared/inventario.models';
import {
  EntregaDevolucionDetalle,
  EntregaPorDevolverRow,
  EstadoDevolucionEntrega,
  InventarioService,
} from '../../shared/service/inventario.service';
import { fromIsoDate, toIsoDate } from '../../shared/ingreso-material.model';
import { FormatoMovimientoComponent } from '../../shared/components/formato-movimiento/formato-movimiento.component';
import {
  EMPRESA_IMPRESION,
  EmpresaImpresion,
  VALOR_OTRO,
  empresaDeUbicacion,
  etiquetaParametro,
  parametrosToOptions,
} from '../../shared/entrega-material.model';
import {
  DevolucionCabecera,
  DevolucionElemento,
  ESTADO_DEVOLUCION_FILTRO,
  ESTADO_DEVOLUCION_LABEL,
  estadoPorConcepto,
  itemEntregaToElemento,
  nuevaDevolucionCabecera,
} from '../../shared/devolucion-material.model';

interface FotoDevolucion {
  file: File;
  url: string;
}

const MAX_FOTOS = 10;
const MAX_FOTO_BYTES = 10 * 1024 * 1024;
const COLOR_SWAL = '#20506A';
/** Las alertas deben quedar sobre el p-dialog del formato. */
const SwalTop = Swal.mixin({ customClass: { container: 'ent-swal-top' } });

@Component({
  selector: 'app-inventario-devolucion-nueva',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    DropdownModule,
    CalendarModule,
    TableModule,
    DialogModule,
    FormatoMovimientoComponent,
  ],
  templateUrl: './devolucion-nueva.component.html',
  styleUrls: ['../entrega-nueva/entrega-nueva.component.scss', './devolucion-nueva.component.scss'],
})
export class DevolucionNuevaComponent implements OnInit, OnDestroy {
  @ViewChild('fotoInput') fotoInput?: ElementRef<HTMLInputElement>;

  cab: DevolucionCabecera = nuevaDevolucionCabecera();
  conceptoOptions: SelectOption[] = [];
  readonly estadoFiltroOptions = ESTADO_DEVOLUCION_FILTRO;
  readonly fechaHoy = new Date();

  filtroBuscar = '';
  filtroEstado: EstadoDevolucionEntrega | null = null;
  entregas: EntregaPorDevolverRow[] = [];
  buscando = false;

  /** Entrega que se está devolviendo (una devolución = una entrega). */
  entrega: EntregaPorDevolverRow | null = null;
  elementos: DevolucionElemento[] = [];
  cargandoEntregaId: number | null = null;
  fotos: FotoDevolucion[] = [];

  showDetalle = false;
  detalle: EntregaDevolucionDetalle | null = null;
  cargandoDetalleId: number | null = null;

  loadingConsecutivo = false;
  guardando = false;
  generandoPdf = false;
  showPreview = false;
  /** Consecutivo definitivo devuelto al guardar (habilita el PDF). */
  consecutivoGuardado: string | null = null;

  private conceptoAnterior: string | null = null;
  private subs = new Subscription();

  constructor(
    private inventarioService: InventarioService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarConsecutivo();
    this.cargarConceptos();
    this.buscarEntregas();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.fotos.forEach((f) => URL.revokeObjectURL(f.url));
  }

  /* ===================== Catálogos ===================== */

  cargarConsecutivo(): void {
    this.loadingConsecutivo = true;
    this.subs.add(
      this.inventarioService.siguienteConsecutivo('DEVOLUCION').subscribe({
        next: (res) => {
          this.cab.consecutivo = res.data.consecutivo;
          this.loadingConsecutivo = false;
        },
        error: () => {
          this.loadingConsecutivo = false;
        },
      })
    );
  }

  private cargarConceptos(): void {
    this.subs.add(
      this.inventarioService.listarParametros(['CONCEPTO_DEVOLUCION']).subscribe({
        next: (res) => {
          this.conceptoOptions = parametrosToOptions((res.data || []).map((r) => r.valor));
        },
        error: () => {
          this.conceptoOptions = [];
        },
      })
    );
  }

  /* ===================== Cabecera ===================== */

  /** El estado sugerido de cada elemento sigue al concepto mientras el usuario no lo haya cambiado. */
  onConceptoChange(): void {
    const anterior = estadoPorConcepto(this.conceptoAnterior);
    const nuevo = estadoPorConcepto(this.cab.concepto);
    for (const e of this.elementos) {
      if (!e.estado.trim() || e.estado === anterior) e.estado = nuevo;
    }
    this.conceptoAnterior = this.cab.concepto;
  }

  get fechaMinima(): Date | null {
    return this.entrega ? fromIsoDate(this.entrega.fecha_entrega) : null;
  }

  /* ===================== Buscar entregas ===================== */

  buscarEntregas(): void {
    this.buscando = true;
    this.subs.add(
      this.inventarioService
        .listarEntregasPorDevolver({ buscar: this.filtroBuscar, estado: this.filtroEstado })
        .subscribe({
          next: (res) => {
            this.entregas = res.data || [];
            this.buscando = false;
          },
          error: (err) => {
            this.entregas = [];
            this.buscando = false;
            SwalTop.fire({
              icon: 'error',
              title: 'Error',
              text: err?.error?.mensaje || 'No se pudieron consultar las entregas.',
              confirmButtonColor: COLOR_SWAL,
            });
          },
        })
    );
  }

  limpiarFiltros(): void {
    this.filtroBuscar = '';
    this.filtroEstado = null;
    this.buscarEntregas();
  }

  etiquetaEstado(estado: EstadoDevolucionEntrega): string {
    return ESTADO_DEVOLUCION_LABEL[estado] ?? estado;
  }

  conceptoEntrega(row: { concepto: string | null; concepto_detalle: string | null }): string {
    if (!row.concepto) return '';
    return row.concepto === VALOR_OTRO && row.concepto_detalle ? row.concepto_detalle : etiquetaParametro(row.concepto);
  }

  proyectoEntrega(row: EntregaPorDevolverRow | null): string {
    return row ? row.proyecto || row.ubicacion_entrega || '' : '';
  }

  verEntrega(row: EntregaPorDevolverRow): void {
    this.cargarDetalle(row.id_movimiento, (detalle) => {
      this.detalle = detalle;
      this.showDetalle = true;
    });
  }

  devolverEntrega(row: EntregaPorDevolverRow): void {
    if (row.estado_devolucion === 'DEVUELTO') {
      this.aviso(`La entrega ${row.consecutivo} ya fue devuelta por completo.`);
      return;
    }
    if (this.entrega && this.entrega.id_movimiento !== row.id_movimiento && this.elementos.length) {
      SwalTop.fire({
        icon: 'question',
        title: 'Cambiar de entrega',
        text: `Se reemplazarán los elementos de la entrega ${this.entrega.consecutivo} por los de ${row.consecutivo}.`,
        showCancelButton: true,
        confirmButtonText: 'Cambiar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: COLOR_SWAL,
      }).then((r) => {
        if (r.isConfirmed) this.cargarElementos(row);
      });
      return;
    }
    this.cargarElementos(row);
  }

  private cargarElementos(row: EntregaPorDevolverRow): void {
    this.cargandoEntregaId = row.id_movimiento;
    this.cargarDetalle(row.id_movimiento, (detalle) => {
      this.cargandoEntregaId = null;
      const estado = estadoPorConcepto(this.cab.concepto);
      const pendientes = detalle.items.filter((it) => Number(it.cantidad_pendiente) > 0);
      if (!pendientes.length) {
        this.aviso(`La entrega ${row.consecutivo} no tiene elementos pendientes por devolver.`);
        return;
      }
      this.entrega = detalle.entrega;
      this.elementos = pendientes.map((it) => itemEntregaToElemento(it, estado));
      const minima = this.fechaMinima;
      if (minima && this.cab.fecha && this.cab.fecha < minima) this.cab.fecha = minima;
    }, () => {
      this.cargandoEntregaId = null;
    });
  }

  private cargarDetalle(
    idMovimiento: number,
    ok: (detalle: EntregaDevolucionDetalle) => void,
    fallo?: () => void
  ): void {
    this.cargandoDetalleId = idMovimiento;
    this.subs.add(
      this.inventarioService.detalleEntregaDevolucion(idMovimiento).subscribe({
        next: (res) => {
          this.cargandoDetalleId = null;
          ok(res.data);
        },
        error: (err) => {
          this.cargandoDetalleId = null;
          fallo?.();
          SwalTop.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.mensaje || 'No se pudo consultar la entrega.',
            confirmButtonColor: COLOR_SWAL,
          });
        },
      })
    );
  }

  quitarElemento(index: number): void {
    this.elementos = this.elementos.filter((_, i) => i !== index);
    if (!this.elementos.length) this.entrega = null;
  }

  /* ===================== Fotos ===================== */

  abrirFotos(): void {
    this.fotoInput?.nativeElement.click();
  }

  onFotosSeleccionadas(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    const rechazadas: string[] = [];

    for (const file of files) {
      if (this.fotos.length >= MAX_FOTOS) {
        rechazadas.push(`${file.name}: máximo ${MAX_FOTOS} fotos`);
        continue;
      }
      if (!file.type.startsWith('image/')) {
        rechazadas.push(`${file.name}: no es una imagen`);
        continue;
      }
      if (file.size > MAX_FOTO_BYTES) {
        rechazadas.push(`${file.name}: supera 10 MB`);
        continue;
      }
      this.fotos = [...this.fotos, { file, url: URL.createObjectURL(file) }];
    }

    if (rechazadas.length) {
      SwalTop.fire({
        icon: 'warning',
        title: 'Algunas fotos no se agregaron',
        html: rechazadas.join('<br>'),
        confirmButtonColor: COLOR_SWAL,
      });
    }
  }

  quitarFoto(index: number): void {
    URL.revokeObjectURL(this.fotos[index].url);
    this.fotos = this.fotos.filter((_, i) => i !== index);
  }

  /* ===================== Previsualizar / formato ===================== */

  private validar(): string | null {
    const c = this.cab;
    const consecutivo = c.consecutivo.trim().toUpperCase();
    if (!consecutivo) return 'Ingrese el consecutivo de devolución.';
    if (consecutivo.length > 20 || !/^[A-Z0-9-]+$/.test(consecutivo)) {
      return 'El consecutivo solo admite letras, números y guion (máx. 20).';
    }
    if (!c.concepto) return 'Seleccione el concepto de devolución.';
    if (!c.fecha) return 'Seleccione la fecha de devolución.';
    if (toIsoDate(c.fecha)! > toIsoDate(this.fechaHoy)!) return 'La fecha de devolución no puede ser posterior a hoy.';
    if (!this.entrega || !this.elementos.length) {
      return 'Seleccione en "Buscar entregas" la entrega a devolver (botón +).';
    }
    if (toIsoDate(c.fecha)! < this.entrega.fecha_entrega) {
      return `La fecha de devolución no puede ser anterior a la entrega (${this.fechaTexto(this.entrega.fecha_entrega)}).`;
    }
    for (const e of this.elementos) {
      const cantidad = Number(e.cantidad);
      if (!(cantidad > 0)) return `Indique la cantidad a devolver de ${e.codigo} o quite el elemento.`;
      if (cantidad > e.pendiente) return `${e.codigo}: la cantidad supera lo pendiente (${e.pendiente} ${e.um}).`;
    }
    return null;
  }

  previsualizar(): void {
    const error = this.validar();
    if (error) {
      this.aviso(error);
      return;
    }
    this.cab.consecutivo = this.cab.consecutivo.trim().toUpperCase();
    this.showPreview = true;
  }

  get empresaImpresion(): EmpresaImpresion | null {
    const id = this.entrega?.id_empresa ?? (this.elementos.length ? empresaDeUbicacion(this.elementos[0].ubicacion) : null);
    return id ? EMPRESA_IMPRESION[id] ?? null : null;
  }

  get observacionesFormato(): string {
    const obs = this.cab.observaciones.trim();
    const ref = `Devolución de la entrega ${this.entrega?.consecutivo ?? ''} del ${this.fechaTexto(this.entrega?.fecha_entrega)}.`;
    return obs ? `${obs} — ${ref}` : ref;
  }

  get consecutivoFormato(): string {
    return this.consecutivoGuardado ?? this.cab.consecutivo;
  }

  get conceptoTexto(): string {
    return this.cab.concepto ? etiquetaParametro(this.cab.concepto) : '';
  }

  get areaTexto(): string {
    const e = this.entrega;
    if (!e?.area) return '';
    return e.area === VALOR_OTRO && e.area_detalle ? e.area_detalle : etiquetaParametro(e.area);
  }

  get tipoDocTexto(): string {
    return labelTipoContratoDocumento(this.entrega?.tipo_doc_ref ?? null);
  }

  /** Lo que queda pendiente de la entrega después de esta devolución. */
  get pendienteRestante(): number {
    return this.elementos.reduce((acc, e) => acc + Math.max(0, e.pendiente - Number(e.cantidad || 0)), 0);
  }

  fechaTexto(iso: string | null | undefined): string {
    const d = fromIsoDate(iso);
    return d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` : '';
  }

  /* ===================== Guardar ===================== */

  guardar(): void {
    if (this.guardando || this.consecutivoGuardado) return;
    const error = this.validar();
    if (error) {
      this.aviso(error);
      return;
    }
    const restante = this.pendienteRestante;
    const nota = restante > 0
      ? `<br><br>La entrega ${this.entrega!.consecutivo} quedará con ${restante} unidad(es) pendiente(s) por devolver.`
      : `<br><br>La entrega ${this.entrega!.consecutivo} quedará devuelta por completo.`;

    SwalTop.fire({
      icon: 'question',
      title: '¿Guardar devolución?',
      html: `Se registrará la devolución ${this.cab.consecutivo} (${this.conceptoTexto}) con ${this.elementos.length} elemento(s).${nota}`,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: COLOR_SWAL,
    }).then((r) => {
      if (r.isConfirmed) this.enviar();
    });
  }

  private enviar(): void {
    const c = this.cab;
    this.guardando = true;
    this.subs.add(
      this.inventarioService
        .registrarDevolucion({
          id_movimiento_entrega: this.entrega!.id_movimiento,
          consecutivo: c.consecutivo.trim().toUpperCase(),
          fecha_devolucion: toIsoDate(c.fecha),
          concepto_devolucion: c.concepto,
          autoriza: c.autoriza.trim() || null,
          transporte: c.transporte.trim() || null,
          observaciones: c.observaciones.trim() || null,
          items: this.elementos.map((e) => ({
            id_detalle_origen: e.idDetalleOrigen,
            cantidad: Number(e.cantidad),
            estado_material: e.estado.trim() || null,
            observaciones: e.observaciones.trim() || null,
          })),
        })
        .subscribe({
          next: (res) => {
            this.consecutivoGuardado = res.data.consecutivo;
            this.cab.consecutivo = res.data.consecutivo;
            this.subirFotos(res.data.id_movimiento, res.mensaje);
          },
          error: (err) => {
            this.guardando = false;
            if (err?.status === 409 && err?.error?.data?.consecutivo_sugerido) {
              this.consecutivoDuplicado(err.error.mensaje, err.error.data.consecutivo_sugerido);
              return;
            }
            SwalTop.fire({
              icon: 'error',
              title: 'No se guardó la devolución',
              text: err?.error?.mensaje || 'Ocurrió un error al guardar. Los datos siguen en el formulario.',
              confirmButtonColor: COLOR_SWAL,
            });
          },
        })
    );
  }

  private consecutivoDuplicado(mensaje: string, sugerido: string): void {
    SwalTop.fire({
      icon: 'warning',
      title: 'Consecutivo en uso',
      text: mensaje,
      showCancelButton: true,
      confirmButtonText: `Usar ${sugerido} y guardar`,
      cancelButtonText: 'Editar manualmente',
      confirmButtonColor: COLOR_SWAL,
    }).then((r) => {
      this.cab.consecutivo = sugerido;
      if (r.isConfirmed) {
        this.enviar();
      } else {
        this.showPreview = false;
      }
    });
  }

  private subirFotos(idMovimiento: number, mensaje: string): void {
    const listo = (aviso?: string) => {
      this.guardando = false;
      this.buscarEntregas();
      SwalTop.fire({
        icon: aviso ? 'warning' : 'success',
        title: `Devolución ${this.consecutivoGuardado}`,
        html: aviso ? `${mensaje}<br><br>${aviso}` : `${mensaje}<br>Ya puede generar el PDF.`,
        confirmButtonColor: COLOR_SWAL,
      });
    };

    if (!this.fotos.length) {
      listo();
      return;
    }
    this.subs.add(
      this.inventarioService.subirAdjuntos(idMovimiento, this.fotos.map((f) => f.file)).subscribe({
        next: () => listo(),
        error: (err) =>
          listo(`La devolución quedó guardada, pero las fotos no se pudieron subir: ${err?.error?.mensaje || 'error de red'}.`),
      })
    );
  }

  descargarPdf(): void {
    if (!this.consecutivoGuardado || this.generandoPdf) return;
    const element = document.getElementById('devolucionFormato');
    if (!element) return;

    this.generandoPdf = true;
    SwalTop.fire({
      title: 'Generando PDF...',
      text: 'Por favor espere',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(null),
    });

    const proyecto = this.proyectoEntrega(this.entrega).replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
    const filename = proyecto
      ? `Devolucion_${this.consecutivoGuardado}_${proyecto}.pdf`
      : `Devolucion_${this.consecutivoGuardado}.pdf`;

    html2pdf()
      .set({
        margin: 5,
        filename,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm' as const, format: 'letter' as const, orientation: 'portrait' as const },
      })
      .from(element)
      .save()
      .then(() => Swal.close())
      .catch(() => SwalTop.fire('Error', 'No se pudo generar el PDF.', 'error'))
      .finally(() => {
        this.generandoPdf = false;
      });
  }

  nuevaDevolucion(): void {
    this.fotos.forEach((f) => URL.revokeObjectURL(f.url));
    this.fotos = [];
    this.elementos = [];
    this.entrega = null;
    this.cab = nuevaDevolucionCabecera();
    this.conceptoAnterior = null;
    this.consecutivoGuardado = null;
    this.showPreview = false;
    this.cargarConsecutivo();
    this.buscarEntregas();
  }

  private aviso(text: string): void {
    SwalTop.fire({ icon: 'warning', title: 'Datos incompletos', text, confirmButtonColor: COLOR_SWAL });
  }

  volver(): void {
    this.router.navigate([INVENTARIO_HUB_ROUTE]);
  }
}
