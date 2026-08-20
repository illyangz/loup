// ─── Roster CSV parsing (P1-6 roster sync / P1-8 CSV hardening) ─────────────
// Pure, DB-free parsing + row-level validation so it's cheaply unit-testable.
// The route layer owns the actual upsert (dedupe on externalEmployeeId).

export const MAX_ROSTER_BATCH = 500;

export const ROSTER_CSV_HEADER = "externalEmployeeId,name,workEmail,department,benefitTier,eligibilityStatus,householdEligible";
export const ROSTER_CSV_TEMPLATE =
  `${ROSTER_CSV_HEADER}\r\n` +
  `EMP-1001,Jane Doe,jane.doe@example.edu,Academic,Faculty,eligible,true\r\n`;

const REQUIRED_HEADERS = ["externalEmployeeId", "name", "workEmail", "department", "benefitTier"] as const;
const KNOWN_HEADERS = [...REQUIRED_HEADERS, "eligibilityStatus", "householdEligible"] as const;

export interface RosterRow {
  externalEmployeeId: string;
  name: string;
  workEmail: string;
  department: string;
  benefitTier: string;
  eligibilityStatus: string;
  householdEligible: boolean;
}

export interface RosterRowError {
  row: number;
  message: string;
}

export interface ParsedRoster {
  rows: RosterRow[];
  errors: RosterRowError[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Minimal RFC4180-ish CSV line splitter: handles quoted fields with embedded commas/quotes. */
function parseCsvLines(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const push = () => { row.push(field); field = ""; };
  const endRow = () => { push(); lines.push(row); row = []; };

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ",") { push(); i++; continue; }
    if (ch === "\r") { i++; continue; }
    if (ch === "\n") { endRow(); i++; continue; }
    field += ch; i++;
  }
  if (field !== "" || row.length > 0) endRow();
  return lines.filter((l) => !(l.length === 1 && l[0]!.trim() === ""));
}

/**
 * Parses + validates a roster CSV. Header order is flexible (matched by name,
 * case-insensitive); `eligibilityStatus` defaults to "eligible" and
 * `householdEligible` defaults to true when omitted. Every row is validated
 * independently — one bad row doesn't stop the rest from parsing, so the
 * caller can report all errors at once (P1-8 "per-row validation errors").
 */
export function parseRosterCsv(csv: string): ParsedRoster {
  const lines = parseCsvLines(csv.trim());
  if (lines.length === 0) {
    return { rows: [], errors: [{ row: 0, message: "CSV is empty" }] };
  }

  const header = lines[0]!.map((h) => h.trim());
  const headerIndex = new Map(header.map((h, i) => [h.toLowerCase(), i]));
  const missing = REQUIRED_HEADERS.filter((h) => !headerIndex.has(h.toLowerCase()));
  if (missing.length > 0) {
    return { rows: [], errors: [{ row: 1, message: `Missing required column(s): ${missing.join(", ")}` }] };
  }
  const unknown = header.filter((h) => !KNOWN_HEADERS.some((k) => k.toLowerCase() === h.toLowerCase()));

  const rows: RosterRow[] = [];
  const errors: RosterRowError[] = [];
  const seenIds = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1; // 1-indexed, header is row 1
    const cells = lines[i]!;
    const get = (name: string) => (headerIndex.has(name.toLowerCase()) ? (cells[headerIndex.get(name.toLowerCase())!] ?? "").trim() : "");

    const externalEmployeeId = get("externalEmployeeId");
    const name = get("name");
    const workEmail = get("workEmail");
    const department = get("department");
    const benefitTier = get("benefitTier");
    const eligibilityRaw = get("eligibilityStatus");
    const householdRaw = get("householdEligible");

    const rowErrors: string[] = [];
    if (!externalEmployeeId) rowErrors.push("externalEmployeeId is required");
    else if (seenIds.has(externalEmployeeId)) rowErrors.push(`duplicate externalEmployeeId "${externalEmployeeId}" within this file`);
    if (!name) rowErrors.push("name is required");
    if (!workEmail) rowErrors.push("workEmail is required");
    else if (!EMAIL_RE.test(workEmail)) rowErrors.push(`workEmail "${workEmail}" is not a valid email address`);
    if (!department) rowErrors.push("department is required");
    if (!benefitTier) rowErrors.push("benefitTier is required");
    if (householdRaw && !["true", "false", "1", "0", "yes", "no"].includes(householdRaw.toLowerCase())) {
      rowErrors.push(`householdEligible "${householdRaw}" must be true/false`);
    }

    if (rowErrors.length > 0) {
      errors.push({ row: rowNum, message: rowErrors.join("; ") });
      continue;
    }

    seenIds.add(externalEmployeeId);
    rows.push({
      externalEmployeeId,
      name,
      workEmail,
      department,
      benefitTier,
      eligibilityStatus: eligibilityRaw || "eligible",
      householdEligible: householdRaw ? ["true", "1", "yes"].includes(householdRaw.toLowerCase()) : true,
    });
  }

  if (unknown.length > 0) {
    errors.push({ row: 1, message: `Ignored unknown column(s): ${unknown.join(", ")}` });
  }

  return { rows, errors };
}
