import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../../core/url-constants';

export type TipoMovimientoInventario = 'INGRESO' | 'DESPACHO' | 'AJUSTE' | 'TRASLADO' | 'DEVOLUCION';
export type OrigenMovimientoInventario = 'MANUAL' | 'PLANO' | 'MIXTO';

/** Ítem tal como lo recibe SP_INV_REGISTRAR_MOVIMIENTO (fechas AAAA-MM-DD). */
export interface MovimientoItemPayload {
  codigo: string;
  cantidad: number;
  um: string;
  fecha_fc?: string | null;
  no_doc?: string | null;
  descripcion?: string | null;
  longitud?: number | null;
  ancho?: number | null;
  alto?: number | null;
  valor?: number | null;
  iva?: number | null;
  total?: number | null;
  valor_um?: number | null;
  ubicacion?: string | null;
  proveedor?: string | null;
  ciudad?: string | null;
  prioridad?: string | null;
  fecha_mantenimiento?: string | null;
  estado_material?: string | null;
  observaciones?: string | null;
  signo?: 1 | -1;
  tipo_doc_ref?: string | null;
  numerodoc_ref?: string | null;
}

export type TipoEntregaInventario = 'REQUIERE_DEVOLUCION' | 'NO_REQUIERE_DEVOLUCION';

/** Datos del encabezado de la entrega (DESPACHO). */
export interface CabeceraEntregaPayload {
  consecutivo?: string | null;
  fecha_movimiento?: string | null;
  id_empresa?: number | null;
  concepto?: string | null;
  concepto_detalle?: string | null;
  area?: string | null;
  area_detalle?: string | null;
  id_usuario_entregado?: number | null;
  ubicacion_entrega?: string | null;
  tipo_entrega?: TipoEntregaInventario | null;
  fecha_prevista_devolucion?: string | null;
  autoriza?: string | null;
  transporte?: string | null;
}

export interface RegistrarMovimientoPayload extends CabeceraEntregaPayload {
  tipo_movimiento: TipoMovimientoInventario;
  origen: OrigenMovimientoInventario;
  archivo_plano?: string | null;
  tipo_doc_ref?: string | null;
  numerodoc_ref?: string | null;
  id_constructora?: number | null;
  id_proyecto?: number | null;
  observaciones?: string | null;
  items: MovimientoItemPayload[];
}

/** Fila de vw_inv_existencias (saldo por código + ubicación + U.M.). */
export interface ExistenciaRow {
  id_material: number;
  codigo: string;
  descripcion: string;
  id_categoria: number | null;
  categoria: string | null;
  ubicacion: string | null;
  um: string;
  saldo: string | number;
  total_entradas: string | number;
  total_salidas: string | number;
  ultimo_movimiento: string | null;
}

export interface InventarioParametro {
  id_parametro: number;
  grupo: string;
  valor: string;
  orden: number;
}

/** Fila de SP_INV_CONSULTAR_MOVIMIENTOS (una por ítem). */
export interface MovimientoItemRow {
  id_movimiento: number;
  tipo_movimiento: TipoMovimientoInventario;
  consecutivo: string;
  fecha_movimiento: string;
  origen: OrigenMovimientoInventario;
  archivo_plano: string | null;
  estado_movimiento: string;
  usuario_crea: string | null;
  id_detalle: number;
  linea: number;
  fecha_fc: string | null;
  no_doc: string | null;
  id_material: number;
  codigo_material: string;
  descripcion: string | null;
  id_categoria: number | null;
  categoria: string | null;
  cantidad: string | number;
  um: string;
  longitud: string | number | null;
  ancho: string | number | null;
  alto: string | number | null;
  valor: string | number | null;
  iva: string | number | null;
  total: string | number | null;
  valor_um: string | number | null;
  ubicacion: string | null;
  proveedor: string | null;
  ciudad: string | null;
  prioridad: string | null;
  fecha_mantenimiento: string | null;
  estado_material: string | null;
  observaciones: string | null;
  estado_item: 'ACTIVO' | 'ANULADO';
  fecha_modificacion: string | null;
  fecha_fc_txt: string | null;
  fecha_mantenimiento_txt: string | null;
}

export interface MovimientoItemHistorial {
  id_historial: number;
  accion: 'EDITAR' | 'ANULAR' | 'ELIMINAR';
  motivo: string | null;
  datos_anteriores: Record<string, unknown> | null;
  datos_nuevos: Record<string, unknown> | null;
  usuario: string | null;
  fecha: string;
}

