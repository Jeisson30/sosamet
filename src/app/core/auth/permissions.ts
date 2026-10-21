/**
 * Matriz de permisos (Excel RBAC).
 * Crear usuarios + Módulo Contratos alineados; Producción/Inventario se mantienen.
 */

/** IDs usados en guards/menú (coherentes con middlewares del back). */
export const PERFIL_ID = {
  ADMINISTRADOR: 1,
  SUPERVISOR_PROYECTOS: 2,
  CONTABILIDAD: 10,
} as const;

export const PERFIL_NOMBRE = {
  ADMINISTRADOR: 'ADMINISTRADOR',
  AUXILIAR: 'AUXILIAR',
  SUPERVISOR_PROYECTOS: 'SUPERVISOR DE PROYECTOS',
  RESIDENTE_OBRA: 'RESIDENTE DE OBRA',
  DELINEANTE: 'DELINEANTE DE ARQUITECTURA',
  COORD_PRODUCCION: 'COORDINADOR DE PRODUCCION',
  CONTRATISTA: 'CONTRATISTA',
  COORD_COMPRAS: 'COORDINADOR DE COMPRAS',
  ALMACENISTA: 'ALMACENISTA',
  CONTABILIDAD: 'CONTABILIDAD',
  OFICINA: 'OFICINA',
  OBRA: 'OBRA',
  ARMADOR: 'ARMADOR',
  PINTOR: 'PINTOR',
  INSTALADOR: 'INSTALADOR',
  TRANSPORTE: 'TRANSPORTE',
  /** Solo módulo Producción → Asistencia (Nuevo + Consulta). */
  SISO: 'SISO',
} as const;

type DocTipo = 'CONTRATO' | 'REMISIONES' | 'ACTAS DE PAGO' | string;

/**
 * Documentos del hub Contratos / creación (Excel + producción existente).
 * CONTRATO/OTRO SI: Admin, Aux, Supervisor (edición+valores);
 *   Obra, Residente, Diseño, Coord Prod (acceso SIN VALORES).
 * Contabilidad: NO contrato/otro sí; SÍ remisión (ver) y actas de pago (edición).
 */
export const DOCUMENTS_BY_PROFILE: Record<string, string[]> = {
  [PERFIL_NOMBRE.ADMINISTRADOR]: [
    'CONTRATO',
    'ASISTENCIA',
    'ACTAS DE MEDIDA',
    'ORDEN DE COMPRA',
    'REMISIONES',
    'ACTAS DE PAGO',
  ],
  [PERFIL_NOMBRE.AUXILIAR]: [
    'CONTRATO',
    'ASISTENCIA',
    'ACTAS DE MEDIDA',
    'ORDEN DE COMPRA',
    'REMISIONES',
    'ACTAS DE PAGO',
  ],
  [PERFIL_NOMBRE.SUPERVISOR_PROYECTOS]: [
    'CONTRATO',
    'ASISTENCIA',
    'ACTAS DE MEDIDA',
    'ORDEN DE COMPRA',
    'REMISIONES',
    'ACTAS DE PAGO',
  ],
  [PERFIL_NOMBRE.RESIDENTE_OBRA]: ['CONTRATO', 'REMISIONES'],
  [PERFIL_NOMBRE.DELINEANTE]: ['CONTRATO', 'REMISIONES'],
  [PERFIL_NOMBRE.COORD_PRODUCCION]: ['CONTRATO', 'REMISIONES'],
  /** Producción: solo Ejecución (matriz Excel); sin docs de contrato. */
  [PERFIL_NOMBRE.CONTRATISTA]: [],
  [PERFIL_NOMBRE.COORD_COMPRAS]: ['ORDEN DE COMPRA'],
  [PERFIL_NOMBRE.ALMACENISTA]: ['REMISIONES'],
  /** Excel: Contabilidad sin Contrato/Otro Sí; Remisión ver; Actas de pago edición. */
  [PERFIL_NOMBRE.CONTABILIDAD]: ['REMISIONES', 'ACTAS DE PAGO'],
  [PERFIL_NOMBRE.OFICINA]: [],
  [PERFIL_NOMBRE.OBRA]: ['CONTRATO', 'REMISIONES'],
  [PERFIL_NOMBRE.ARMADOR]: [],
  [PERFIL_NOMBRE.PINTOR]: [],
  [PERFIL_NOMBRE.INSTALADOR]: [],
  [PERFIL_NOMBRE.TRANSPORTE]: [],
  [PERFIL_NOMBRE.SISO]: ['ASISTENCIA'],
};

