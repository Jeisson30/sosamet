//Producción
//export const BASE_URL = 'https://gd.sosamet.com/api';
//Local
export const BASE_URL = 'http://localhost:3000/api';

export const API_ENDPOINTS = {
  USERS: `${BASE_URL}/getUsers`,
  ROLES: `${BASE_URL}/roles`,
  CREATE_USERS: `${BASE_URL}/createUser`,
  UPDATE_USER: `${BASE_URL}/updateUser`,
  STATE_USER: `${BASE_URL}/changeStateUser`,
  AUTH: {
    CHANGE_PASS: `${BASE_URL}/auth/changePassword`,
    LOGIN_USER: `${BASE_URL}/auth/loginUser`
  },
  CONTRACTS: {
    GET_TYPE_DOC: `${BASE_URL}/contracts/getTypeContracts`,
    GET_TYPE_FIELDS: `${BASE_URL}/contracts/getTypeFields`,
    INSERT_CONTRACT: `${BASE_URL}/contracts/insert`,
    GET_DETAIL: `${BASE_URL}/contracts/detail`,
    //Archivos planos
    UPLOAD_FILE_AIU : `${BASE_URL}/contracts/upload-excel`,
    UPLOAD_FILE_IVA : `${BASE_URL}/contracts/upload-iva`,
    UPLOAD_FILE_OC : `${BASE_URL}/contracts/upload-purchase-order`,
    UPLOAD_FILE_REMISION: `${BASE_URL}/contracts/upload-remisiones`,
    UPLOAD_FILE_ACTA_PAGO: `${BASE_URL}/contracts/upload-actas-pago`,
    //
    GET_COMPANIES: `${BASE_URL}/contracts/getCompanies`,
    PURCHASE_ORDERS: `${BASE_URL}/contracts/purchase-orders`,
    REMISSIONS: `${BASE_URL}/contracts/remissions`,
    CONSULT_CONTRACTS: `${BASE_URL}/contracts/consult-contracts`,
    CONSULT_ASISTENCIA: `${BASE_URL}/contracts/consult-asistencia`,
  },
  CATALOG: {
    CONSTRUCTORAS: `${BASE_URL}/catalog/constructoras`,
    PROYECTOS_BY_CONSTRUCTORA: (id: string) =>
      `${BASE_URL}/catalog/constructoras/${id}/proyectos`,
  },
  GESTION: {
    GET_ALL_USERS: `${BASE_URL}/gestion/users`,
    CREATE_LIQUIDATION: `${BASE_URL}/gestion/liquidation-courts`,
    CREATE_ORDER_WORK: `${BASE_URL}/gestion/order-work/create`
  },
  REPORTS: {
    /** Vista previa — datos reemplazables por SP. */
    PRODUCTION_BY_CONTRACT_PREVIEW: `${BASE_URL}/reports/production-by-contract/preview`,
    /** Exportar — format=xlsx (pdf reservado). */
    PRODUCTION_BY_CONTRACT_EXPORT: `${BASE_URL}/reports/production-by-contract/export`,
    /** Cartera — SP_REPORTE_CARTERA(numero_contrato) */
    CARTERA_PREVIEW: `${BASE_URL}/reports/cartera/preview`,
  },
};
