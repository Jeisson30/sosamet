import { ReportColumn } from './service/reports.service';

import type { ReportTypeId } from './informes-types';

export { type ReportTypeId } from './informes-types';

/** Textos y columnas fijas según CONSULTAS GENERAL (PDF) — datos reales vía SP. */
export const INFORME_SUBTITULO: Record<ReportTypeId, string> = {
  payment:
    'Incluye: contratados, anticipos, actas (facturado/pagado), retegarantías, estado de pagos, saldo, entregados. Pago y avance de obra.',
  'cost-by-input':
    'Valor unitario promedio ponderado por insumo, constructora y proyecto (fuente: ítems AIU/IVA del contrato). Sin filtros = vista general.',
  'production-contract':
    'Control General Contrato: agrupado por INSUMO. Fabricado (cortes fab.), Entregado (remisiones), Instalado (cortes inst.), Facturado (próximamente).',
  'production-plant': '',
  'project-history':
    'Proyectos ejecutados agrupados por constructora: proyecto, contrato, tipo, objeto, fechas y valor contratado.',
  'contract-balances':
    'Ingresos, costos, gastos y utilidad por contrato. Incluye costos adicionales y presupuesto proyectado persistidos.',
  'company-balance':
    'Ventas, rentabilidad y desempeño por mes, cliente, elemento e insumo (empresa asociada y rango de fechas).',
  movements:
    'Movimiento general por documento: seleccione el Documento y los filtros; cada documento genera su propio Excel (disponible: Remisiones, una fila por ítem).',
};

export const COLUMNAS_POR_INFORME: Record<ReportTypeId, ReportColumn[]> = {
  /** INFORME CARTERA — vista en bloques por constructora; tabla auxiliar vía API. */
  payment: [],

  /** Costos por insumo — diseño análisis (agregado por insumo) */
  'cost-by-input': [
    { field: 'insumo', header: 'Insumo' },
    { field: 'um', header: 'Unidad de medida' },
    { field: 'valor_contratado_promedio', header: 'Valor contratado promedio' },
    { field: 'costo_material_promedio', header: 'Costo material promedio' },
    { field: 'pct_material', header: '%' },
    { field: 'mo_fabricacion_promedio', header: 'Mano de obra fabricación promedio' },
    { field: 'pct_fabricacion', header: '%' },
    { field: 'mo_instalacion_promedio', header: 'Mano de obra instalación promedio' },
    { field: 'pct_instalacion', header: '%' },
    { field: 'costo_total_promedio', header: 'Costo total promedio' },
    { field: 'utilidad_promedio', header: 'Utilidad promedio' },
    { field: 'pct_utilidad', header: '%' },
  ],

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

  /** PRODUCCIÓN — Seguimiento Contrato */
  'production-plant': [
    { field: 'ref', header: 'REF' },
    { field: 'item', header: 'ITEM' },
    { field: 'descripcion', header: 'DESCRIPCIÓN' },
    { field: 'um', header: 'UM' },
    { field: 'contratado', header: 'CONTRATADO' },
    { field: 'remisionado', header: 'REMISIONADO' },
    { field: 'diferencia', header: 'SALDO' },
  ],

  /** HISTORIAL PROYECTOS — PROYECTOS EJECUTADOS (agrupado por constructora). */
  'project-history': [
    { field: 'proyecto', header: 'PROYECTO' },
    { field: 'numero_contrato', header: 'No. CONTRATO' },
    { field: 'tipo', header: 'TIPO' },
    { field: 'objeto', header: 'OBJETO' },
    { field: 'fecha_inicio', header: 'FECHA INICIO' },
    { field: 'fecha_finalizacion', header: 'FECHA FINALIZACIÓN' },
    { field: 'valor_contratado', header: 'VALOR CONTRATADO' },
  ],

  /** BALANCES POR CONTRATO — dashboard (sin tabla plana). */
  'contract-balances': [],

  /** BALANCE GLOBAL DE LA EMPRESA — dashboard (sin tabla plana). */
  'company-balance': [],

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
