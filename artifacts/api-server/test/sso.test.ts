import { describe, expect, it } from "vitest";
import { consumeSsoState, issueSsoState, resolveSsoPrincipal, type SsoEmployeeRow, type SsoInstitutionRow } from "../src/lib/sso";

const meridian: SsoInstitutionRow = {
  id: 1,
  slug: "meridian-international",
  name: "Meridian International Schools",
  adminEmails: ["hradmin@meridian-edu.ae"],
};

const alNoor: SsoInstitutionRow = {
  id: 2,
  slug: "al-noor-university",
  name: "Al Noor University",
  adminEmails: ["admins@alnoor.ac.ae"],
};

const employees: SsoEmployeeRow[] = [
  {
    id: 21,
    employerId: 1,
    institutionId: 1,
    memberId: 21,
    workEmail: "omar.mansour@meridian-edu.ae",
    name: "Omar Mansour",
    benefitTier: "Faculty",
  },
  {
    id: 88,
    employerId: 3,
    institutionId: 2,
    memberId: 88,
    workEmail: "lina.khoury@alnoor.ac.ae",
    name: "Lina Khoury",
    benefitTier: "Lecturer",
  },
];

describe("resolveSsoPrincipal", () => {
  it("maps an institution admin email to the institution role with tenantId", () => {
    const principal = resolveSsoPrincipal("HRAdmin@Meridian-Edu.AE", [meridian, alNoor], employees);
    expect(principal).toEqual({
      role: "institution",
      name: "Meridian International Schools",
      institutionId: 1,
      tenantId: 1,
      label: "Meridian International Schools — Institution admin",
    });
  });

  it("maps an employee workEmail to the employee role with tenantId + employeeId", () => {
    const principal = resolveSsoPrincipal("omar.mansour@meridian-edu.ae", [meridian, alNoor], employees);
    expect(principal).toEqual({
      role: "employee",
      name: "Omar Mansour",
      institutionId: 1,
      employerId: 1,
      employeeId: 21,
      memberId: 21,
      tenantId: 1,
      label: "Omar Mansour — Faculty",
    });
  });

  it("never resolves an email across tenants (same domain prefix, different tenant)", () => {
    const principal = resolveSsoPrincipal("lina.khoury@meridian-edu.ae", [meridian, alNoor], employees);
    expect(principal).toBeNull();
  });

  it("an admin email of one tenant does not grant access in another tenant", () => {
    const principal = resolveSsoPrincipal("admins@alnoor.ac.ae", [meridian, alNoor], employees);
    expect(principal?.role).toBe("institution");
    expect(principal).toMatchObject({ tenantId: 2, institutionId: 2 });
  });

  it("returns null for an unknown email", () => {
    expect(resolveSsoPrincipal("nobody@example.com", [meridian, alNoor], employees)).toBeNull();
  });
});

describe("sso state nonce", () => {
  it("round-trips the institution id and can only be consumed once", () => {
    const state = issueSsoState("7");
    expect(consumeSsoState(state)).toBe("7");
    expect(consumeSsoState(state)).toBeNull();
  });

  it("rejects unknown states", () => {
    expect(consumeSsoState("not-a-real-state")).toBeNull();
  });
});