/** Quién puede CREAR (botón Nuevo) / EDICIÓN en módulo contratos (Excel). */
const CREATE_EDIT_CONTRATO = new Set<string>([
  PERFIL_NOMBRE.ADMINISTRADOR,
  PERFIL_NOMBRE.AUXILIAR,
  PERFIL_NOMBRE.SUPERVISOR_PROYECTOS,
]);

const CREATE_EDIT_REMISION = new Set<string>([
  PERFIL_NOMBRE.ADMINISTRADOR,
  PERFIL_NOMBRE.AUXILIAR,
  PERFIL_NOMBRE.SUPERVISOR_PROYECTOS,
]);

const CREATE_EDIT_ACTAS_PAGO = new Set<string>([
  PERFIL_NOMBRE.ADMINISTRADOR,
  PERFIL_NOMBRE.AUXILIAR,
  PERFIL_NOMBRE.SUPERVISOR_PROYECTOS,
  PERFIL_NOMBRE.CONTABILIDAD,
]);

/** Tipos de documento que viven en el hub de Producción. */
export const TIPOS_EN_PRODUCCION = new Set([
  'ASISTENCIA',
  'ACTAS DE MEDIDA',
  'ORDEN DE COMPRA',
]);

/** Ids de cards del hub de Producción. */
export type ProductionCardId =
  | 'attendance'
  | 'measurement-acts'
  | 'plans'
  | 'purchase-orders'
  | 'work-orders'
  | 'cuts-execution'
  | 'cuts-liquidation'
  | 'summary';

/** edit = Nuevo/EDICIÓN; view = solo consultar (Excel). */
export type ProductionAccessLevel = 'edit' | 'view';

/**
 * Matriz Excel MÓDULO PRODUCCIÓN (card → edit|view).
 * Roles sin filas (Oficina, Almacenista, Transporte) → sin cards.
 */
const PRODUCTION_ACCESS_BY_PROFILE: Record<
  string,
  Partial<Record<ProductionCardId, ProductionAccessLevel>>
> = {
  [PERFIL_NOMBRE.ADMINISTRADOR]: {
    attendance: 'edit',
    'measurement-acts': 'edit',
    plans: 'edit',
    'purchase-orders': 'edit',
    'work-orders': 'edit',
    'cuts-execution': 'edit',
    'cuts-liquidation': 'edit',
    summary: 'edit',
  },
  [PERFIL_NOMBRE.AUXILIAR]: {
    attendance: 'edit',
    'measurement-acts': 'edit',
    plans: 'edit',
    'purchase-orders': 'edit',
    'work-orders': 'edit',
    'cuts-liquidation': 'view',
  },
  [PERFIL_NOMBRE.SUPERVISOR_PROYECTOS]: {
    attendance: 'edit',
    'measurement-acts': 'edit',
    plans: 'edit',
    'purchase-orders': 'view',
    'work-orders': 'edit',
    'cuts-execution': 'view',
    'cuts-liquidation': 'view',
  },
  [PERFIL_NOMBRE.CONTABILIDAD]: {
    'work-orders': 'edit',
    'cuts-execution': 'view',
    'cuts-liquidation': 'edit',
  },
  [PERFIL_NOMBRE.OBRA]: {
    'measurement-acts': 'edit',
    plans: 'edit',
  },
  [PERFIL_NOMBRE.RESIDENTE_OBRA]: {
    'work-orders': 'edit',
    'cuts-execution': 'edit',
  },
  [PERFIL_NOMBRE.DELINEANTE]: {
    'measurement-acts': 'view',
    plans: 'edit',
    'purchase-orders': 'edit',
  },
  [PERFIL_NOMBRE.COORD_PRODUCCION]: {
    'measurement-acts': 'view',
    plans: 'view',
    'purchase-orders': 'view',
    'work-orders': 'edit',
  },
  [PERFIL_NOMBRE.CONTRATISTA]: {
    'cuts-execution': 'edit',
  },
  [PERFIL_NOMBRE.ARMADOR]: {
    'cuts-execution': 'edit',
  },
  [PERFIL_NOMBRE.PINTOR]: {
    'cuts-execution': 'edit',
  },
  [PERFIL_NOMBRE.INSTALADOR]: {
    'cuts-execution': 'edit',
  },
  [PERFIL_NOMBRE.COORD_COMPRAS]: {
    'purchase-orders': 'edit',
  },
  [PERFIL_NOMBRE.SISO]: {
    attendance: 'edit',
  },
};

