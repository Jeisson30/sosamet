export type TipoOtroSi = 'FECHA' | 'CANTIDAD' | 'AMBOS';
export type TablaItemContrato = 'AIU' | 'IVA';

export const TIPO_OTROSI_OPTIONS: {
  value: TipoOtroSi;
  label: string;
  descripcion: string;
  icon: string;
}[] = [
  {
    value: 'FECHA',
    label: 'Ampliación de Fecha',
    descripcion: 'Extiende la fecha de finalización del contrato.',
    icon: 'pi pi-calendar-plus',
  },
  {
    value: 'CANTIDAD',
    label: 'Aumento de Cantidades',
    descripcion: 'Adiciona nuevas cantidades a los ítems del contrato.',
    icon: 'pi pi-plus-circle',
  },
  {
    value: 'AMBOS',
    label: 'Ambos',
    descripcion: 'Ampliación de fecha y aumento de cantidades.',
    icon: 'pi pi-clone',
  },
];

export const TABLA_ITEM_OPTIONS: { label: string; value: TablaItemContrato }[] = [
  { label: 'AIU', value: 'AIU' },
  { label: 'IVA', value: 'IVA' },
];

export function labelTipoOtroSi(tipo: string | null | undefined): string {
  return TIPO_OTROSI_OPTIONS.find((t) => t.value === tipo)?.label || String(tipo || '');
}

export interface OtroSiContrato {
  numerodoc: string;
  numero_contrato: string;
  constructora: string | null;
  proyecto: string | null;
  tipo_contrato: string | null;
  tipo_doc_catalogo: string | null;
  empresa_asociada: string | null;
  encargado: string | null;
  estado: string;
  valor_contrato: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  fecha_fin_txt: string | null;
}

export interface OtroSiItemContrato {
  tabla_origen: TablaItemContrato;
  id_item_origen: number;
  item: string | null;
  insumo: string | null;
  ref: string | null;
  detalle: string | null;
  cantidad: number;
  um: string | null;
  valor_unitario: number | null;
  vr_total: number | null;
}

export interface PorcentajesAiu {
  porc_adm: number;
  porc_imp: number;
  porc_ut: number;
  porc_iva: number;
}

/** Ítem del Otro Sí en edición (existente: id_item_origen; nuevo: datos completos). */
export interface OtroSiItemEdicion {
  tabla_origen: TablaItemContrato;
  es_nuevo: number;
  id_item_origen?: number;
  item?: string | null;
  insumo?: string | null;
  ref?: string | null;
  detalle?: string | null;
  um?: string | null;
  cantidad_adicional: number;
  valor_unitario?: number | null;
  observaciones: string | null;
}

export interface OtroSiEdicion {
  id_otrosi: number;
  consecutivo: number;
  no_documento: string;
  fecha_documento: string;
  tipo: TipoOtroSi;
  fecha_fin_nueva: string | null;
  observaciones: string | null;
  items: OtroSiItemEdicion[];
}

export interface OtroSiContextoResponse {
  codigo: number;
  contrato: OtroSiContrato;
  /** Solo en edición: el contrato e ítems vienen como estaban antes de este Otro Sí. */
  editando: OtroSiEdicion | null;
  items: OtroSiItemContrato[];
  porcentajes: { AIU: PorcentajesAiu | null; IVA: { porc_iva: number } | null };
  otrosi_previos: { total: number; ultimo: number | null };
}

export const ESTADO_OTROSI_OPTIONS = [
  { label: 'Activo', value: 'ACTIVO' },
  { label: 'Anulado', value: 'ANULADO' },
];

/** Ítem del contrato en la grilla de aumento de cantidades. */
export interface OtroSiFilaExistente extends OtroSiItemContrato {
  cantidadAdicional: number | null;
  observaciones: string;
}

/** Ítem nuevo agregado por el Otro Sí. */
export interface OtroSiFilaNueva {
  tabla_origen: TablaItemContrato;
  item: string;
  insumo: string | null;
  ref: string;
  detalle: string;
  um: string;
  cantidadAdicional: number | null;
  valor_unitario: number | null;
  observaciones: string;
}

export interface OtroSiItemPayload {
  tabla_origen: TablaItemContrato;
  id_item_origen?: number;
  cantidad_adicional: number;
  observaciones: string | null;
  item?: string;
  insumo?: string | null;
  ref?: string | null;
  detalle?: string;
  um?: string;
  valor_unitario?: number;
}

