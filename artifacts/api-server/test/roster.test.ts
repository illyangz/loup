import { describe, expect, it } from "vitest";
import { parseRosterCsv, MAX_ROSTER_BATCH, ROSTER_CSV_HEADER } from "../src/lib/roster";

describe("parseRosterCsv (P1-6/P1-8)", () => {
  it("parses valid rows with all columns present", () => {
    const csv = `${ROSTER_CSV_HEADER}\nEMP-1,Jane Doe,jane@example.edu,Academic,Faculty,eligible,true\nEMP-2,John Roe,john@example.edu,Facilities,Staff,eligible,false`;
    const { rows, errors } = parseRosterCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      externalEmployeeId: "EMP-1", name: "Jane Doe", workEmail: "jane@example.edu",
      department: "Academic", benefitTier: "Faculty", eligibilityStatus: "eligible", householdEligible: true,
    });
    expect(rows[1]!.householdEligible).toBe(false);
  });

  it("defaults eligibilityStatus and householdEligible when the columns are omitted", () => {
    const csv = "externalEmployeeId,name,workEmail,department,benefitTier\nEMP-1,Jane Doe,jane@example.edu,Academic,Faculty";
    const { rows, errors } = parseRosterCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0]!.eligibilityStatus).toBe("eligible");
    expect(rows[0]!.householdEligible).toBe(true);
  });

  it("header matching is case-insensitive and order-flexible", () => {
    const csv = "Name,WORKEMAIL,ExternalEmployeeId,benefitTier,department\nJane Doe,jane@example.edu,EMP-1,Faculty,Academic";
    const { rows, errors } = parseRosterCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0]!.externalEmployeeId).toBe("EMP-1");
  });

  it("rejects a CSV missing required columns without touching any rows", () => {
    const csv = "name,workEmail\nJane Doe,jane@example.edu";
    const { rows, errors } = parseRosterCsv(csv);
    expect(rows).toEqual([]);
    expect(errors[0]!.message).toContain("externalEmployeeId");
  });

  it("reports a per-row error for a bad email and still parses the good rows", () => {
    const csv = `${ROSTER_CSV_HEADER}\nEMP-1,Jane Doe,not-an-email,Academic,Faculty,eligible,true\nEMP-2,John Roe,john@example.edu,Facilities,Staff,eligible,true`;
    const { rows, errors } = parseRosterCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.externalEmployeeId).toBe("EMP-2");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({ row: 2, message: 'workEmail "not-an-email" is not a valid email address' });
  });

  it("reports a per-row error for missing required fields", () => {
    const csv = `${ROSTER_CSV_HEADER}\n,Jane Doe,jane@example.edu,,Faculty,eligible,true`;
    const { rows, errors } = parseRosterCsv(csv);
    expect(rows).toEqual([]);
    expect(errors[0]!.row).toBe(2);
    expect(errors[0]!.message).toContain("externalEmployeeId is required");
    expect(errors[0]!.message).toContain("department is required");
  });

  it("dedupes on externalEmployeeId within the same file — second occurrence is an error", () => {
    const csv = `${ROSTER_CSV_HEADER}\nEMP-1,Jane Doe,jane@example.edu,Academic,Faculty,eligible,true\nEMP-1,Jane Doe 2,jane2@example.edu,Academic,Faculty,eligible,true`;
    const { rows, errors } = parseRosterCsv(csv);
    expect(rows).toHaveLength(1);
    expect(errors[0]!.message).toContain("duplicate externalEmployeeId");
  });

  it("handles quoted fields with embedded commas", () => {
    const csv = `${ROSTER_CSV_HEADER}\nEMP-1,"Doe, Jane",jane@example.edu,"Academic, Science",Faculty,eligible,true`;
    const { rows, errors } = parseRosterCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0]!.name).toBe("Doe, Jane");
    expect(rows[0]!.department).toBe("Academic, Science");
  });

  it("skips blank lines", () => {
    const csv = `${ROSTER_CSV_HEADER}\n\nEMP-1,Jane Doe,jane@example.edu,Academic,Faculty,eligible,true\n\n`;
    const { rows, errors } = parseRosterCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
  });

  it("an empty CSV is a single top-level error, not a crash", () => {
    const { rows, errors } = parseRosterCsv("");
    expect(rows).toEqual([]);
    expect(errors).toEqual([{ row: 0, message: "CSV is empty" }]);
  });

  it("flags unknown columns without failing the import", () => {
    const csv = `${ROSTER_CSV_HEADER},salary\nEMP-1,Jane Doe,jane@example.edu,Academic,Faculty,eligible,true,50000`;
    const { rows, errors } = parseRosterCsv(csv);
    expect(rows).toHaveLength(1);
    expect(errors.some((e) => e.message.includes("Ignored unknown column"))).toBe(true);
  });

  it("MAX_ROSTER_BATCH is 500 per the PRPD spec", () => {
    expect(MAX_ROSTER_BATCH).toBe(500);
  });
});
