import { randomUUID } from "node:crypto";

// ─── WorkOS SSO (P1-1, Decision D1: managed IdP) ─────────────────────────────
// OAuth flow against WorkOS SSO: authorize -> callback(code) -> token -> profile.
// Endpoints: https://api.workos.com/sso/authorize, /sso/token, /sso/profile

export interface SsoConfig {
  clientId: string;
  apiKey: string;
  redirectUri: string;
  baseUrl: string;
}

export function getSsoConfig(): SsoConfig | null {
  const clientId = process.env["WORKOS_CLIENT_ID"];
  const apiKey = process.env["WORKOS_API_KEY"];
  const redirectUri = process.env["WORKOS_REDIRECT_URI"];
  if (!clientId || !apiKey || !redirectUri) return null;
  return {
    clientId,
    apiKey,
    redirectUri,
    baseUrl: process.env["WORKOS_BASE_URL"] ?? "https://api.workos.com",
  };
}

export function buildAuthorizeUrl(cfg: SsoConfig, connectionId: string, state: string): string {
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    connection: connectionId,
    response_type: "code",
    state,
  });
  return `${cfg.baseUrl}/sso/authorize?${params.toString()}`;
}

export interface SsoTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
}

export async function exchangeCode(cfg: SsoConfig, code: string): Promise<SsoTokenResponse> {
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.apiKey,
    code,
    grant_type: "authorization_code",
    redirect_uri: cfg.redirectUri,
  });
  const res = await fetch(`${cfg.baseUrl}/sso/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    throw new Error(`WorkOS token exchange failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as SsoTokenResponse;
}

export interface SsoProfile {
  id: string;
  idp_id: string;
  connection_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  raw_attributes?: Record<string, unknown>;
}

export async function fetchProfile(cfg: SsoConfig, accessToken: string): Promise<SsoProfile> {
  const res = await fetch(`${cfg.baseUrl}/sso/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`WorkOS profile fetch failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { profile: SsoProfile };
  return body.profile;
}

// ─── SSO state (CSRF nonce) ──────────────────────────────────────────────────

const SSO_STATE_TTL_MS = 10 * 60 * 1000;

const pendingStates = new Map<string, { slug: string; createdAt: number }>();

export function issueSsoState(slug: string): string {
  const state = randomUUID();
  pendingStates.set(state, { slug, createdAt: Date.now() });
  return state;
}

export function consumeSsoState(state: string): string | null {
  const entry = pendingStates.get(state);
  if (!entry) return null;
  pendingStates.delete(state);
  if (Date.now() - entry.createdAt > SSO_STATE_TTL_MS) return null;
  return entry.slug;
}

// ─── Principal resolution (pure, unit-tested) ────────────────────────────────

export interface SsoInstitutionRow {
  id: number;
  slug: string;
  name: string;
  adminEmails: string[];
}

export interface SsoEmployeeRow {
  id: number;
  employerId: number;
  institutionId: number | null;
  memberId: number | null;
  workEmail: string;
  name: string;
  benefitTier: string;
  label?: string;
}

export type SsoPrincipal =
  | { role: "institution"; name: string; institutionId: number; employerId?: number; tenantId: number; label?: string }
  | { role: "employee"; name: string; institutionId: number; employerId: number; employeeId: number; memberId?: number | null; tenantId: number; label?: string };

/**
 * Map an SSO profile email to a Loup principal:
 * 1. Institution admin (email in `adminEmails`) — role `institution`, scoped to that tenant.
 * 2. Employee with matching `workEmail` — role `employee`, claims carry tenantId + employeeId.
 * Emails never cross tenants: an email that appears in tenant A only resolves in tenant A.
 */
export function resolveSsoPrincipal(email: string, institutions: SsoInstitutionRow[], employees: SsoEmployeeRow[]): SsoPrincipal | null {
  const normalized = email.trim().toLowerCase();

  for (const institution of institutions) {
    if (institution.adminEmails.some((a) => a.toLowerCase() === normalized)) {
      const label = `${institution.name} — Institution admin`;
      return { role: "institution", name: institution.name, institutionId: institution.id, tenantId: institution.id, label };
    }
  }

  for (const employee of employees) {
    if (employee.institutionId != null && employee.workEmail.toLowerCase() === normalized) {
      return {
        role: "employee",
        name: employee.name,
        institutionId: employee.institutionId,
        employerId: employee.employerId,
        employeeId: employee.id,
        memberId: employee.memberId,
        tenantId: employee.institutionId,
        label: employee.label ?? `${employee.name} — ${employee.benefitTier}`,
      };
    }
  }

  return null;
}

export function generateSigningSecret(): string {
  // Web Crypto instead of node:crypto's randomBytes — identical entropy,
  // but works unmodified on both Node and Cloudflare Workers.
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}