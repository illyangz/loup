import { SignJWT, jwtVerify } from "jose";
import type { NextFunction, Request, Response } from "express";

// ─── Demo auth: signed JWTs ──────────────────────────────────────────────────
// The pitch demo signs tokens in-process with an HS256 secret. In production
// LOUP_DEMO_JWT_SECRET is required; in dev it falls back to a fixed string so
// the demo "just works". Real OIDC (Decision D1) replaces this for the pilot.

export type DemoRole = "employee" | "institution" | "provider" | "admin";

export interface DemoPrincipal {
  role: DemoRole;
  name: string;
  employerId?: number;
  institutionId?: number;
  /** P1-1: claims carry an explicit tenant id (= institutionId). */
  tenantId?: number;
  providerId?: number;
  memberId?: number;
  employeeId?: number;
  label?: string;
}

const TOKEN_TTL_SECONDS = 8 * 60 * 60;

function getSecret(): Uint8Array {
  if (process.env.NODE_ENV === "production" && !process.env.LOUP_DEMO_JWT_SECRET) {
    throw new Error("LOUP_DEMO_JWT_SECRET must be set in production");
  }
  return new TextEncoder().encode(
    process.env.LOUP_DEMO_JWT_SECRET ?? "loup-demo-dev-secret-change-me",
  );
}

export async function signDemoToken(principal: DemoPrincipal, ttlSeconds: number = TOKEN_TTL_SECONDS): Promise<string> {
  return new SignJWT({ principal })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(principal.role))
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(getSecret());
}

export async function verifyDemoToken(token: string): Promise<DemoPrincipal | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    return (payload.principal as DemoPrincipal) ?? null;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

/**
 * Role guard: accepts a verified demo JWT whose principal.role is in `allowed`.
 * Falls back to the legacy `x-loup-demo-role` header in non-production only.
 * Sets `res.locals.principal` for downstream handlers.
 */
export function requireRole(...allowed: DemoRole[]): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = getTokenFromRequest(req);
    if (token) {
      const principal = await verifyDemoToken(token);
      if (principal && allowed.includes(principal.role)) {
        res.locals.principal = principal;
        next();
        return;
      }
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    if (process.env.NODE_ENV === "production") {
      res.status(403).json({ error: "Authentication required (production mode)" });
      return;
    }

    const role = (req.headers["x-loup-demo-role"] as string | undefined)?.toLowerCase() as DemoRole | undefined;
    if (role && allowed.includes(role)) {
      res.locals.principal = { role, name: "Demo header principal" };
      next();
      return;
    }

    res.status(403).json({
      error: `Forbidden: ${allowed.join(" or ")} role required. Pass a valid token or x-loup-demo-role: ${allowed[0]}`,
    });
  };
}

export function getPrincipal(req: Request, res: Response): DemoPrincipal | undefined {
  return res.locals?.principal as DemoPrincipal | undefined;
}

export { TOKEN_TTL_SECONDS };