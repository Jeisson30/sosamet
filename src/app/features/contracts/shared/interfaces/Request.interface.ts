export interface InsertContractRequest {
  tipo_doc: string;
  numerodoc: string;
  campos: {
    nombre: string;
    valor: string;
  }[];
  acta_plano_id?: number | null; // 👈 NUEVO (opcional)
}

export interface CampoInsert {
  nombre: string;
  valor: string;
}

/** Línea de detalle para SP_ActualizarContratoFull (JSON). */
export interface ContractDetalleLineJson {
  tipo_detalle: string;
  item?: string | null;
  empresa?: string | null;
  ref?: string | null;
  cant?: string | null;
  und?: string | null;
  ancho?: string | null;
  alto?: string | null;
  descripcion?: string | null;
  insumo?: string | null;
  valor_base?: string | null;
  porc_adm?: string | null;
  vr_adm?: string | null;
  porc_imp?: string | null;
  vr_imp?: string | null;
  porc_ut?: string | null;
  vr_ut?: string | null;
  porc_iva?: string | null;
  vr_iva?: string | null;
  vr_total?: string | null;
}

export interface UpdateContractFullRequest {
  numerodoc: string;
  cabecera: Record<string, string | null | undefined>;
  detalle?: ContractDetalleLineJson[] | null;
}

export interface UpdateAsistenciaRequest {
  numerodoc: string;
  campos: { nombre: string; valor: string }[];
}

export interface UpdateRemissionRequest {
  numerodoc: string;
  actualizar_cabecera: boolean;
  actualizar_detalle: boolean;

  tipo_doc_rem?: string | null;
  numero_contrato?: string | null;
  remision_material?: string | null;
  fecha_remision?: string | null;
  cliente?: string | null;
  proyecto?: string | null;
  despacho?: string | null;
  transporto?: string | null;
  empresa_asociada?: string | null;
  direccion_empresa?: string | null;
  orden_de_compra?: string | null;

  item?: string | null;
  empresa?: string | null;
  cantidad?: number | null;
  um?: string | null;
  detalle?: string | null;
  observaciones?: string | null;
}
