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
