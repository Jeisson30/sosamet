/** Fila de material en ingresos / despachos (front; la persistencia se define con la lógica). */
export interface InventarioItemRow {
  insumo: string | null;
  descripcion: string;
  cantidad: number | null;
  um: string | null;
  observaciones: string;
}

export interface SelectOption {
  label: string;
  value: string | null;
}

export const UM_OPTIONS: SelectOption[] = [
  { label: 'UD', value: 'UD' },
  { label: 'ML', value: 'ML' },
  { label: 'M2', value: 'M2' },
  { label: 'KG', value: 'KG' },
  { label: 'GL', value: 'GL' },
];

export function nuevaFilaItem(): InventarioItemRow {
  return { insumo: null, descripcion: '', cantidad: null, um: null, observaciones: '' };
}

export const INVENTARIO_HUB_ROUTE = '/dashboard/inventario';
