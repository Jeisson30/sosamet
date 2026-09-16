import { ReportColumn } from './service/reports.service';

import type { ReportTypeId } from './informes-types';

export { type ReportTypeId } from './informes-types';

/** Textos y columnas fijas según CONSULTAS GENERAL (PDF) — datos reales vía SP. */
export const INFORME_SUBTITULO: Record<ReportTypeId, string> = {
  payment:
    'Incluye: contratados, anticipos, actas (facturado/pagado), retegarantías, estado de pagos, saldo, entregados. Pago y avance de obra.',
  'production-contract':
    'Control General Contrato: agrupado por INSUMO. Fabricado (cortes fab.), Entregado (remisiones), Instalado (cortes inst.), Facturado (próximamente).',
  'production-plant':
    'Incluye: contratos, actas de medida, órdenes de producción, liquidación de cortes.',
  movements:
    'Movimiento general. Exportar en sistema y en Excel. Resúmenes de remisiones, órdenes de compra y documentos.',
};

export const COLUMNAS_POR_INFORME: Record<ReportTypeId, ReportColumn[]> = {
  /** INFORME CARTERA — vista en bloques por constructora; tabla auxiliar vía API. */
  payment: [],

  /** Control General Contrato — agrupado por INSUMO */
  'production-contract': [
    { field: 'ref', header: 'REF' },
    { field: 'insumo', header: 'Insumo' },
    { field: 'um', header: 'UM' },
    { field: 'contratado', header: 'Cant' },
    { field: 'fabricado', header: 'Fabricado' },
    { field: 'diff_fabricado', header: 'Dif. fab.' },
    { field: 'pct_fabricado', header: '% fab.' },
    { field: 'entregado', header: 'Entregado' },
    { field: 'diff_entregado', header: 'Dif. ent.' },
    { field: 'pct_entregado', header: '% ent.' },
    { field: 'instalado', header: 'Instalado' },
    { field: 'diff_instalado', header: 'Dif. inst.' },
    { field: 'pct_instalado', header: '% inst.' },
    { field: 'facturado', header: 'Facturado' },
    { field: 'pct_facturado', header: '% fact.' },
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
