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
    UPLOAD_FILE_AIU : `${BASE_URL}/contracts/upload-excel`,
    UPLOAD_FILE_IVA : `${BASE_URL}/contracts/upload-iva`,
  }
};
