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
    'Movimiento general por documento: seleccione el Documento y los filtros; cada documento genera su propio Excel (disponible: Remisiones, una fila por ítem).',
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

  /** MOVIMIENTO REMISIONES (Excel) — el API devuelve las columnas de cada documento. */
  movements: [
    { field: 'fecha', header: 'FECHA' },
    { field: 'tipo_doc', header: 'TIPO DOC.' },
    { field: 'empresa_asociada', header: 'EMPRESA ASOCIADA' },
    { field: 'consecutivo', header: 'CONSECUTIVO' },
    { field: 'constructora', header: 'CONSTRUCTORA' },
    { field: 'proyecto', header: 'PROYECTO' },
    { field: 'tipo_contractual', header: 'TIPO CONTRACTUAL' },
    { field: 'no_documento', header: 'No. DOCUMENTO' },
    { field: 'insumo', header: 'INSUMO' },
    { field: 'item', header: 'ITEM' },
    { field: 'detalle', header: 'DETALLE' },
    { field: 'cantidad', header: 'CANTIDAD' },
    { field: 'um', header: 'UM' },
    { field: 'observaciones', header: 'OBSERVACIONES' },
    { field: 'despacho', header: 'DESPACHO' },
    { field: 'transporto', header: 'TRANSPORTO' },
    { field: 'usuario', header: 'USUARIO' },
    { field: 'estado', header: 'ESTADO' },
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
