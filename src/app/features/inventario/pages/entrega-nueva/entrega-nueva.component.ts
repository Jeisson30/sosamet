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

import { AdministracionService } from '../../../administracion/shared/service/administracion.service';
import { GestionService } from '../../../gestion/shared/service/gestion.service';
import { CatalogService, ConstructoraDto, ProyectoDto } from '../../../../shared/services/catalog.service';
import {
  TIPO_CONTRATO_DOCUMENTO_OPTIONS,
  labelTipoContratoDocumento,
} from '../../../contracts/shared/constants/tipo-contrato.constants';
import { INVENTARIO_HUB_ROUTE, SelectOption } from '../../shared/inventario.models';
import { InventarioService, MovimientoItemPayload } from '../../shared/service/inventario.service';
import { toIsoDate } from '../../shared/ingreso-material.model';
import { FormatoMovimientoComponent } from '../../shared/components/formato-movimiento/formato-movimiento.component';
import {
  EMPRESA_IMPRESION,
  EmpresaImpresion,
  EntregaBusquedaRow,
  EntregaCabecera,
  EntregaElemento,
  TIPO_ENTREGA_OPTIONS,
  VALOR_OTRO,
  claveStock,
  empresaDeUbicacion,
  etiquetaParametro,
  nuevaEntregaCabecera,
  parametrosToOptions,
} from '../../shared/entrega-material.model';

interface FotoEntrega {
  file: File;
  url: string;
}

const MAX_FOTOS = 10;
const MAX_FOTO_BYTES = 10 * 1024 * 1024;
const COLOR_SWAL = '#20506A';
/** Las alertas deben quedar sobre el p-dialog del formato. */
const SwalTop = Swal.mixin({ customClass: { container: 'ent-swal-top' } });

@Component({
  selector: 'app-inventario-entrega-nueva',
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
  templateUrl: './entrega-nueva.component.html',
  styleUrls: ['./entrega-nueva.component.scss'],
})
export class EntregaNuevaComponent implements OnInit, OnDestroy {
  @ViewChild('fotoInput') fotoInput?: ElementRef<HTMLInputElement>;

  cab: EntregaCabecera = nuevaEntregaCabecera();
  elementos: EntregaElemento[] = [];
  fotos: FotoEntrega[] = [];

  conceptoOptions: SelectOption[] = [];
  areaOptions: SelectOption[] = [];
  usuarioOptions: { label: string; value: number }[] = [];
  constructoraOptions: SelectOption[] = [];
  proyectoOptions: SelectOption[] = [];
  documentoNumeroOptions: SelectOption[] = [];
  categoriaOptions: SelectOption[] = [];
  readonly tipoDocOptions = TIPO_CONTRATO_DOCUMENTO_OPTIONS;
  readonly tipoEntregaOptions = TIPO_ENTREGA_OPTIONS;

  filtroCategoria: string | null = null;
  filtroBuscar = '';
  resultados: EntregaBusquedaRow[] = [];
  buscando = false;

  loadingConsecutivo = false;
  loadingUsuarios = false;
  loadingDocumentos = false;
  guardando = false;
  generandoPdf = false;

  showPreview = false;
  /** Consecutivo definitivo devuelto al guardar (habilita el PDF). */
  consecutivoGuardado: string | null = null;
  readonly fechaHoy = new Date();

  private subs = new Subscription();

  constructor(
    private inventarioService: InventarioService,
    private administracionService: AdministracionService,
    private gestionService: GestionService,
    private catalogService: CatalogService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarConsecutivo();
    this.cargarParametros();
    this.cargarUsuarios();
    this.cargarConstructoras();
    this.cargarCategorias();
    this.buscarMaterial();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.fotos.forEach((f) => URL.revokeObjectURL(f.url));
  }

  /* ===================== Catálogos ===================== */

