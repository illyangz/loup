export type LedgerEntryType = "authorized" | "reserved" | "redeemed" | "released";

export interface AllowanceEntry {
  entryType: string;
  amount: number;
  /** Which booking (or other reference) this entry resolves — see computeAllowancePosition. */
  referenceId?: number | string | null;
}

export interface AllowancePosition {
  authorized: number;
  reserved: number;
  redeemed: number;
  available: number;
}

/** Money-path math kept pure and unit-tested (P0-7). */

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Position from a ledger slice. `authorized` falls back to the tier-derived
 * total only when the ledger holds no authorization entries at all.
 *
 * "reserved" nets each hold against its own resolution (P1-9 cancellation-
 * reversal fix): a booking's `reserved` entry is offset by a `released` entry
 * (cancelled/rejected) or a `redeemed` entry (completed) that shares its
 * `referenceId`, so a resolved hold stops permanently counting against
 * available balance. Netting is scoped per `referenceId` rather than done as
 * one flat sum across the whole ledger slice — otherwise one booking's
 * redemption could incorrectly "pay down" an unrelated booking's still-active
 * reservation. Entries with no `referenceId` (manual adjustments, seed
 * flavor rows not tied to a real booking) are each their own isolated group.
 */
export function computeAllowancePosition(entries: AllowanceEntry[], tierAuthorized: number): AllowancePosition {
  const authorized = entries
    .filter((e) => e.entryType === "authorized")
    .reduce((s, e) => s + e.amount, 0) || tierAuthorized;
  const redeemed = entries.filter((e) => e.entryType === "redeemed").reduce((s, e) => s + e.amount, 0);

  const holdsByRef = new Map<string, number>();
  entries.forEach((e, i) => {
    if (e.entryType !== "reserved" && e.entryType !== "released" && e.entryType !== "redeemed") return;
    const key = e.referenceId != null ? `ref:${e.referenceId}` : `row:${i}`;
    const delta = e.entryType === "reserved" ? e.amount : -e.amount;
    holdsByRef.set(key, (holdsByRef.get(key) ?? 0) + delta);
  });
  let reserved = 0;
  for (const net of holdsByRef.values()) reserved += Math.max(0, net);

  return {
    authorized,
    reserved,
    redeemed,
    available: Math.max(0, round2(authorized - reserved - redeemed)),
  };
}

/** Checkout split: 10% institutional discount, allowance covers what it can. */
export function computeCheckoutSplit(params: {
  publicPrice: number;
  availableAllowance: number;
  discountPct?: number;
}): {
  institutionalPrice: number;
  institutionalSaving: number;
  employerContribution: number;
  employeeCopayment: number;
} {
  const discountPct = params.discountPct ?? 10;
  const institutionalPrice = round2(params.publicPrice * (1 - discountPct / 100));
  const institutionalSaving = round2(params.publicPrice - institutionalPrice);
  const employerContribution = Math.min(params.availableAllowance, institutionalPrice);
  const employeeCopayment = Math.max(0, round2(institutionalPrice - employerContribution));
  return { institutionalPrice, institutionalSaving, employerContribution, employeeCopayment };
}

/** Redemption on completion: never redeem more than was reserved for the booking. */
export function computeRedemptionAmount(reservedAmount: number, priceEstimate: number): number {
  if (reservedAmount <= 0) return 0;
  return Math.min(reservedAmount, Math.max(0, priceEstimate));
}

export interface PlatformFeeRow {
  institutionId: number;
  feeRatePct: number;
  perEmployeeMonthlyFee: number;
  cycleVolume: number;
  eligibleEmployees: number;
}

export interface PlatformRevenueSummary {
  total: number;
  byInstitution: Array<{ institutionId: number; monthly: number; feeRatePct: number; perEmployeeMonthlyFee: number }>;
}

/** Per-institution revenue stays isolated; the total is the honest sum (P0-4/P0-6). */
export function computePlatformRevenue(rows: PlatformFeeRow[]): PlatformRevenueSummary {
  const byInstitution = rows.map((row) => {
    const monthly = round2(
      (row.cycleVolume * row.feeRatePct) / 100 +
        row.perEmployeeMonthlyFee * row.eligibleEmployees,
    );
    return {
      institutionId: row.institutionId,
      monthly,
      feeRatePct: row.feeRatePct,
      perEmployeeMonthlyFee: row.perEmployeeMonthlyFee,
    };
  });
  const total = round2(byInstitution.reduce((s, r) => s + r.monthly, 0));
  return { total, byInstitution };
}

export interface SettlementLine {
  grossAmount: number;
  feeRatePct: number;
  platformFee: number;
  netPayout: number;
}

/**
 * Provider settlement for one completed booking (P1-5). Loup collects the
 * full institution-funded price and pays the provider net of its platform
 * fee; a booking with no institution link (no benefit plan behind it) has no
 * fee at all — the provider is paid the full gross amount.
 */
export function computeSettlementLine(grossAmount: number, feeRatePct: number): SettlementLine {
  const platformFee = round2(grossAmount * (feeRatePct / 100));
  return {
    grossAmount: round2(grossAmount),
    feeRatePct,
    platformFee,
    netPayout: round2(grossAmount - platformFee),
  };
}

export interface SettlementTotals {
  grossRevenue: number;
  platformFee: number;
  netPayout: number;
  bookingCount: number;
}

/** Sums a set of settlement lines into cycle totals — the honest sum, no rounding drift beyond round2 per line. */
export function summarizeSettlement(lines: SettlementLine[]): SettlementTotals {
  return {
    grossRevenue: round2(lines.reduce((s, l) => s + l.grossAmount, 0)),
    platformFee: round2(lines.reduce((s, l) => s + l.platformFee, 0)),
    netPayout: round2(lines.reduce((s, l) => s + l.netPayout, 0)),
    bookingCount: lines.length,
  };
}