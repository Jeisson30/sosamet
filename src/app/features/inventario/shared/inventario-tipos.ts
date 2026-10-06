export type TipoMovimientoInventario = 'INGRESO' | 'DESPACHO' | 'DEVOLUCION';

/** Textos e ícono por tipo de movimiento (mismo componente para ingresos y despachos). */
export interface MovimientoConfig {
  tipo: TipoMovimientoInventario;
  icon: string;
  tituloNuevo: string;
  subtituloNuevo: string;
  tituloConsulta: string;
  subtituloConsulta: string;
  panelDatos: string;
  labelGuardar: string;
  labelNuevo: string;
  rutaNuevo: string;
  rutaConsulta: string;
}

export const MOVIMIENTO_CONFIG: Record<TipoMovimientoInventario, MovimientoConfig> = {
  INGRESO: {
    tipo: 'INGRESO',
    icon: 'assets/images/IngresoMaterial.png',
    tituloNuevo: 'Nuevo ingreso',
    subtituloNuevo: 'Registra la entrada de materiales al inventario.',
    tituloConsulta: 'Consultar ingresos',
    subtituloConsulta: 'Historial de entradas de materiales al inventario.',
    panelDatos: 'Datos del ingreso',
    labelGuardar: 'Guardar ingreso',
    labelNuevo: 'Nuevo ingreso',
    rutaNuevo: '/dashboard/inventario/ingresos/nuevo',
    rutaConsulta: '/dashboard/inventario/ingresos',
  },
  DESPACHO: {
    tipo: 'DESPACHO',
    icon: 'assets/images/EntregaMaterial.png',
    tituloNuevo: 'Nueva entrega',
    subtituloNuevo: 'Registra la entrega de materiales y herramientas.',
    tituloConsulta: 'Consulta movimientos',
    subtituloConsulta: 'Historial de entregas y devoluciones de materiales y herramientas.',
    panelDatos: 'Datos de la entrega',
    labelGuardar: 'Guardar entrega',
    labelNuevo: 'Nueva entrega',
    rutaNuevo: '/dashboard/inventario/despachos/nuevo',
    rutaConsulta: '/dashboard/inventario/despachos',
  },
  DEVOLUCION: {
    tipo: 'DEVOLUCION',
    icon: 'assets/images/EntregaMaterial.png',
    tituloNuevo: 'Nueva devolución',
    subtituloNuevo: 'Registra la devolución de materiales y herramientas al inventario.',
    tituloConsulta: 'Consulta movimientos',
    subtituloConsulta: 'Historial de entregas y devoluciones de materiales y herramientas.',
    panelDatos: 'Datos de la devolución',
    labelGuardar: 'Guardar devolución',
    labelNuevo: 'Nueva devolución',
    rutaNuevo: '/dashboard/inventario/devoluciones/nuevo',
    rutaConsulta: '/dashboard/inventario/despachos',
  },
};
