export interface InsertContractRequest {
    tipo_doc: string;
    numerodoc: string;
    campos: CampoInsert[];
  }
  
  export interface CampoInsert {
    nombre: string;
    valor: string;
  }
  