export type EstadoDevolucionEntrega = 'PRESTAMO' | 'VENCIDA' | 'PARCIAL' | 'DEVUELTO';

/** Entrega que requiere devolución, con sus cantidades por devolver (fechas AAAA-MM-DD). */
export interface EntregaPorDevolverRow {
  id_movimiento: number;
  consecutivo: string;
  fecha_entrega: string;
  concepto: string | null;
  concepto_detalle: string | null;
  area: string | null;
  area_detalle: string | null;
  id_usuario_entregado: number | null;
  entregado_a: string | null;
  id_constructora: number | null;
  constructora: string | null;
  id_proyecto: number | null;
  proyecto: string | null;
  ubicacion_entrega: string | null;
  tipo_doc_ref: string | null;
  numerodoc_ref: string | null;
  id_empresa: number | null;
  autoriza_entrega: string | null;
  observaciones_entrega: string | null;
  fecha_prevista_devolucion: string | null;
  dias_transcurridos: number;
  total_lineas: number;
  cantidad_entregada: string | number;
  cantidad_devuelta: string | number;
  cantidad_pendiente: string | number;
  estado_devolucion: EstadoDevolucionEntrega;
}

/** Línea entregada con lo devuelto y lo pendiente (vw_inv_entrega_devolucion). */
export interface EntregaDevolucionItemRow {
  id_detalle: number;
  linea: number;
  id_material: number;
  codigo_material: string;
  descripcion: string | null;
  categoria: string | null;
  um: string;
  ancho: string | number | null;
  alto: string | number | null;
  ubicacion: string | null;
  estado_material: string | null;
  observaciones: string | null;
  cantidad_entregada: string | number;
  cantidad_devuelta: string | number;
  cantidad_pendiente: string | number;
}

export interface DevolucionRegistradaRow {
  id_movimiento: number;
  consecutivo: string;
  fecha_devolucion: string;
  concepto_devolucion: string | null;
  autoriza: string | null;
  transporte: string | null;
  estado: string;
  usuario_crea: string | null;
  cantidad: string | number;
}

export interface EntregaDevolucionDetalle {
  entrega: EntregaPorDevolverRow;
  items: EntregaDevolucionItemRow[];
  devoluciones: DevolucionRegistradaRow[];
}

export interface RegistrarDevolucionPayload {
  id_movimiento_entrega: number;
  consecutivo?: string | null;
  fecha_devolucion: string | null;
  concepto_devolucion: string | null;
  autoriza?: string | null;
  transporte?: string | null;
  observaciones?: string | null;
  items: { id_detalle_origen: number; cantidad: number; estado_material?: string | null; observaciones?: string | null }[];
}

export type EstadoEntregaConsulta =
  | 'PRESTAMO'
  | 'VENCIDA'
  | 'PARCIAL'
  | 'DEVUELTO'
  | 'DANADO'
  | 'EXTRAVIADO'
  | 'NO_REQUIERE'
  | 'ANULADO';

/** Fila de vw_inv_entrega_consulta: un elemento entregado con su estado (fechas AAAA-MM-DD). */
export interface EntregaConsultaRow {
  id_movimiento: number;
  consecutivo: string;
  fecha_movimiento: string;
  fecha_entrega: string;
  concepto: string | null;
  concepto_detalle: string | null;
  area: string | null;
  area_detalle: string | null;
  id_usuario_entregado: number | null;
  entregado_a: string | null;
  id_constructora: number | null;
  constructora: string | null;
  id_proyecto: number | null;
  proyecto: string | null;
  tipo_doc_ref: string | null;
  numerodoc_ref: string | null;
  ubicacion_entrega: string | null;
  tipo_entrega: TipoEntregaInventario | null;
  fecha_prevista: string | null;
  autoriza: string | null;
  transporte: string | null;
  observaciones_movimiento: string | null;
  id_empresa: number | null;
  estado_movimiento: string;
  usuario_crea: string | null;
  id_detalle: number;
  linea: number;
  id_material: number;
  codigo_material: string;
  descripcion: string | null;
  categoria: string | null;
  cantidad: string | number;
  um: string;
  ancho: string | number | null;
  alto: string | number | null;
  ubicacion: string | null;
  estado_material: string | null;
  observaciones: string | null;
  estado_item: 'ACTIVO' | 'ANULADO';
  cantidad_devuelta: string | number;
  cantidad_pendiente: string | number;
  fecha_ultima_devolucion: string | null;
  estado_entrega: EstadoEntregaConsulta;
}

