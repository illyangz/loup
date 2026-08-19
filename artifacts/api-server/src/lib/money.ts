export type LedgerEntryType = "authorized" | "reserved" | "redeemed" | "released";

export interface AllowanceEntry {
  entryType: string;
  amount: number;
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
 */
export function computeAllowancePosition(entries: AllowanceEntry[], tierAuthorized: number): AllowancePosition {
  const authorized = entries
    .filter((e) => e.entryType === "authorized")
    .reduce((s, e) => s + e.amount, 0) || tierAuthorized;
  const reserved = entries.filter((e) => e.entryType === "reserved").reduce((s, e) => s + e.amount, 0);
  const redeemed = entries.filter((e) => e.entryType === "redeemed").reduce((s, e) => s + e.amount, 0);
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