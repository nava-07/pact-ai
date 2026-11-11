// Same-origin in dev (Vite proxies /api). Set VITE_API_URL when the API lives on another domain (e.g. Render).
const BASE = import.meta.env.VITE_API_URL ?? '';
export class ApiError extends Error { constructor(public status: number, m: string) { super(m); } }
export async function api<T = any>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let r: Response;
  try { r = await fetch(BASE + '/api' + path, { method, credentials: 'include', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined }); }
  catch { throw new ApiError(0, 'Can’t reach the server. Is the backend running?'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(r.status, j.details?.[0]?.message ?? j.error ?? 'Request failed');
  return j as T;
}