  cargarConsecutivo(): void {
    this.loadingConsecutivo = true;
    this.subs.add(
      this.inventarioService.siguienteConsecutivo('DESPACHO').subscribe({
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

  private cargarParametros(): void {
    this.subs.add(
      this.inventarioService.listarParametros(['CONCEPTO_ENTREGA', 'AREA']).subscribe({
        next: (res) => {
          const rows = res.data || [];
          this.conceptoOptions = parametrosToOptions(rows.filter((r) => r.grupo === 'CONCEPTO_ENTREGA').map((r) => r.valor));
          this.areaOptions = parametrosToOptions(rows.filter((r) => r.grupo === 'AREA').map((r) => r.valor));
        },
        error: () => {
          this.conceptoOptions = [];
          this.areaOptions = [];
        },
      })
    );
  }

  private cargarUsuarios(): void {
    this.loadingUsuarios = true;
    this.subs.add(
      this.gestionService.getAllUsers().subscribe({
        next: (res) => {
          const list = Array.isArray(res?.data) ? res.data : [];
          this.usuarioOptions = list
            .filter((u) => String(u.estado || '').toUpperCase() === 'ACTIVO')
            .map((u) => ({ label: `${u.nombre} ${u.apellido} - ${u.perfil}`, value: u.id_usuario }));
          this.loadingUsuarios = false;
        },
        error: () => {
          this.usuarioOptions = [];
          this.loadingUsuarios = false;
        },
      })
    );
  }

  private cargarConstructoras(): void {
    this.subs.add(
      this.catalogService.getConstructoras().subscribe({
        next: (list: ConstructoraDto[]) => {
          this.constructoraOptions = list.map((c) => ({ label: c.nombre, value: String(c.id) }));
        },
        error: () => {
          this.constructoraOptions = [];
        },
      })
    );
  }

  private cargarCategorias(): void {
    this.subs.add(
      this.administracionService.listarInvCategorias('ACTIVO').subscribe({
        next: (res) => {
          this.categoriaOptions = (res.data || []).map((c) => ({ label: c.nombre, value: String(c.id_categoria) }));
        },
        error: () => {
          this.categoriaOptions = [];
        },
      })
    );
  }

  /* ===================== Constructora → Proyecto → Tipo doc → No. doc ===================== */

  onConstructoraChange(): void {
    this.cab.idProyecto = null;
    this.cab.tipoDoc = null;
    this.cab.numeroDoc = null;
    this.proyectoOptions = [];
    this.documentoNumeroOptions = [];
    const id = this.cab.idConstructora;
    if (!id) return;
    this.subs.add(
      this.catalogService.getProyectosByConstructora(id).subscribe({
        next: (list: ProyectoDto[]) => {
          this.proyectoOptions = list.map((p) => ({ label: p.nombre, value: String(p.id) }));
        },
        error: () => {
          this.proyectoOptions = [];
        },
      })
    );
  }

  onProyectoChange(): void {
    this.cab.tipoDoc = null;
    this.cab.numeroDoc = null;
    this.documentoNumeroOptions = [];
  }

  onTipoDocChange(): void {
    this.cab.numeroDoc = null;
    this.documentoNumeroOptions = [];
    const idProyecto = Number(this.cab.idProyecto);
    const tipo = String(this.cab.tipoDoc || '').trim();
    if (!Number.isFinite(idProyecto) || idProyecto <= 0 || !tipo) return;

    this.loadingDocumentos = true;
    this.subs.add(
      this.administracionService
        .listarDocumentosNumero({ id_proyecto: idProyecto, tipo_doc: tipo, estado: 'ACTIVO' })
        .subscribe({
          next: (res) => {
            const list = Array.isArray(res?.data) ? res.data : [];
            this.documentoNumeroOptions = list.map((d) => {
              const numero = String(d.numero_documento || '').trim();
              return { label: numero, value: numero };
            });
            this.loadingDocumentos = false;
          },
          error: () => {
            this.documentoNumeroOptions = [];
            this.loadingDocumentos = false;
          },
        })
    );
  }

  /* ===================== Cabecera ===================== */

  get conceptoEsOtro(): boolean {
    return this.cab.concepto === VALOR_OTRO;
  }

  get areaEsOtro(): boolean {
    return this.cab.area === VALOR_OTRO;
  }

  get requiereDevolucion(): boolean {
    return this.cab.tipoEntrega === 'REQUIERE_DEVOLUCION';
  }

  onConceptoChange(): void {
    if (!this.conceptoEsOtro) this.cab.conceptoDetalle = '';
  }

  onAreaChange(): void {
    if (!this.areaEsOtro) this.cab.areaDetalle = '';
  }

  onTipoEntregaChange(): void {
    if (!this.requiereDevolucion) this.cab.fechaDevolucion = null;
  }

  /* ===================== Buscar material ===================== */

  buscarMaterial(): void {
    this.buscando = true;
    this.subs.add(
      this.inventarioService
        .listarExistencias({
          id_categoria: this.filtroCategoria,
          buscar: this.filtroBuscar,
          solo_disponibles: '1',
        })
        .subscribe({
          next: (res) => {
            this.resultados = (res.data || []).map((r) => ({
              ...r,
              cantidad: null,
              ancho: null,
              alto: null,
              estado: '',
              observaciones: '',
            }));
            this.buscando = false;
          },
          error: (err) => {
            this.resultados = [];
            this.buscando = false;
            SwalTop.fire({
              icon: 'error',
              title: 'Error',
              text: err?.error?.mensaje || 'No se pudo consultar el inventario.',
              confirmButtonColor: COLOR_SWAL,
            });
          },
        })
    );
  }

  /** Existente menos lo que ya se agregó en esta entrega para el mismo código + ubicación + U.M. */
  disponible(row: EntregaBusquedaRow): number {
    const clave = claveStock(row);
    const usado = this.elementos
      .filter((e) => claveStock(e) === clave)
      .reduce((acc, e) => acc + e.cantidad, 0);
    return Math.max(0, Number(row.saldo) - usado);
  }

  agregarElemento(row: EntregaBusquedaRow): void {
    const cantidad = Number(row.cantidad);
    const disponible = this.disponible(row);
    if (!(cantidad > 0)) {
      this.aviso('Ingrese la cantidad a entregar.');
      return;
    }
    if (cantidad > disponible) {
      this.aviso(`La cantidad supera lo disponible (${disponible} ${row.um}).`);
      return;
    }
    const empresaActual = this.idEmpresa;
    if (empresaActual && empresaDeUbicacion(row.ubicacion) !== empresaActual) {
      this.aviso(
        `La entrega ya tiene material de ${this.elementos[0].ubicacion}. ` +
          'Registre en otra entrega el material de la otra planta (cada formato lleva el logo de su empresa).'
      );
      return;
    }

    this.elementos = [
      ...this.elementos,
      {
        idMaterial: row.id_material,
        codigo: row.codigo,
        descripcion: row.descripcion,
        categoria: row.categoria,
        ubicacion: row.ubicacion,
        um: row.um,
        cantidad,
        ancho: row.ancho,
        alto: row.alto,
        estado: row.estado.trim(),
        observaciones: row.observaciones.trim(),
      },
    ];
    row.cantidad = null;
    row.ancho = null;
    row.alto = null;
    row.estado = '';
    row.observaciones = '';
  }

  quitarElemento(index: number): void {
    this.elementos = this.elementos.filter((_, i) => i !== index);
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
    if (!consecutivo) return 'Ingrese el consecutivo de entrega.';
    if (consecutivo.length > 20 || !/^[A-Z0-9-]+$/.test(consecutivo)) {
      return 'El consecutivo solo admite letras, números y guion (máx. 20).';
    }
    if (!c.fecha) return 'Seleccione la fecha de entrega.';
    if (!c.concepto) return 'Seleccione el concepto.';
    if (this.conceptoEsOtro && !c.conceptoDetalle.trim()) return 'Indique cuál es el concepto.';
    if (!c.area) return 'Seleccione el área.';
    if (this.areaEsOtro && !c.areaDetalle.trim()) return 'Indique cuál es el área.';
    if (!c.idUsuarioEntregado) return 'Seleccione a quién se entrega.';
    if (!c.tipoEntrega) return 'Seleccione el tipo de entrega.';
    if (this.requiereDevolucion) {
      if (!c.fechaDevolucion) return 'Seleccione la fecha prevista de devolución.';
      if (toIsoDate(c.fechaDevolucion)! < toIsoDate(c.fecha)!) {
        return 'La fecha prevista de devolución no puede ser anterior a la fecha de entrega.';
      }
    }
    if (!this.elementos.length) return 'Agregue al menos un elemento a la entrega.';
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
    const id = this.idEmpresa;
    return id ? EMPRESA_IMPRESION[id] ?? null : null;
  }

  /** La empresa (logo del formato) sale de la ubicación del material: Planta Sosamet / Planta Hierros. */
  get idEmpresa(): number | null {
    return this.elementos.length ? empresaDeUbicacion(this.elementos[0].ubicacion) : null;
  }

  get observacionesFormato(): string {
    const obs = this.cab.observaciones.trim();
    if (!this.requiereDevolucion || !this.cab.fechaDevolucion) return obs;
    const d = this.cab.fechaDevolucion;
    const fecha = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    return `${obs ? `${obs} — ` : ''}Requiere devolución el ${fecha}.`;
  }

  get consecutivoFormato(): string {
    return this.consecutivoGuardado ?? this.cab.consecutivo;
  }

  get entregadoANombre(): string {
    return this.usuarioOptions.find((u) => u.value === this.cab.idUsuarioEntregado)?.label.split(' - ')[0] ?? '';
  }

  get conceptoTexto(): string {
    if (!this.cab.concepto) return '';
    return this.conceptoEsOtro ? this.cab.conceptoDetalle.trim() : etiquetaParametro(this.cab.concepto);
  }

  get areaTexto(): string {
    if (!this.cab.area) return '';
    return this.areaEsOtro ? this.cab.areaDetalle.trim() : etiquetaParametro(this.cab.area);
  }

  get proyectoTexto(): string {
    const proyecto = this.proyectoOptions.find((p) => p.value === this.cab.idProyecto)?.label ?? '';
    return proyecto || this.cab.ubicacionEntrega.trim();
  }

  get tipoDocTexto(): string {
    return labelTipoContratoDocumento(this.cab.tipoDoc);
  }

  /* ===================== Guardar ===================== */

  guardar(): void {
    if (this.guardando || this.consecutivoGuardado) return;
    const error = this.validar();
    if (error) {
      this.aviso(error);
      return;
    }

    SwalTop.fire({
      icon: 'question',
      title: '¿Guardar entrega?',
      text: `Se registrará la entrega ${this.cab.consecutivo} con ${this.elementos.length} elemento(s) y se descontará del inventario.`,
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
    const items: MovimientoItemPayload[] = this.elementos.map((e) => ({
      codigo: e.codigo,
      cantidad: e.cantidad,
      um: e.um,
      ubicacion: e.ubicacion,
      descripcion: e.descripcion,
      ancho: e.ancho,
      alto: e.alto,
      estado_material: e.estado,
      observaciones: e.observaciones,
    }));

    this.guardando = true;
    this.subs.add(
      this.inventarioService
        .registrarMovimiento({
          tipo_movimiento: 'DESPACHO',
          origen: 'MANUAL',
          consecutivo: c.consecutivo.trim().toUpperCase(),
          fecha_movimiento: toIsoDate(c.fecha),
          id_empresa: this.idEmpresa,
          concepto: c.concepto,
          concepto_detalle: this.conceptoEsOtro ? c.conceptoDetalle.trim() : null,
          area: c.area,
          area_detalle: this.areaEsOtro ? c.areaDetalle.trim() : null,
          id_usuario_entregado: c.idUsuarioEntregado,
          id_constructora: c.idConstructora ? Number(c.idConstructora) : null,
          id_proyecto: c.idProyecto ? Number(c.idProyecto) : null,
          tipo_doc_ref: c.tipoDoc,
          numerodoc_ref: c.numeroDoc,
          ubicacion_entrega: c.ubicacionEntrega.trim() || null,
          tipo_entrega: c.tipoEntrega,
          fecha_prevista_devolucion: this.requiereDevolucion ? toIsoDate(c.fechaDevolucion) : null,
          autoriza: c.autoriza.trim() || null,
          transporte: c.transporte.trim() || null,
          observaciones: c.observaciones.trim() || null,
          items,
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
              title: 'No se guardó la entrega',
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
      this.buscarMaterial();
      SwalTop.fire({
        icon: aviso ? 'warning' : 'success',
        title: `Entrega ${this.consecutivoGuardado}`,
        html: aviso ? `${mensaje}<br><br>${aviso}` : `${mensaje}<br>Ya puede descargar el formato.`,
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
          listo(`La entrega quedó guardada, pero las fotos no se pudieron subir: ${err?.error?.mensaje || 'error de red'}.`),
      })
    );
  }

  descargarPdf(): void {
    if (!this.consecutivoGuardado || this.generandoPdf) return;
    const element = document.getElementById('entregaFormato');
    if (!element) return;

    this.generandoPdf = true;
    SwalTop.fire({
      title: 'Generando PDF...',
      text: 'Por favor espere',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(null),
    });

    const proyecto = this.proyectoTexto.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
    const filename = proyecto
      ? `Entrega_${this.consecutivoGuardado}_${proyecto}.pdf`
      : `Entrega_${this.consecutivoGuardado}.pdf`;

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

  nuevaEntrega(): void {
    this.fotos.forEach((f) => URL.revokeObjectURL(f.url));
    this.fotos = [];
    this.elementos = [];
    this.cab = nuevaEntregaCabecera();
    this.proyectoOptions = [];
    this.documentoNumeroOptions = [];
    this.consecutivoGuardado = null;
    this.showPreview = false;
    this.cargarConsecutivo();
    this.buscarMaterial();
  }

  private aviso(text: string): void {
    SwalTop.fire({ icon: 'warning', title: 'Datos incompletos', text, confirmButtonColor: COLOR_SWAL });
  }

  volver(): void {
    this.router.navigate([INVENTARIO_HUB_ROUTE]);
  }
}