const DOC_TO_PRODUCTION_CARD: Record<string, ProductionCardId> = {
  ASISTENCIA: 'attendance',
  'ACTAS DE MEDIDA': 'measurement-acts',
  'ORDEN DE COMPRA': 'purchase-orders',
};

export function getNombrePerfil(): string {
  return String(localStorage.getItem('nombre_perfil') || '').trim();
}

export function getIdPerfil(): number {
  return Number(localStorage.getItem('id_perfil'));
}

function normPerfil(nombre: string): string {
  return String(nombre || '').trim().toUpperCase();
}

export function documentosPermitidos(nombrePerfil = getNombrePerfil()): string[] {
  const raw = String(nombrePerfil || '').trim();
  return (
    DOCUMENTS_BY_PROFILE[raw] ||
    DOCUMENTS_BY_PROFILE[normPerfil(raw)] ||
    []
  );
}

/** ¿Puede ver la card / consultar el tipo? */
export function puedeConsultarDocumento(
  tipoDoc: DocTipo,
  nombrePerfil = getNombrePerfil()
): boolean {
  const tipo = String(tipoDoc || '').trim().toUpperCase();
  if (tipo === 'OTRO SI' || tipo === 'OTROSI') {
    return documentosPermitidos(nombrePerfil).includes('CONTRATO');
  }
  return documentosPermitidos(nombrePerfil).includes(tipo);
}

/**
 * ¿Puede crear (Nuevo) este documento?
 * Excel: edición = crear; sin valores / solo vista = consultar sin Nuevo.
 * Docs de producción (Asistencia/Actas/OC) siguen la matriz de Producción.
 */
export function puedeCrearDocumento(
  tipoDoc: DocTipo,
  nombrePerfil = getNombrePerfil()
): boolean {
  const n = normPerfil(nombrePerfil);
  const tipo = String(tipoDoc || '').trim().toUpperCase();

  if (tipo === 'CONTRATO' || tipo === 'OTRO SI' || tipo === 'OTROSI') {
    return CREATE_EDIT_CONTRATO.has(n);
  }
  if (tipo === 'REMISIONES' || tipo === 'REMISION') {
    return CREATE_EDIT_REMISION.has(n);
  }
  if (tipo === 'ACTAS DE PAGO') {
    return CREATE_EDIT_ACTAS_PAGO.has(n);
  }

  const prodCard = DOC_TO_PRODUCTION_CARD[tipo];
  if (prodCard) {
    return puedeEditarProduccionCard(prodCard, nombrePerfil);
  }

  return documentosPermitidos(nombrePerfil).includes(tipo);
}

function productionAccessMap(
  nombrePerfil = getNombrePerfil()
): Partial<Record<ProductionCardId, ProductionAccessLevel>> {
  return PRODUCTION_ACCESS_BY_PROFILE[normPerfil(nombrePerfil)] || {};
}

export function productionCardIdsForProfile(
  nombrePerfil = getNombrePerfil()
): ProductionCardId[] {
  return Object.keys(productionAccessMap(nombrePerfil)) as ProductionCardId[];
}

export function puedeVerProduccionCard(
  cardId: ProductionCardId,
  nombrePerfil = getNombrePerfil()
): boolean {
  return !!productionAccessMap(nombrePerfil)[cardId];
}

/** Nuevo / EDICIÓN en card de producción (Excel). */
export function puedeEditarProduccionCard(
  cardId: ProductionCardId,
  nombrePerfil = getNombrePerfil()
): boolean {
  return productionAccessMap(nombrePerfil)[cardId] === 'edit';
}

/** Edición Contrato / Otro Sí: Admin, Auxiliar, Supervisor (Excel EDICIÓN). */
export function puedeEditarContrato(
  idPerfil = getIdPerfil(),
  nombrePerfil = getNombrePerfil()
): boolean {
  if (
    idPerfil === PERFIL_ID.ADMINISTRADOR ||
    idPerfil === PERFIL_ID.SUPERVISOR_PROYECTOS
  ) {
    return true;
  }
  const n = normPerfil(nombrePerfil);
  return CREATE_EDIT_CONTRATO.has(n);
}

/** Edición Remisión: Admin, Auxiliar, Supervisor. */
export function puedeEditarRemision(
  idPerfil = getIdPerfil(),
  nombrePerfil = getNombrePerfil()
): boolean {
  return puedeEditarContrato(idPerfil, nombrePerfil);
}