export interface MovimientoAdjunto {
  id_adjunto: number;
  id_movimiento: number;
  nombre_original: string;
  ruta: string;
  tipo_mime: string | null;
}

/** Encabezado de un movimiento (entrega o devolución) para Visualizar. */
export interface MovimientoEncabezado {
  id_movimiento: number;
  tipo_movimiento: TipoMovimientoInventario;
  consecutivo: string;
  fecha: string;
  fecha_movimiento: string;
  concepto: string | null;
  concepto_detalle: string | null;
  area: string | null;
  area_detalle: string | null;
  id_usuario_entregado: number | null;
  entregado_a: string | null;
  id_constructora: number | null;
  constructora: string | null;
  id_proyecto: number | null;
  proyecto: string | null;
  tipo_doc_ref: string | null;
  numerodoc_ref: string | null;
  ubicacion_entrega: string | null;
  tipo_entrega: TipoEntregaInventario | null;
  fecha_prevista: string | null;
  autoriza: string | null;
  transporte: string | null;
  observaciones: string | null;
  id_empresa: number | null;
  id_movimiento_origen: number | null;
  concepto_devolucion: string | null;
  total_items: number;
  estado: string;
  usuario_crea: string | null;
  fecha_creacion: string;
  usuario_anula: string | null;
  fecha_anulacion: string | null;
  motivo_anulacion: string | null;
}

export interface DevolucionItemRow {
  id_detalle: number;
  id_movimiento: number;
  linea: number;
  id_detalle_origen: number | null;
  codigo_material: string;
  descripcion: string | null;
  cantidad: string | number;
  um: string;
  ancho: string | number | null;
  alto: string | number | null;
  ubicacion: string | null;
  estado_material: string | null;
  observaciones: string | null;
  signo: number;
  estado: string;
}

export interface DevolucionConsulta extends MovimientoEncabezado {
  items: DevolucionItemRow[];
  adjuntos: MovimientoAdjunto[];
}

export interface EntregaConsultaDetalle {
  entrega: MovimientoEncabezado;
  items: EntregaConsultaRow[];
  adjuntos: MovimientoAdjunto[];
  devoluciones: DevolucionConsulta[];
}

export interface EditarEntregaPayload extends CabeceraEntregaPayload {
  id_constructora: number | null;
  id_proyecto: number | null;
  tipo_doc_ref: string | null;
  numerodoc_ref: string | null;
  observaciones: string | null;
  items: {
    id_detalle: number;
    ancho: number | null;
    alto: number | null;
    estado_material: string | null;
    observaciones: string | null;
  }[];
}

