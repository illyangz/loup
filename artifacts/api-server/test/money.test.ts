import { describe, expect, it } from "vitest";
import {
  computeAllowancePosition,
  computeCheckoutSplit,
  computePlatformRevenue,
  computeRedemptionAmount,
  computeSettlementLine,
  summarizeSettlement,
} from "../src/lib/money";

describe("computeCheckoutSplit (split-payment math)", () => {
  it("applies the 10% institutional discount and rounds to 2dp", () => {
    const split = computeCheckoutSplit({ publicPrice: 120.5, availableAllowance: 1000 });
    expect(split.institutionalPrice).toBe(108.45);
    expect(split.institutionalSaving).toBe(12.05);
  });

  it("allowance fully covers the institutional price when it exceeds it", () => {
    const split = computeCheckoutSplit({ publicPrice: 100, availableAllowance: 90 });
    expect(split.employerContribution).toBe(90);
    expect(split.employeeCopayment).toBe(0);
  });

  it("employee pays the remainder when allowance is insufficient", () => {
    const split = computeCheckoutSplit({ publicPrice: 100, availableAllowance: 40 });
    expect(split.employerContribution).toBe(40);
    expect(split.employeeCopayment).toBe(50);
  });

  it("zero allowance leaves the full institutional price as copayment", () => {
    const split = computeCheckoutSplit({ publicPrice: 99.99, availableAllowance: 0 });
    expect(split.employerContribution).toBe(0);
    expect(split.employeeCopayment).toBe(89.99);
  });

  it("supports a custom discount rate", () => {
    const split = computeCheckoutSplit({ publicPrice: 200, availableAllowance: 500, discountPct: 5 });
    expect(split.institutionalPrice).toBe(190);
    expect(split.institutionalSaving).toBe(10);
  });
});

describe("computeAllowancePosition (ledger authorization/redemption math)", () => {
  it("computes available as authorized minus reserved and redeemed", () => {
    const pos = computeAllowancePosition(
      [
        { entryType: "authorized", amount: 750 },
        { entryType: "reserved", amount: 200 },
        { entryType: "redeemed", amount: 85 },
      ],
      0,
    );
    expect(pos.authorized).toBe(750);
    expect(pos.reserved).toBe(200);
    expect(pos.redeemed).toBe(85);
    expect(pos.available).toBe(465);
  });

  it("falls back to the tier-derived authorized maximum only when no authorization entries exist", () => {
    const pos = computeAllowancePosition([{ entryType: "redeemed", amount: 50 }], 7000);
    expect(pos.authorized).toBe(7000);
    expect(pos.available).toBe(6950);
  });

  it("never exposes a negative available balance", () => {
    const pos = computeAllowancePosition(
      [
        { entryType: "authorized", amount: 100 },
        { entryType: "reserved", amount: 80 },
        { entryType: "redeemed", amount: 60 },
      ],
      0,
    );
    expect(pos.available).toBe(0);
  });

  it("release entries do not reduce availability (they are not charged)", () => {
    const pos = computeAllowancePosition(
      [
        { entryType: "authorized", amount: 750 },
        { entryType: "released", amount: 500 },
      ],
      0,
    );
    expect(pos.available).toBe(750);
  });

  // P1-9 "cancellation reversal": a booking's reservation must stop counting
  // against available balance once it's resolved — either released
  // (cancelled/rejected) or redeemed (completed). Before this fix, neither
  // writeReleaseLedger nor writeRedemptionLedger ever reversed the original
  // "reserved" hold, so a booking's allowance stayed permanently locked even
  // after it was cancelled or successfully paid for — a real double-count.

  it("a cancelled booking's reservation is fully released back to available (matched by referenceId)", () => {
    const pos = computeAllowancePosition(
      [
        { entryType: "authorized", amount: 750 },
        { entryType: "reserved", amount: 200, referenceId: 101 },
        { entryType: "released", amount: 200, referenceId: 101 },
      ],
      0,
    );
    expect(pos.reserved).toBe(0);
    expect(pos.available).toBe(750);
  });

  it("a completed booking's reservation converts to a redemption without double-counting", () => {
    const pos = computeAllowancePosition(
      [
        { entryType: "authorized", amount: 750 },
        { entryType: "reserved", amount: 200, referenceId: 202 },
        { entryType: "redeemed", amount: 200, referenceId: 202 },
      ],
      0,
    );
    // Only 200 was ever actually spent — available must drop by 200, not 400.
    expect(pos.reserved).toBe(0);
    expect(pos.redeemed).toBe(200);
    expect(pos.available).toBe(550);
  });

  it("one booking's resolution never nets against a different booking's still-active reservation", () => {
    const pos = computeAllowancePosition(
      [
        { entryType: "authorized", amount: 750 },
        { entryType: "reserved", amount: 200, referenceId: 301 }, // still pending — not resolved
        { entryType: "redeemed", amount: 85, referenceId: 302 }, // a *different*, already-completed booking
      ],
      0,
    );
    // The pending 301 reservation must stay fully held; 302's redemption must
    // not "pay down" an unrelated booking's hold.
    expect(pos.reserved).toBe(200);
    expect(pos.redeemed).toBe(85);
    expect(pos.available).toBe(465);
  });

  it("a partial redemption (price came in lower than the reservation) leaves only the true leftover held", () => {
    const pos = computeAllowancePosition(
      [
        { entryType: "authorized", amount: 750 },
        { entryType: "reserved", amount: 200, referenceId: 404 },
        { entryType: "redeemed", amount: 150, referenceId: 404 }, // final price came in lower than the reservation
      ],
      0,
    );
    // Only $150 was actually redeemed against this reference — the pure
    // function correctly still shows $50 held, since nothing here says that
    // remainder was released. (Whether the write side should also emit a
    // `released` entry for a partial-redemption remainder is a separate,
    // not-yet-fixed gap — see handoff.md P1-9.)
    expect(pos.reserved).toBe(50);
    expect(pos.redeemed).toBe(150);
    expect(pos.available).toBe(550);
  });
});