/** Edición Actas de Pago: Admin, Auxiliar, Supervisor, Contabilidad. */
export function puedeEditarActasPago(
  idPerfil = getIdPerfil(),
  nombrePerfil = getNombrePerfil()
): boolean {
  if (
    idPerfil === PERFIL_ID.ADMINISTRADOR ||
    idPerfil === PERFIL_ID.SUPERVISOR_PROYECTOS ||
    idPerfil === PERFIL_ID.CONTABILIDAD
  ) {
    return true;
  }
  return CREATE_EDIT_ACTAS_PAGO.has(normPerfil(nombrePerfil));
}

/**
 * Valores monetarios Contrato / Otro Sí:
 * Solo Administrador y Supervisor de Proyectos.
 * Auxiliar y el resto pueden operar el módulo sin ver montos.
 */
export function puedeVerValoresContrato(
  idPerfil = getIdPerfil(),
  nombrePerfil = getNombrePerfil()
): boolean {
  if (
    idPerfil === PERFIL_ID.ADMINISTRADOR ||
    idPerfil === PERFIL_ID.SUPERVISOR_PROYECTOS
  ) {
    return true;
  }
  const n = normPerfil(nombrePerfil);
  return (
    n === PERFIL_NOMBRE.ADMINISTRADOR ||
    n === PERFIL_NOMBRE.SUPERVISOR_PROYECTOS
  );
}

export function puedeCrearUsuarios(idPerfil = getIdPerfil()): boolean {
  return idPerfil === PERFIL_ID.ADMINISTRADOR;
}

export function puedeVerAdministracion(idPerfil = getIdPerfil()): boolean {
  return (
    idPerfil === PERFIL_ID.ADMINISTRADOR ||
    idPerfil === PERFIL_ID.SUPERVISOR_PROYECTOS
  );
}

export function puedeVerProduccion(
  _idPerfil = getIdPerfil(),
  nombrePerfil = getNombrePerfil()
): boolean {
  return productionCardIdsForProfile(nombrePerfil).length > 0;
}

export function esPerfilSiso(nombrePerfil = getNombrePerfil()): boolean {
  return normPerfil(nombrePerfil) === PERFIL_NOMBRE.SISO;
}

/** Hub Contratos del menú: SISO no entra. */
export function puedeVerHubContratos(nombrePerfil = getNombrePerfil()): boolean {
  return !esPerfilSiso(nombrePerfil);
}

/**
 * SISO puede elegir trabajador en Asistencia; el resto queda fijado al usuario logueado.
 */
export function puedeSeleccionarTrabajadorAsistencia(
  nombrePerfil = getNombrePerfil()
): boolean {
  return esPerfilSiso(nombrePerfil);
}

/**
 * Excel INVENTARIO — acciones:
 * ingreso / entrega / devolucion / actual / reporte
 * edit = ingreso+edición; view = solo consulta.
 */
export type InventarioAccionId =
  | 'ingreso'
  | 'entrega'
  | 'devolucion'
  | 'actual'
  | 'reporte';

export type InventarioAccessLevel = 'edit' | 'view';

const INVENTARIO_MOVIMIENTOS_EDIT: Partial<
  Record<InventarioAccionId, InventarioAccessLevel>
> = {
  ingreso: 'edit',
  entrega: 'edit',
  devolucion: 'edit',
  actual: 'view',
};

const INVENTARIO_ACCESS_BY_PROFILE: Record<
  string,
  Partial<Record<InventarioAccionId, InventarioAccessLevel>>
> = {
  [PERFIL_NOMBRE.ADMINISTRADOR]: {
    ingreso: 'edit',
    entrega: 'edit',
    devolucion: 'edit',
    actual: 'view',
    reporte: 'view',
  },
  [PERFIL_NOMBRE.AUXILIAR]: { ...INVENTARIO_MOVIMIENTOS_EDIT },
  [PERFIL_NOMBRE.SUPERVISOR_PROYECTOS]: { ...INVENTARIO_MOVIMIENTOS_EDIT },
  /** Contabilidad: movimientos con edición; sin inventario actual ni reporte. */
  [PERFIL_NOMBRE.CONTABILIDAD]: {
    ingreso: 'edit',
    entrega: 'edit',
    devolucion: 'edit',
  },
  [PERFIL_NOMBRE.COORD_COMPRAS]: { ...INVENTARIO_MOVIMIENTOS_EDIT },
  [PERFIL_NOMBRE.ALMACENISTA]: { ...INVENTARIO_MOVIMIENTOS_EDIT },
};

