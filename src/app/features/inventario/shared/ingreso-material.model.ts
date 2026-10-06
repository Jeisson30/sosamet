import { SelectOption } from './inventario.models';
import { MovimientoItemPayload, MovimientoItemRow } from './service/inventario.service';

/** Ítem del ingreso de material (una fila del detalle / del archivo plano). */
export interface IngresoMaterialItem {
  fechaFc: Date | null;
  noDoc: string;
  idCategoria: number | null;
  categoria: string;
  codigo: string | null;
  descripcion: string;
  cantidad: number | null;
  um: string | null;
  longitud: number | null;
  ancho: number | null;
  alto: number | null;
  valor: number | null;
  iva: number | null;
  total: number | null;
  valorUm: number | null;
  ubicacion: string | null;
  proveedor: string;
  ciudad: string;
  prioridad: string | null;
  fechaMantenimiento: Date | null;
  estado: string;
  observaciones: string;
}

export const UBICACION_OPTIONS: SelectOption[] = [
  { label: 'Planta Sosamet', value: 'PLANTA SOSAMET' },
  { label: 'Planta Hierros', value: 'PLANTA HIERROS' },
];

export const PRIORIDAD_STOCK_OPTIONS: SelectOption[] = [
  { label: 'Crítica', value: 'CRITICA' },
  { label: 'Alta', value: 'ALTA' },
  { label: 'Media', value: 'MEDIA' },
  { label: 'Baja', value: 'BAJA' },
  { label: 'Sin prioridad', value: 'SIN PRIORIDAD' },
];

/** Columnas del archivo plano (mismo orden y datos que el formulario). */
export const INGRESO_PLANO_COLUMNS: { header: string; field: keyof IngresoMaterialItem }[] = [
  { header: 'FECHA FC', field: 'fechaFc' },
  { header: 'NO. DOC.', field: 'noDoc' },
  { header: 'CATEGORIA', field: 'categoria' },
  { header: 'CODIGO', field: 'codigo' },
  { header: 'DESCRIPCION', field: 'descripcion' },
  { header: 'CANTIDAD', field: 'cantidad' },
  { header: 'U.M.', field: 'um' },
  { header: 'LONG.', field: 'longitud' },
  { header: 'ANCHO', field: 'ancho' },
  { header: 'ALTO', field: 'alto' },
  { header: 'VALOR', field: 'valor' },
  { header: 'IVA', field: 'iva' },
  { header: 'TOTAL', field: 'total' },
  { header: 'VALOR U.M.', field: 'valorUm' },
  { header: 'UBICACION', field: 'ubicacion' },
  { header: 'PROVEEDOR', field: 'proveedor' },
  { header: 'CIUDAD', field: 'ciudad' },
  { header: 'PRIORIDAD STOCK', field: 'prioridad' },
  { header: 'FECHA MANTENIMIENTO', field: 'fechaMantenimiento' },
  { header: 'ESTADO', field: 'estado' },
  { header: 'OBSERVACIONES', field: 'observaciones' },
];

export function nuevoIngresoItem(): IngresoMaterialItem {
  return {
    fechaFc: null,
    noDoc: '',
    idCategoria: null,
    categoria: '',
    codigo: null,
    descripcion: '',
    cantidad: null,
    um: null,
    longitud: null,
    ancho: null,
    alto: null,
    valor: null,
    iva: null,
    total: null,
    valorUm: null,
    ubicacion: null,
    proveedor: '',
    ciudad: '',
    prioridad: null,
    fechaMantenimiento: null,
    estado: '',
    observaciones: '',
  };
}

/** Fecha local → AAAA-MM-DD (lo que esperan los SPs). */
export function toIsoDate(d: Date | null): string | null {
  if (!(d instanceof Date) || isNaN(d.getTime())) return null;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** AAAA-MM-DD → fecha local (sin desfase de zona horaria). */
export function fromIsoDate(value: string | null | undefined): Date | null {
  const m = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

export function ingresoItemToPayload(it: IngresoMaterialItem): MovimientoItemPayload {
  return {
    codigo: it.codigo!,
    cantidad: Number(it.cantidad),
    um: String(it.um ?? '').trim().toUpperCase(),
    fecha_fc: toIsoDate(it.fechaFc),
    no_doc: it.noDoc,
    descripcion: it.descripcion,
    longitud: it.longitud,
    ancho: it.ancho,
    alto: it.alto,
    valor: it.valor,
    iva: it.iva,
    total: it.total,
    valor_um: it.valorUm,
    ubicacion: it.ubicacion,
    proveedor: it.proveedor,
    ciudad: it.ciudad,
    prioridad: it.prioridad,
    fecha_mantenimiento: toIsoDate(it.fechaMantenimiento),
    estado_material: it.estado,
    observaciones: it.observaciones,
  };
}

const numeroONull = (v: string | number | null | undefined): number | null =>
  v === null || v === undefined || v === '' ? null : Number(v);

/** Fila de la consulta → ítem editable (mismos campos del formulario de ingreso). */
export function movimientoRowToIngresoItem(row: MovimientoItemRow): IngresoMaterialItem {
  return {
    fechaFc: fromIsoDate(row.fecha_fc_txt),
    noDoc: row.no_doc ?? '',
    idCategoria: row.id_categoria,
    categoria: row.categoria ?? '',
    codigo: row.codigo_material,
    descripcion: row.descripcion ?? '',
    cantidad: numeroONull(row.cantidad),
    um: row.um,
    longitud: numeroONull(row.longitud),
    ancho: numeroONull(row.ancho),
    alto: numeroONull(row.alto),
    valor: numeroONull(row.valor),
    iva: numeroONull(row.iva),
    total: numeroONull(row.total),
    valorUm: numeroONull(row.valor_um),
    ubicacion: row.ubicacion,
    proveedor: row.proveedor ?? '',
    ciudad: row.ciudad ?? '',
    prioridad: row.prioridad,
    fechaMantenimiento: fromIsoDate(row.fecha_mantenimiento_txt),
    estado: row.estado_material ?? '',
    observaciones: row.observaciones ?? '',
  };
}