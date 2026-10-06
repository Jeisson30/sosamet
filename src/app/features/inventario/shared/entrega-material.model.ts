import { SelectOption } from './inventario.models';
import { ExistenciaRow, TipoEntregaInventario } from './service/inventario.service';

/** Encabezado del formulario de entrega (fechas como Date; ids de catálogos en texto para p-dropdown). */
export interface EntregaCabecera {
  consecutivo: string;
  fecha: Date | null;
  concepto: string | null;
  conceptoDetalle: string;
  area: string | null;
  areaDetalle: string;
  idUsuarioEntregado: number | null;
  idConstructora: string | null;
  idProyecto: string | null;
  tipoDoc: string | null;
  numeroDoc: string | null;
  ubicacionEntrega: string;
  tipoEntrega: TipoEntregaInventario | null;
  fechaDevolucion: Date | null;
  autoriza: string;
  transporte: string;
  observaciones: string;
}

/** Fila del buscador: existencia + campos que el usuario completa antes de agregarla. */
export interface EntregaBusquedaRow extends ExistenciaRow {
  cantidad: number | null;
  ancho: number | null;
  alto: number | null;
  estado: string;
  observaciones: string;
}

/** Elemento ya agregado a la entrega. */
export interface EntregaElemento {
  idMaterial: number;
  codigo: string;
  descripcion: string;
  categoria: string | null;
  ubicacion: string | null;
  um: string;
  cantidad: number;
  ancho: number | null;
  alto: number | null;
  estado: string;
  observaciones: string;
}

export interface EmpresaImpresion {
  logo: string;
  nit: string;
  web: string;
  color: string;
  direccion: string;
  correo: string;
}

/** Igual que setEmpresaImpresion de Remisiones: 1 = Sosamet, 2 = Hierros y Servicios. */
export const EMPRESA_IMPRESION: Record<number, EmpresaImpresion> = {
  1: {
    logo: 'assets/images/logo_principal.png',
    nit: '900.111.135 - 7',
    web: 'WWW.SOSAMET.COM',
    color: '#1f4fa3',
    direccion: 'Av. Corpas Km 3 CL. 158 No. 110 - 45 Bogotá, Colombia',
    correo: 'Administrativo@sosamet.com',
  },
  2: {
    logo: 'assets/images/LOGO_HS.png',
    nit: '901.236.735-7',
    web: 'WWW.HIERROSYSERVICIOS.COM',
    color: '#8a6d3b',
    direccion: 'Av. Corpas Km 3 CL. 158 No. 110 - 45 Bogotá, Colombia',
    correo: '',
  },
};

/** Ubicación del ingreso → empresa: PLANTA HIERROS = 2 (Hierros y Servicios); el resto = 1 (Sosamet). */
export function empresaDeUbicacion(ubicacion: string | null | undefined): number {
  return String(ubicacion ?? '').toUpperCase().includes('HIERRO') ? 2 : 1;
}

export const TIPO_ENTREGA_OPTIONS: { label: string; value: TipoEntregaInventario }[] = [
  { label: 'Requiere devolución', value: 'REQUIERE_DEVOLUCION' },
  { label: 'No requiere devolución', value: 'NO_REQUIERE_DEVOLUCION' },
];

export const VALOR_OTRO = 'OTRO';

export function nuevaEntregaCabecera(): EntregaCabecera {
  return {
    consecutivo: '',
    fecha: new Date(),
    concepto: null,
    conceptoDetalle: '',
    area: null,
    areaDetalle: '',
    idUsuarioEntregado: null,
    idConstructora: null,
    idProyecto: null,
    tipoDoc: null,
    numeroDoc: null,
    ubicacionEntrega: '',
    tipoEntrega: null,
    fechaDevolucion: null,
    autoriza: '',
    transporte: '',
    observaciones: '',
  };
}

const PALABRAS_MENORES = new Set(['de', 'del', 'y', 'la', 'el', 'en']);

/** "ASIGNACIÓN DE HERRAMIENTA" → "Asignación de Herramienta"; siglas cortas (SISO) se conservan. */
export function etiquetaParametro(valor: string): string {
  const v = String(valor ?? '').trim();
  if (!v.includes(' ') && v.length <= 4) return v.toUpperCase();
  return v
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (i > 0 && PALABRAS_MENORES.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

export function parametrosToOptions(valores: string[]): SelectOption[] {
  return valores.map((v) => ({ label: etiquetaParametro(v), value: v }));
}

/** Clave de stock: mismo agrupamiento que vw_inv_existencias. */
export function claveStock(r: { idMaterial?: number; id_material?: number; ubicacion: string | null; um: string }): string {
  return `${r.idMaterial ?? r.id_material}|${r.ubicacion ?? ''}|${r.um}`;
}
