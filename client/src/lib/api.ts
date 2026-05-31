/** 生产分体部署时设为后端根地址，如 https://xxx.onrender.com；同源托管留空 */
const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? '';

export const API_BASE = raw.replace(/\/$/, '');

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${p}` : p;
}

export const IS_PUBLIC_DEMO =
  import.meta.env.VITE_PUBLIC_DEMO === 'true' || import.meta.env.VITE_PUBLIC_DEMO === '1';
