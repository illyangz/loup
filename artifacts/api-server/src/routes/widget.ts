import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, institutionsTable, employeesTable, employersTable } from "@workspace/db";
import { GetWidgetTokenBody, GetWidgetTokenResponse } from "@workspace/api-zod";
import { signDemoToken } from "../lib/auth";

const router: IRouter = Router();

// ─── Widget token exchange (P1-7) ────────────────────────────────────────────
// Server-to-server credential exchange: an ERP/HRIS backend that already knows
// which of ITS employees is viewing a page calls this with a per-institution
// secret (never exposed to the browser — see the widget snippet on the
// landing page and /embed/demo, which call this from the server side before
// rendering) and gets back a short-lived, employee-scoped token to embed in
// the widget iframe. This is the real version of what the pre-P1-7 widget
// snippet only sketched (a fictional `employee-token` attribute with no
// issuance mechanism behind it).

const WIDGET_TOKEN_TTL_SECONDS = 15 * 60;

router.post("/v1/widget/token", async (req, res): Promise<void> => {
  const parsed = GetWidgetTokenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { institutionSlug, externalEmployeeId } = parsed.data;

  const [institution] = await db.select().from(institutionsTable).where(eq(institutionsTable.slug, institutionSlug));
  if (!institution) {
    res.status(404).json({ error: `Unknown institution slug: ${institutionSlug}` });
    return;
  }
  if (!institution.widgetSecret) {
    res.status(503).json({ error: "Widget not provisioned for this institution — no secret configured" });
    return;
  }

  const providedSecret = req.headers["x-loup-widget-secret"];
  if (providedSecret !== institution.widgetSecret) {
    res.status(401).json({ error: "Invalid widget secret" });
    return;
  }

  const [employee] = await db
    .select()
    .from(employeesTable)
    .innerJoin(employersTable, eq(employeesTable.employerId, employersTable.id))
    .where(and(eq(employeesTable.institutionId, institution.id), eq(employeesTable.externalEmployeeId, externalEmployeeId)));
  if (!employee) {
    res.status(404).json({ error: `Unknown employee for this institution: ${externalEmployeeId}` });
    return;
  }

  const token = await signDemoToken(
    {
      role: "employee",
      name: employee.employees.name,
      employerId: employee.employees.employerId,
      institutionId: institution.id,
      tenantId: institution.id,
      employeeId: employee.employees.id,
      memberId: employee.employees.linkedMemberId ?? undefined,
    },
    WIDGET_TOKEN_TTL_SECONDS,
  );

  res.json(
    GetWidgetTokenResponse.parse({
      token,
      expiresInSeconds: WIDGET_TOKEN_TTL_SECONDS,
      employeeName: employee.employees.name,
    }),
  );
});

export default router;
