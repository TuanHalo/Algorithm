/**
 * Prefix an internal path with Astro's configured BASE_URL cleanly.
 * Leaves external URLs (http/https) untouched.
 */
export function withBase(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}` || '/';
}

