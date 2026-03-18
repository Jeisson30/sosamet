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