function inventarioAccessMap(
  nombrePerfil = getNombrePerfil()
): Partial<Record<InventarioAccionId, InventarioAccessLevel>> {
  const n = normPerfil(nombrePerfil);
  if (INVENTARIO_ACCESS_BY_PROFILE[n]) {
    return INVENTARIO_ACCESS_BY_PROFILE[n];
  }
  // Por id conocido (JWT sin nombre o legado).
  const id = getIdPerfil();
  if (id === PERFIL_ID.ADMINISTRADOR) {
    return INVENTARIO_ACCESS_BY_PROFILE[PERFIL_NOMBRE.ADMINISTRADOR];
  }
  if (id === PERFIL_ID.SUPERVISOR_PROYECTOS) {
    return INVENTARIO_ACCESS_BY_PROFILE[PERFIL_NOMBRE.SUPERVISOR_PROYECTOS];
  }
  if (id === PERFIL_ID.CONTABILIDAD) {
    return INVENTARIO_ACCESS_BY_PROFILE[PERFIL_NOMBRE.CONTABILIDAD];
  }
  return {};
}

export function inventarioAccionesPermitidas(
  nombrePerfil = getNombrePerfil()
): InventarioAccionId[] {
  return Object.keys(inventarioAccessMap(nombrePerfil)) as InventarioAccionId[];
}

export function puedeVerInventarioAccion(
  accion: InventarioAccionId,
  nombrePerfil = getNombrePerfil()
): boolean {
  return !!inventarioAccessMap(nombrePerfil)[accion];
}

export function puedeEditarInventarioAccion(
  accion: InventarioAccionId,
  nombrePerfil = getNombrePerfil()
): boolean {
  return inventarioAccessMap(nombrePerfil)[accion] === 'edit';
}

export function puedeVerInventario(
  _idPerfil = getIdPerfil(),
  nombrePerfil = getNombrePerfil()
): boolean {
  return inventarioAccionesPermitidas(nombrePerfil).length > 0;
}

/**
 * Tipos de informe (ids UI) — Excel INFORMES:
 * - Admin: todos
 * - Supervisor Proyectos: MOVIMIENTO GENERAL + PRODUCCIÓN
 * - Contabilidad: solo FINANZAS
 */
export type InformeTipoId =
  | 'payment'
  | 'production-contract'
  | 'production-plant'
  | 'movements';

const INFORMES_TODOS: InformeTipoId[] = [
  'payment',
  'production-contract',
  'production-plant',
  'movements',
];

/** Excel: Supervisor → General + Producción (sin Contratos ni Finanzas). */
const INFORMES_SUPERVISOR: InformeTipoId[] = ['movements', 'production-plant'];

/** Excel: Contabilidad → solo Finanzas. */
const INFORMES_CONTABILIDAD: InformeTipoId[] = ['payment'];

export function puedeVerInformes(
  idPerfil = getIdPerfil(),
  nombrePerfil = getNombrePerfil()
): boolean {
  if (
    idPerfil === PERFIL_ID.ADMINISTRADOR ||
    idPerfil === PERFIL_ID.SUPERVISOR_PROYECTOS ||
    idPerfil === PERFIL_ID.CONTABILIDAD
  ) {
    return true;
  }
  const n = normPerfil(nombrePerfil);
  return (
    n === PERFIL_NOMBRE.ADMINISTRADOR ||
    n === PERFIL_NOMBRE.SUPERVISOR_PROYECTOS ||
    n === PERFIL_NOMBRE.CONTABILIDAD
  );
}

/** Tipos de informe permitidos para el perfil actual (Excel). */
export function informeTiposPermitidos(
  idPerfil = getIdPerfil(),
  nombrePerfil = getNombrePerfil()
): InformeTipoId[] {
  if (!puedeVerInformes(idPerfil, nombrePerfil)) {
    return [];
  }
  if (
    idPerfil === PERFIL_ID.ADMINISTRADOR ||
    normPerfil(nombrePerfil) === PERFIL_NOMBRE.ADMINISTRADOR
  ) {
    return [...INFORMES_TODOS];
  }
  if (
    idPerfil === PERFIL_ID.SUPERVISOR_PROYECTOS ||
    normPerfil(nombrePerfil) === PERFIL_NOMBRE.SUPERVISOR_PROYECTOS
  ) {
    return [...INFORMES_SUPERVISOR];
  }
  if (
    idPerfil === PERFIL_ID.CONTABILIDAD ||
    normPerfil(nombrePerfil) === PERFIL_NOMBRE.CONTABILIDAD
  ) {
    return [...INFORMES_CONTABILIDAD];
  }
  return [];
}

export function informeTipoHabilitado(
  tipo: InformeTipoId,
  idPerfil = getIdPerfil(),
  nombrePerfil = getNombrePerfil()
): boolean {
  return informeTiposPermitidos(idPerfil, nombrePerfil).includes(tipo);
}
