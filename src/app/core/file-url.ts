import { BASE_URL } from './url-constants';

/**
 * URL pública de un adjunto guardado como `uploads/<archivo>` (o `/uploads/...`).
 * Se sirve bajo `/api/uploads`: en producción el servidor web solo enruta `/api/*`
 * al backend; `/uploads/*` devuelve el index.html de Angular.
 */
export function buildFileUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const clean = String(path).trim().replace(/\\/g, '/');
  if (!clean) return null;
  if (/^(https?:|data:|blob:)/i.test(clean)) return clean;
  const rel = clean.replace(/^\/+/, '').replace(/^api\//i, '');
  const conCarpeta = /^uploads\//i.test(rel) ? rel : `uploads/${rel}`;
  return `${BASE_URL.replace(/\/+$/, '')}/${conCarpeta}`;
}
