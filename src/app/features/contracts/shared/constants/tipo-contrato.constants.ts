/**
 * Opciones de tipo de documento asociadas al campo `tipo_contrato`
 * (creación de CONTRATO / catálogo de N° consecutivos).
 * Una sola fuente de verdad para formularios y Administración.
 */
export const TIPO_CONTRATO_DOCUMENTO_OPTIONS: {
  label: string;
  value: string;
}[] = [
  { label: 'Contrato', value: 'Contrato' },
  { label: 'Cotizacion', value: 'Cotizacion' },
  { label: 'Oferta Mercantil', value: 'OfertaM' },
  { label: 'Orden De Compra', value: 'OrdenDC' },
  { label: 'Orden De Trabajo', value: 'OrdenDT' },
  { label: 'Otro', value: 'Otro' },
];

/** Label legible a partir del value guardado en BD. */
export function labelTipoContratoDocumento(value: string | null | undefined): string {
  const v = String(value || '').trim();
  if (!v) return '';
  const found = TIPO_CONTRATO_DOCUMENTO_OPTIONS.find((o) => o.value === v);
  return found?.label || v;
}

/** Opción de select: "Contrato — 12345" (value = número). */
export function formatDocumentoNumeroOption(row: {
  tipo_doc?: string | null;
  numero_documento?: string | null;
}): { label: string; value: string } {
  const numero = String(row.numero_documento || '').trim();
  const tipo = labelTipoContratoDocumento(row.tipo_doc);
  return {
    label: tipo ? `${tipo} — ${numero}` : numero,
    value: numero,
  };
}