export interface OtroSiPayload {
  numerodoc: string;
  cabecera: {
    no_documento: string;
    fecha_documento: string | null;
    tipo: TipoOtroSi;
    fecha_fin_nueva: string | null;
    observaciones: string | null;
  };
  items: OtroSiItemPayload[];
  /** true = el usuario confirmó crear/editar con No. Documento ya usado. */
  confirmar_numero_duplicado?: boolean;
}

export interface OtroSiRegistroResponse {
  codigo: number;
  mensaje: string;
  id_otrosi?: number;
  consecutivo?: number;
  valor_adicional?: string | number;
  fecha_fin_nueva?: string | null;
  dias_ampliacion?: number | null;
  requiere_confirmacion?: boolean;
  codigo_app?: string;
}

export interface OtroSiConsultaRow {
  id_otrosi: number;
  numerodoc: string;
  consecutivo: number;
  no_documento: string;
  tipo: TipoOtroSi;
  estado: string;
  fecha_documento: string;
  fecha_fin_anterior: string | null;
  fecha_fin_nueva: string | null;
  dias_ampliacion: number | null;
  valor_adicional: number;
  usuario_creacion: string | null;
  fecha_creacion: string;
  numero_contrato: string | null;
  constructora: string | null;
  proyecto: string | null;
  estado_contrato: string;
  /** Último Otro Sí activo del contrato: el único que se puede editar / anular / eliminar. */
  es_ultimo: boolean;
  motivo_anulacion: string | null;
  total_items: number;
}

export interface OtroSiDetalleLinea {
  id_detalle: number;
  tabla_origen: TablaItemContrato;
  es_nuevo: number;
  item: string | null;
  insumo: string | null;
  detalle: string | null;
  um: string | null;
  cantidad_anterior: number;
  cantidad_adicional: number;
  cantidad_nueva: number;
  valor_unitario: number | null;
  vr_total_anterior: number;
  vr_total_nuevo: number;
  observaciones: string | null;
}

export interface OtroSiDetalleResponse {
  codigo: number;
  otrosi: Omit<OtroSiConsultaRow, 'estado_contrato' | 'total_items' | 'numero_contrato' | 'constructora' | 'proyecto'> & {
    fecha_fin_anterior_txt: string | null;
    valor_contrato_anterior: string | null;
    valor_contrato_nuevo: string | null;
    observaciones: string | null;
    usuario_modificacion: string | null;
    fecha_modificacion: string | null;
    usuario_anulacion: string | null;
    fecha_anulacion: string | null;
  };
  contrato: OtroSiContrato | null;
  /** Códigos de item del Otro Sí que ya tienen actas de medida. */
  items_con_actas: string[];
  detalle: OtroSiDetalleLinea[];
}

export interface OtroSiAccionResponse {
  codigo: number;
  mensaje: string;
}

export function toIsoDate(d: Date | null): string | null {
  if (!(d instanceof Date) || isNaN(d.getTime())) return null;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** AAAA-MM-DD → fecha local (sin desfase de zona horaria). */
export function fromIsoDate(value: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

export function diasEntre(desde: Date, hasta: Date): number {
  const utc = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((utc(hasta) - utc(desde)) / 86400000);
}

export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias);
}

const redondear = (n: number) => Math.round(n * 100) / 100;

/** Valor adicional estimado de un ítem existente: el total del ítem crece en proporción a la cantidad. */
export function valorAdicionalExistente(fila: OtroSiFilaExistente): number {
  const adicional = Number(fila.cantidadAdicional) || 0;
  if (adicional <= 0 || !(fila.cantidad > 0) || fila.vr_total == null) return 0;
  return redondear((fila.vr_total * adicional) / fila.cantidad);
}

/** Valor total estimado de un ítem nuevo con los porcentajes del contrato (misma fórmula del SP). */
export function valorTotalNuevo(
  fila: OtroSiFilaNueva,
  porcentajes: OtroSiContextoResponse['porcentajes'] | null
): number {
  const cant = Number(fila.cantidadAdicional) || 0;
  const unit = Number(fila.valor_unitario) || 0;
  const base = redondear(unit * cant);
  if (fila.tabla_origen === 'AIU') {
    const p = porcentajes?.AIU;
    if (!p) return base;
    const adm = redondear(base * p.porc_adm);
    const imp = redondear(base * p.porc_imp);
    const ut = redondear(base * p.porc_ut);
    const iva = redondear(ut * p.porc_iva);
    return redondear(base + adm + imp + ut + iva);
  }
  const pIva = porcentajes?.IVA?.porc_iva ?? 0;
  return redondear(base + redondear(base * pIva));
}
