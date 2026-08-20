import { eq } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { db, employeesTable, institutionsTable } from "@workspace/db";
import { signDemoToken } from "../lib/auth";
import {
  buildAuthorizeUrl,
  consumeSsoState,
  exchangeCode,
  fetchProfile,
  getSsoConfig,
  issueSsoState,
  resolveSsoPrincipal,
} from "../lib/sso";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const WEB_APP_URL = process.env["WEB_APP_URL"] ?? "http://localhost:3001";

function redirectToLogin(res: Response, params: Record<string, string>): void {
  const query = new URLSearchParams(params).toString();
  res.redirect(`${WEB_APP_URL}/login?${query}`);
}

/** SSO availability per tenant: GET /api/v1/auth/sso/status */
router.get("/v1/auth/sso/status", async (_req: Request, res: Response): Promise<void> => {
  const cfg = getSsoConfig();
  const institutions = await db
    .select({ slug: institutionsTable.slug, name: institutionsTable.name, ssoConnectionId: institutionsTable.ssoConnectionId })
    .from(institutionsTable)
    .where(eq(institutionsTable.active, true));
  res.json({
    enabled: cfg !== null,
    institutions: institutions.map((i) => ({ slug: i.slug, name: i.name, ssoConfigured: i.ssoConnectionId != null })),
  });
});

/** Start WorkOS SSO for an institution: GET /api/v1/auth/sso?slug=meridian */
router.get("/v1/auth/sso", async (req: Request, res: Response): Promise<void> => {
  const cfg = getSsoConfig();
  if (!cfg) {
    res.status(503).json({ error: "SSO is not configured — demo mode active" });
    return;
  }

  const slug = String(req.query.slug ?? "").trim();
  if (!slug) {
    res.status(400).json({ error: "slug query parameter is required" });
    return;
  }

  const [institution] = await db
    .select({ id: institutionsTable.id, name: institutionsTable.name, ssoConnectionId: institutionsTable.ssoConnectionId })
    .from(institutionsTable)
    .where(eq(institutionsTable.slug, slug));
  if (!institution) {
    res.status(404).json({ error: "Unknown institution" });
    return;
  }
  if (!institution.ssoConnectionId) {
    res.status(503).json({ error: `SSO not configured for ${institution.name}` });
    return;
  }

  const state = issueSsoState(institution.id.toString());
  res.redirect(buildAuthorizeUrl(cfg, institution.ssoConnectionId, state));
});

/** WorkOS OAuth callback: GET /api/v1/auth/callback?code=&state= */
router.get("/v1/auth/callback", async (req: Request, res: Response): Promise<void> => {
  const cfg = getSsoConfig();
  if (!cfg) {
    res.status(503).json({ error: "SSO is not configured — demo mode active" });
    return;
  }

  const code = String(req.query.code ?? "");
  const state = String(req.query.state ?? "");
  if (!code || !state) {
    res.status(400).json({ error: "code and state query parameters are required" });
    return;
  }

  const institutionIdRaw = consumeSsoState(state);
  if (!institutionIdRaw) {
    redirectToLogin(res, { error: "sso_state_expired" });
    return;
  }
  const institutionId = Number(institutionIdRaw);

  try {
    const token = await exchangeCode(cfg, code);
    const profile = await fetchProfile(cfg, token.access_token);

    const [institution] = await db
      .select({ id: institutionsTable.id, slug: institutionsTable.slug, name: institutionsTable.name, adminEmails: institutionsTable.adminEmails })
      .from(institutionsTable)
      .where(eq(institutionsTable.id, institutionId));
    if (!institution) {
      redirectToLogin(res, { error: "unknown_institution" });
      return;
    }

    const employees = await db
      .select({
        id: employeesTable.id,
        employerId: employeesTable.employerId,
        institutionId: employeesTable.institutionId,
        memberId: employeesTable.linkedMemberId,
        workEmail: employeesTable.workEmail,
        name: employeesTable.name,
        benefitTier: employeesTable.benefitTier,
      })
      .from(employeesTable)
      .where(eq(employeesTable.institutionId, institution.id));

    const principal = resolveSsoPrincipal(profile.email, [institution], employees);
    if (!principal) {
      logger.warn({ email: profile.email, institutionId: institution.id }, "SSO email not mapped to a Loup user");
      redirectToLogin(res, { error: "no_account", email: profile.email });
      return;
    }

    const jwt = await signDemoToken({
      ...principal,
      memberId: "memberId" in principal ? principal.memberId ?? undefined : undefined,
    });
    redirectToLogin(res, { token: jwt });
  } catch (err) {
    logger.warn({ err }, "SSO callback failed");
    redirectToLogin(res, { error: "sso_failed" });
  }
});

export default router;