describe("computeRedemptionAmount (duplicate-redemption guard)", () => {
  it("redeems the full reserved amount when the estimate matches", () => {
    expect(computeRedemptionAmount(200, 200)).toBe(200);
  });

  it("caps the redemption at the reserved amount (never over-redeem)", () => {
    expect(computeRedemptionAmount(200, 400)).toBe(200);
  });

  it("cannot redeem more than the estimate when it is lower", () => {
    expect(computeRedemptionAmount(200, 150)).toBe(150);
  });

  it("returns 0 when nothing was reserved (no write-back on zero)", () => {
    expect(computeRedemptionAmount(0, 150)).toBe(0);
  });
});

describe("computePlatformRevenue (tenant isolation)", () => {
  it("keeps per-institution revenue separate — no cross-tenant bleed", () => {
    const { total, byInstitution } = computePlatformRevenue([
      { institutionId: 1, feeRatePct: 8, perEmployeeMonthlyFee: 12, cycleVolume: 334, eligibleEmployees: 60 },
      { institutionId: 2, feeRatePct: 8, perEmployeeMonthlyFee: 0, cycleVolume: 0, eligibleEmployees: 15 },
    ]);
    expect(byInstitution).toHaveLength(2);
    expect(byInstitution.find((r) => r.institutionId === 1)?.monthly).toBe(746.72);
    expect(byInstitution.find((r) => r.institutionId === 2)?.monthly).toBe(0);
    expect(total).toBe(746.72);
  });

  it("computes the Meridian example: 8% of spend + AED 12 per eligible employee", () => {
    const { byInstitution } = computePlatformRevenue([
      { institutionId: 1, feeRatePct: 8, perEmployeeMonthlyFee: 12, cycleVolume: 334, eligibleEmployees: 60 },
    ]);
    expect(byInstitution[0]!.monthly).toBe(746.72);
  });

  it("a tenant with no volume but a per-employee fee still bills the base fee", () => {
    const { byInstitution } = computePlatformRevenue([
      { institutionId: 3, feeRatePct: 0, perEmployeeMonthlyFee: 5, cycleVolume: 0, eligibleEmployees: 100 },
    ]);
    expect(byInstitution[0]!.monthly).toBe(500);
  });
});

describe("computeSettlementLine (provider settlement, P1-5)", () => {
  it("deducts the platform fee and pays the provider the remainder", () => {
    const line = computeSettlementLine(350, 8);
    expect(line.grossAmount).toBe(350);
    expect(line.platformFee).toBe(28);
    expect(line.netPayout).toBe(322);
  });

  it("a booking with no institution link (0% fee) pays the full gross amount", () => {
    const line = computeSettlementLine(199.99, 0);
    expect(line.platformFee).toBe(0);
    expect(line.netPayout).toBe(199.99);
  });

  it("rounds to 2dp", () => {
    const line = computeSettlementLine(99.99, 8);
    expect(line.platformFee).toBe(8);
    expect(line.netPayout).toBe(91.99);
  });
});

describe("summarizeSettlement", () => {
  it("sums gross, fee, and net payout across lines", () => {
    const totals = summarizeSettlement([
      computeSettlementLine(350, 8),
      computeSettlementLine(199, 8),
      computeSettlementLine(100, 0),
    ]);
    expect(totals.grossRevenue).toBe(649);
    expect(totals.platformFee).toBe(43.92); // 28 + 15.92 + 0
    expect(totals.netPayout).toBe(605.08);
    expect(totals.bookingCount).toBe(3);
  });

  it("an empty settlement is all honest zeros, not a fallback constant", () => {
    const totals = summarizeSettlement([]);
    expect(totals).toEqual({ grossRevenue: 0, platformFee: 0, netPayout: 0, bookingCount: 0 });
  });
});