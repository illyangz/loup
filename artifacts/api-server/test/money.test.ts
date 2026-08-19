import { describe, expect, it } from "vitest";
import {
  computeAllowancePosition,
  computeCheckoutSplit,
  computePlatformRevenue,
  computeRedemptionAmount,
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