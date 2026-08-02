import { eq, inArray } from "drizzle-orm";
import { db, billItemsTable, bookingsTable, statementsTable } from "@workspace/db";
import { currentMonthLabel } from "./loup";

/** Sum of bill items for the current calendar month, grouped by member. */
export async function currentMonthSpendByMember(): Promise<Map<number, number>> {
  const label = currentMonthLabel();
  const statements = await db
    .select({ id: statementsTable.id })
    .from(statementsTable)
    .where(eq(statementsTable.monthLabel, label));
  const spend = new Map<number, number>();
  if (statements.length === 0) {
    return spend;
  }
  const rows = await db
    .select({
      memberId: bookingsTable.memberId,
      amount: billItemsTable.amount,
    })
    .from(billItemsTable)
    .innerJoin(bookingsTable, eq(billItemsTable.bookingId, bookingsTable.id))
    .where(
      inArray(
        billItemsTable.statementId,
        statements.map((s) => s.id),
      ),
    );
  for (const row of rows) {
    spend.set(row.memberId, (spend.get(row.memberId) ?? 0) + row.amount);
  }
  return spend;
}
