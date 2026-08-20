import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, paymentMethodsTable, statementsTable } from "@workspace/db";
import {
  GetBillingStatementResponse,
  ListBillingHistoryResponse,
  ListPaymentMethodsResponse,
  PayBillingStatementBody,
  PayBillingStatementResponse,
} from "@workspace/api-zod";
import {
  currentMonthLabel,
  ensureOpenStatement,
  fetchStatementItems,
  getHouseholdId,
  statementView,
  writeWebhookEvent,
} from "../lib/loup";
import { withIdempotency } from "../lib/idempotency";

const router: IRouter = Router();

router.get("/billing/statement", async (_req, res): Promise<void> => {
  const householdId = await getHouseholdId();
  const statement = await ensureOpenStatement(householdId);
  const view = await statementView(statement);
  res.json(GetBillingStatementResponse.parse(view));
});

router.get("/billing/methods", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(paymentMethodsTable)
    .orderBy(desc(paymentMethodsTable.isDefault), paymentMethodsTable.id);
  res.json(
    ListPaymentMethodsResponse.parse(
      rows.map(({ householdId: _h, ...method }) => method),
    ),
  );
});

router.post("/billing/pay", withIdempotency("POST /billing/pay", async (req, res): Promise<void> => {
  const parsed = PayBillingStatementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [method] = await db
    .select()
    .from(paymentMethodsTable)
    .where(eq(paymentMethodsTable.id, parsed.data.paymentMethodId));
  if (!method) {
    res.status(400).json({ error: "Payment method not found" });
    return;
  }

  const householdId = await getHouseholdId();
  const statement = await ensureOpenStatement(householdId);
  const items = await fetchStatementItems(statement.id);
  if (items.length === 0) {
    res.status(400).json({ error: "There is nothing to pay yet" });
    return;
  }

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const paidAt = new Date();
  // Atomically claim the open statement so a concurrent duplicate request
  // (double-click, retry) can't pay it twice or open two fresh statements.
  const claimed = await db
    .update(statementsTable)
    .set({
      status: "paid",
      total,
      itemCount: items.length,
      paidAt,
      paidWith: method.label,
    })
    .where(and(eq(statementsTable.id, statement.id), eq(statementsTable.status, "open")))
    .returning();
  if (claimed.length === 0) {
    res.status(409).json({ error: "This statement was already paid" });
    return;
  }

  // Open a fresh statement so new completed jobs keep accruing.
  await db.insert(statementsTable).values({
    householdId,
    monthLabel: currentMonthLabel(),
    status: "open",
    total: 0,
    itemCount: 0,
  });

  const view = await statementView({
    id: statement.id,
    monthLabel: statement.monthLabel,
    status: "paid",
    paidAt,
    paidWith: method.label,
  });
  req.log.info({ statementId: statement.id, total }, "Statement paid");
  await writeWebhookEvent("payment.completed", {
    statementId: statement.id,
    total,
    method: method.label,
    monthLabel: statement.monthLabel,
  });
  res.json(PayBillingStatementResponse.parse(view));
}));

router.get("/billing/history", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(statementsTable)
    .where(eq(statementsTable.status, "paid"))
    .orderBy(desc(statementsTable.paidAt));
  res.json(
    ListBillingHistoryResponse.parse(
      rows.map((s) => ({
        id: s.id,
        month: s.monthLabel,
        status: s.status,
        total: s.total,
        itemCount: s.itemCount,
        paidAt: s.paidAt,
        paidWith: s.paidWith,
      })),
    ),
  );
});

export default router;
