// P1-12: loup-admin previously only ever sent the legacy `x-loup-demo-role`
// header — that header is explicitly dev-only (platform.ts's requireRole
// falls back to it only when NODE_ENV !== "production"), so this app would
// 403 on every request in a real deployment. Mirrors the token-bootstrap
// pattern artifacts/loup/src/pages/embed-demo.tsx already uses.

const TOKEN_KEY = "loup_admin_demo_token";

/**
 * Origin to prepend to raw fetch() calls. In dev this stays empty and
 * requests go through Vite's proxy to API_TARGET. In a static production
 * build (e.g. Cloudflare Pages) there's no proxy, so VITE_API_BASE_URL
 * must point at the deployed API origin.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ?? "";

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // storage unavailable (private mode) — the in-memory session still works
    // for the current page load.
  }
}

let bootstrapped: Promise<void> | null = null;

/** Ensures a signed admin token is stored, minting one via the demo login route if needed. */
export function ensureAdminToken(): Promise<void> {
  if (getStoredToken()) return Promise.resolve();
  if (bootstrapped) return bootstrapped;
  bootstrapped = fetch(`${API_BASE_URL}/api/v1/demo/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "admin" }),
  })
    .then((res) => res.json() as Promise<{ token?: string }>)
    .then((data) => {
      if (data?.token) storeToken(data.token);
    })
    .catch(() => {
      // Bootstrap is best-effort — adminFetch will 401/403 and surface a
      // normal loading-error state rather than hang.
    });
  return bootstrapped;
}
