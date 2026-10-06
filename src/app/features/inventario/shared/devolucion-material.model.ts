import { EntregaDevolucionItemRow, EstadoDevolucionEntrega } from './service/inventario.service';

/** Encabezado de la devolución; encargado, área, proyecto y contrato salen de la entrega. */
export interface DevolucionCabecera {
  consecutivo: string;
  fecha: Date | null;
  concepto: string | null;
  autoriza: string;
  transporte: string;
  observaciones: string;
}

/** Línea de la entrega cargada para devolver. */
export interface DevolucionElemento {
  idDetalleOrigen: number;
  codigo: string;
  descripcion: string;
  ubicacion: string | null;
  um: string;
  ancho: number | null;
  alto: number | null;
  entregada: number;
  devuelta: number;
  pendiente: number;
  cantidad: number | null;
  estado: string;
  observaciones: string;
}

export function nuevaDevolucionCabecera(): DevolucionCabecera {
  return { consecutivo: '', fecha: new Date(), concepto: null, autoriza: '', transporte: '', observaciones: '' };
}

export const ESTADO_DEVOLUCION_LABEL: Record<EstadoDevolucionEntrega, string> = {
  PRESTAMO: 'En préstamo',
  VENCIDA: 'Devolución vencida',
  PARCIAL: 'Devuelto parcialmente',
  DEVUELTO: 'Devuelto',
};

export const ESTADO_DEVOLUCION_FILTRO: { label: string; value: EstadoDevolucionEntrega }[] = [
  { label: 'En préstamo', value: 'PRESTAMO' },
  { label: 'Devolución vencida', value: 'VENCIDA' },
  { label: 'Devuelto parcialmente', value: 'PARCIAL' },
  { label: 'Devuelto (cerradas)', value: 'DEVUELTO' },
];

/** Estado sugerido del elemento según el concepto; el usuario lo puede cambiar por línea. */
const ESTADO_POR_CONCEPTO: Record<string, string> = {
  DEVUELTO: 'EN BUEN ESTADO',
  'DEVUELTO PARCIALMENTE': 'EN BUEN ESTADO',
  'DAÑADO': 'DAÑADO',
  EXTRAVIADO: 'EXTRAVIADO',
};

export function estadoPorConcepto(concepto: string | null | undefined): string {
  return ESTADO_POR_CONCEPTO[String(concepto ?? '').toUpperCase()] ?? '';
}

const num = (v: string | number | null | undefined): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const numONull = (v: string | number | null | undefined): number | null =>
  v === null || v === undefined || v === '' ? null : num(v);

export function itemEntregaToElemento(row: EntregaDevolucionItemRow, estado: string): DevolucionElemento {
  const pendiente = num(row.cantidad_pendiente);
  return {
    idDetalleOrigen: row.id_detalle,
    codigo: row.codigo_material,
    descripcion: row.descripcion ?? '',
    ubicacion: row.ubicacion,
    um: row.um,
    ancho: numONull(row.ancho),
    alto: numONull(row.alto),
    entregada: num(row.cantidad_entregada),
    devuelta: num(row.cantidad_devuelta),
    pendiente,
    cantidad: pendiente,
    estado,
    observaciones: '',
  };
}