export interface InventarioResponse<T> {
  codigo: number;
  mensaje: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class InventarioService {
  constructor(private http: HttpClient) {}

  registrarMovimiento(
    payload: RegistrarMovimientoPayload
  ): Observable<InventarioResponse<{ id_movimiento: number; consecutivo: string }>> {
    return this.http.post<InventarioResponse<{ id_movimiento: number; consecutivo: string }>>(
      API_ENDPOINTS.INVENTARIO.MOVIMIENTOS,
      payload
    );
  }

  listarMovimientos(
    filtros: Record<string, string | null | undefined>
  ): Observable<InventarioResponse<MovimientoItemRow[]>> {
    return this.http.get<InventarioResponse<MovimientoItemRow[]>>(
      API_ENDPOINTS.INVENTARIO.MOVIMIENTOS,
      { params: this.toHttpParams(filtros) }
    );
  }

  editarItem(idDetalle: number, item: MovimientoItemPayload): Observable<InventarioResponse<unknown>> {
    return this.http.put<InventarioResponse<unknown>>(API_ENDPOINTS.INVENTARIO.ITEM(idDetalle), { item });
  }

  anularItem(idDetalle: number, motivo: string): Observable<InventarioResponse<unknown>> {
    return this.http.patch<InventarioResponse<unknown>>(API_ENDPOINTS.INVENTARIO.ANULAR_ITEM(idDetalle), {
      motivo,
    });
  }

  eliminarItem(idDetalle: number, motivo: string): Observable<InventarioResponse<unknown>> {
    return this.http.delete<InventarioResponse<unknown>>(API_ENDPOINTS.INVENTARIO.ITEM(idDetalle), {
      body: { motivo },
    });
  }

  historialItem(idDetalle: number): Observable<InventarioResponse<MovimientoItemHistorial[]>> {
    return this.http.get<InventarioResponse<MovimientoItemHistorial[]>>(
      API_ENDPOINTS.INVENTARIO.HISTORIAL_ITEM(idDetalle)
    );
  }

  anularMovimiento(id: number, motivo: string): Observable<InventarioResponse<unknown>> {
    return this.http.patch<InventarioResponse<unknown>>(
      API_ENDPOINTS.INVENTARIO.ANULAR_MOVIMIENTO(id),
      { motivo }
    );
  }

  listarExistencias(
    filtros: Record<string, string | null | undefined> = {}
  ): Observable<InventarioResponse<ExistenciaRow[]>> {
    return this.http.get<InventarioResponse<ExistenciaRow[]>>(
      API_ENDPOINTS.INVENTARIO.EXISTENCIAS,
      { params: this.toHttpParams(filtros) }
    );
  }

  siguienteConsecutivo(
    tipo: TipoMovimientoInventario
  ): Observable<InventarioResponse<{ consecutivo: string; numero: number; prefijo: string }>> {
    return this.http.get<InventarioResponse<{ consecutivo: string; numero: number; prefijo: string }>>(
      API_ENDPOINTS.INVENTARIO.SIGUIENTE_CONSECUTIVO,
      { params: this.toHttpParams({ tipo }) }
    );
  }

  listarParametros(grupos: string[]): Observable<InventarioResponse<InventarioParametro[]>> {
    return this.http.get<InventarioResponse<InventarioParametro[]>>(API_ENDPOINTS.INVENTARIO.PARAMETROS, {
      params: this.toHttpParams({ grupo: grupos.join(',') }),
    });
  }

  subirAdjuntos(idMovimiento: number, fotos: File[]): Observable<InventarioResponse<unknown>> {
    const fd = new FormData();
    for (const f of fotos) fd.append('fotos', f, f.name);
    return this.http.post<InventarioResponse<unknown>>(API_ENDPOINTS.INVENTARIO.ADJUNTOS(idMovimiento), fd);
  }

  listarEntregasPorDevolver(
    filtros: { buscar?: string | null; estado?: EstadoDevolucionEntrega | null } = {}
  ): Observable<InventarioResponse<EntregaPorDevolverRow[]>> {
    return this.http.get<InventarioResponse<EntregaPorDevolverRow[]>>(API_ENDPOINTS.INVENTARIO.DEVOLUCION_ENTREGAS, {
      params: this.toHttpParams(filtros),
    });
  }

  detalleEntregaDevolucion(idMovimiento: number): Observable<InventarioResponse<EntregaDevolucionDetalle>> {
    return this.http.get<InventarioResponse<EntregaDevolucionDetalle>>(
      API_ENDPOINTS.INVENTARIO.DEVOLUCION_ENTREGA(idMovimiento)
    );
  }

  registrarDevolucion(
    payload: RegistrarDevolucionPayload
  ): Observable<InventarioResponse<{ id_movimiento: number; consecutivo: string }>> {
    return this.http.post<InventarioResponse<{ id_movimiento: number; consecutivo: string }>>(
      API_ENDPOINTS.INVENTARIO.DEVOLUCIONES,
      payload
    );
  }

  listarEntregas(
    filtros: Record<string, string | null | undefined>
  ): Observable<InventarioResponse<EntregaConsultaRow[]>> {
    return this.http.get<InventarioResponse<EntregaConsultaRow[]>>(API_ENDPOINTS.INVENTARIO.ENTREGAS, {
      params: this.toHttpParams(filtros),
    });
  }

  detalleEntrega(idMovimiento: number): Observable<InventarioResponse<EntregaConsultaDetalle>> {
    return this.http.get<InventarioResponse<EntregaConsultaDetalle>>(API_ENDPOINTS.INVENTARIO.ENTREGA(idMovimiento));
  }

  editarEntrega(idMovimiento: number, payload: EditarEntregaPayload): Observable<InventarioResponse<unknown>> {
    return this.http.put<InventarioResponse<unknown>>(API_ENDPOINTS.INVENTARIO.ENTREGA(idMovimiento), payload);
  }

  private toHttpParams(obj: Record<string, string | null | undefined>): HttpParams {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(obj)) {
      if (v == null) continue;
      const s = String(v).trim();
      if (s === '') continue;
      p = p.set(k, s);
    }
    return p;
  }
}
