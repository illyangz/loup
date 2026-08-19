import { setAuthTokenGetter } from "@workspace/api-client-react";

const TOKEN_KEY = "loup_demo_token";

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // storage unavailable (private mode) — session still works via getter
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // noop
  }
}

/** Attach the stored demo token to every generated API call as a Bearer header. */
export function ensureAuthGetter(): void {
  setAuthTokenGetter(() => getStoredToken());
}

/** Headers for raw fetch() calls outside the generated client. */
export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getStoredToken();
  if (token) extra["Authorization"] = `Bearer ${token}`;
  return extra;
}

export async function signOut(): Promise<void> {
  clearToken();
  setAuthTokenGetter(null);
}