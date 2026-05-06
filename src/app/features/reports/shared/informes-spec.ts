import { ReportColumn } from './service/reports.service';

import type { ReportTypeId } from './informes-types';

export { type ReportTypeId } from './informes-types';

/** Textos y columnas fijas según CONSULTAS GENERAL (PDF) — datos reales vía SP. */
export const INFORME_SUBTITULO: Record<ReportTypeId, string> = {
  payment:
    'Incluye: contratados, anticipos, actas (facturado/pagado), retegarantías, estado de pagos, saldo, entregados. Pago y avance de obra.',
  'production-contract':
    'Incluye: contratado (CONTRATO), fabricado (REMISIONES), entregado (LIQ. CORTES / tipo: fabricación, instalación, pintura) y adicionales.',
  'production-plant':
    'Incluye: contratos, actas de medida, órdenes de producción, liquidación de cortes.',
  movements:
    'Movimiento general. Exportar en sistema y en Excel. Resúmenes de remisiones, órdenes de compra y documentos.',
};

export const COLUMNAS_POR_INFORME: Record<ReportTypeId, ReportColumn[]> = {
  /** INFORME CARTERA — vista en bloques por constructora; tabla auxiliar vía API. */
  payment: [],

  /** 2. INFORME PRODUCCIÓN POR CONTRATO (PDF) */
  'production-contract': [
    { field: 'numero_contrato', header: 'N° contrato' },
    { field: 'item', header: 'Ítem' },
    { field: 'descripcion', header: 'Descripción' },
    { field: 'um', header: 'UM' },
    { field: 'contratado', header: 'Contratado' },
    { field: 'entregado', header: 'Entregado' },
    { field: 'instalado', header: 'Instalado' },
    { field: 'diff_entregado', header: 'Dif. entregado' },
    { field: 'diff_instalado', header: 'Dif. instalado' },
    { field: 'pct_entregado', header: '% entregado' },
    { field: 'pct_instalado', header: '% instalado' },
    { field: 'estado', header: 'Estado' },
  ],

  /** INFORME PRODUCCIÓN – PLANTA Y OBRAS (PDF) */
  'production-plant': [
    { field: 'numero_contrato', header: 'N° contrato' },
    { field: 'elemento', header: 'Elemento / partida' },
    { field: 'acta_medida', header: 'Acta de medida' },
    { field: 'orden_produccion', header: 'Orden producción' },
    { field: 'liq_corte', header: 'Liquidación de cortes' },
    { field: 'um', header: 'UM' },
    { field: 'cantidad', header: 'Cantidad' },
    { field: 'estado', header: 'Estado' },
    { field: 'observacion', header: 'Observación' },
  ],

  /** 1. MOVIMIENTO GENERAL (PDF) */
  movements: [
    { field: 'tipo_doc', header: 'Tipo documento' },
    { field: 'numero', header: 'Número' },
    { field: 'fecha', header: 'Fecha' },
    { field: 'constructora', header: 'Constructora' },
    { field: 'proyecto', header: 'Proyecto' },
    { field: 'tercero', header: 'Tercero' },
    { field: 'concepto', header: 'Concepto' },
    { field: 'valor', header: 'Valor' },
    { field: 'estado', header: 'Estado' },
    { field: 'notas', header: 'Notas' },
  ],
};

/** Fila vacía para rellenar celdas con "—" en previsualización sin datos. */
export function filaVacia(
  columnas: ReportColumn[]
): Record<string, string> {
  const row: Record<string, string> = {};
  columnas.forEach((c) => {
    row[c.field] = '—';
  });
  return row;
}
