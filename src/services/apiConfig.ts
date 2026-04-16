const DEFAULT_API_ROOT = "http://192.168.1.115:8080/apiReforlimer";

const normalizeApiRoot = (value: string) =>
  String(value || DEFAULT_API_ROOT).trim().replace(/\/+$/, "");

export const API_ROOT = normalizeApiRoot(
  process.env.EXPO_PUBLIC_API_ROOT || DEFAULT_API_ROOT,
);

export const API_ROOT_WITH_SLASH = `${API_ROOT}/`;
export const API_IMG_ROOT = `${API_ROOT}/img/`;
export const API_PRODUTOS_PHOTOS_ROOT = `${API_ROOT}/produtos/photos/`;
