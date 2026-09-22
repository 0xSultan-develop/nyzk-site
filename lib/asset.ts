/**
 * Prefix a root-absolute /public asset path with the deploy basePath.
 *
 * On GitHub Pages the site is served under /nyzk-site, but Next does NOT rewrite
 * hardcoded `<img src="/…">` or `url('/…')` — only its own bundler assets. So
 * every reference to a /public file must go through this. `NEXT_PUBLIC_BASE_PATH`
 * is baked at build (empty locally → paths stay root-absolute).
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function asset(p: string): string;
export function asset(p: string | undefined): string | undefined;
export function asset(p?: string): string | undefined {
  if (!p) return p;
  return p.startsWith("/") ? `${BASE}${p}` : p;
}
