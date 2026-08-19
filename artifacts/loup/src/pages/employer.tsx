import { useState } from "react";
import {
  AlertCircle, BadgeCheck, Building2, CheckCircle2, ChevronDown,
  Download, FileSpreadsheet, Layers3, Loader2, Plus, Search,
  Shield, ShieldCheck, ToggleLeft, ToggleRight, Upload, Users, X,
} from "lucide-react";
import {
  useGetEmployerOverview, getGetEmployerOverviewQueryKey,
  useListEmployerEmployees, getListEmployerEmployeesQueryKey,
  useGetEmployerUtilization, getGetEmployerUtilizationQueryKey,
  useGetEmployerIntegrations, getGetEmployerIntegrationsQueryKey,
  useImportEmployerEmployees,
  useGetEmployerCampusBreakdown, getGetEmployerCampusBreakdownQueryKey,
  useUpdateEmployerEmployee,
  useAddEmployerEmployee,
  useListBenefitPlans, getListBenefitPlansQueryKey,
  useCreateBenefitPlan,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DataState, PlatformShell } from "@/components/platform-shell";
import { cn } from "@/lib/utils";
import { authHeaders } from "@/lib/demo-auth";


// ── Utilities ─────────────────────────────────────────────────────────────────
function money(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(v);
}
function pct(v: number) { return `${Math.round(v)}%`; }
function bar(v: number) { return `${Math.min(100, Math.max(0, v))}%`; }

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = "overview" | "roster" | "benefits" | "reports";
const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: "overview",  label: "Overview",  icon: Building2 },
  { id: "roster",    label: "Roster",    icon: Users     },
  { id: "benefits",  label: "Benefits",  icon: Layers3   },
  { id: "reports",   label: "Reports",   icon: Download  },
];

// ── Stat strip ────────────────────────────────────────────────────────────────
function StatStrip({ items }: { items: { label: string; value: string; sub?: string; accent?: string }[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/[0.07] mb-7">
      {items.map((item, i) => (
        <div key={i} className="bg-background/60 px-5 py-4 platform-reveal" style={{ animationDelay: `${i * 60}ms` }}>
          <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-semibold">{item.label}</p>
          <p className={cn("mt-1.5 font-serif text-[1.6rem] leading-none font-semibold", item.accent ?? "text-white")}>{item.value}</p>
          {item.sub && <p className="mt-1 text-[11px] text-white/30">{item.sub}</p>}
        </div>
      ))}
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab() {
  const overview    = useGetEmployerOverview({ query: { queryKey: getGetEmployerOverviewQueryKey() } });
  const utilization = useGetEmployerUtilization({ query: { queryKey: getGetEmployerUtilizationQueryKey() } });
  const campuses    = useGetEmployerCampusBreakdown({ query: { queryKey: getGetEmployerCampusBreakdownQueryKey() } });

  const retry = () => { void overview.refetch(); void utilization.refetch(); void campuses.refetch(); };

  return (
    <DataState loading={overview.isLoading} error={overview.isError} onRetry={retry}>
      {overview.data && (
        <div className="space-y-5">
          {/* KPI strip */}
          <StatStrip items={[
            { label: "Activated employees", value: `${overview.data.activatedEmployees} / ${overview.data.eligibleEmployees}`, sub: `${pct(overview.data.activatedEmployees / overview.data.eligibleEmployees * 100)} activation`, accent: "text-[hsl(var(--platform-brass))]" },
            { label: "Authorized allowance", value: money(overview.data.authorizedMaximum), sub: "this cycle" },
            { label: "Completion rate",      value: `${overview.data.completionRate.toFixed(1)}%`, sub: `${overview.data.satisfaction.toFixed(1)} / 5 satisfaction`, accent: "text-[hsl(var(--platform-mint))]" },
            { label: "Invoice estimate",     value: money(overview.data.invoiceEstimate), sub: "redeemed + reserved", accent: "text-[hsl(var(--platform-plum))]" },
          ]} />

          {/* Loup platform fee (P0-4) */}
          <div className="glass-card rounded-2xl p-6 platform-reveal" style={{ animationDelay: "40ms" }}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40 mb-1.5">Loup platform fee</p>
                <p className="font-serif text-2xl font-semibold text-white">
                  {overview.data.platformFeeRatePct}% <span className="text-white/40 text-base font-normal">of redemptions</span>
                  {overview.data.perEmployeeMonthlyFee > 0 && (
                    <> + <span className="text-[hsl(var(--platform-brass))]">AED {overview.data.perEmployeeMonthlyFee}</span> <span className="text-white/40 text-base font-normal">/ employee / month</span></>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40 mb-1.5">Estimated monthly platform revenue</p>
                <p className="font-serif text-2xl font-semibold text-[hsl(var(--platform-mint))]">{money(overview.data.estimatedMonthlyPlatformRevenue)}</p>
              </div>
            </div>
          </div>

          {/* Allowance + category mix */}
          <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
            {/* Allowance breakdown */}
            <div className="glass-card rounded-2xl p-6 platform-reveal" style={{ animationDelay: "60ms" }}>
              <div className="flex items-baseline justify-between mb-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">Allowance breakdown</p>
                <div className="flex gap-5 text-[11px] text-white/30">
                  <span>Forecast <span className="text-white/60 font-medium">{money(overview.data.forecastRedemptions)}</span></span>
                  <span>Satisfaction <span className="text-white/60 font-medium">{overview.data.satisfaction.toFixed(1)} / 5</span></span>
                  <span>Completion <span className="text-white/60 font-medium">{overview.data.completionRate.toFixed(1)}%</span></span>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { label: "Redeemed",  amount: overview.data.redeemedAllowances,  share: overview.data.redeemedAllowances / overview.data.authorizedMaximum, tone: "bg-primary" },
                  { label: "Reserved",  amount: overview.data.reservedAllowances,  share: overview.data.reservedAllowances  / overview.data.authorizedMaximum, tone: "bg-[hsl(var(--platform-brass))]" },
                  { label: "Remaining", amount: overview.data.authorizedMaximum - overview.data.redeemedAllowances - overview.data.reservedAllowances, share: Math.max(0, 1 - (overview.data.redeemedAllowances + overview.data.reservedAllowances) / overview.data.authorizedMaximum), tone: "bg-white/10" },
                ].map(row => (
                  <div key={row.label} data-testid={`row-allowance-${row.label.toLowerCase()}`}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-white/70 font-medium">{row.label}</span>
                      <span className="tabular-nums text-white/50">{money(row.amount)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5">
                      <div className={cn("h-full rounded-full bar-grow", row.tone)} style={{ "--target-width": bar(row.share * 100) } as React.CSSProperties} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category mix */}
            <div className="glass-card rounded-2xl p-6 platform-reveal" style={{ animationDelay: "120ms" }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40 mb-5">Category mix</p>
              {utilization.data ? (
                <div className="space-y-4">
                  {utilization.data.categoryUtilization.map((item, i) => (
                    <div key={item.category} className="platform-reveal" style={{ animationDelay: `${180 + i * 50}ms` }} data-testid={`row-utilization-${item.category}`}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-white/70 font-medium">{item.category}</span>
                        <span className="text-white/40">{item.bookings} bookings</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-accent">
                        <div className="h-full rounded-full bg-primary bar-grow" style={{ "--target-width": `${Math.max(8, item.share * 100)}%` } as React.CSSProperties} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-10 animate-pulse rounded-xl bg-white/5" />)}</div>
              )}
            </div>
          </div>

          {/* Campus breakdown */}
          <div className="glass-card rounded-2xl p-6 platform-reveal" style={{ animationDelay: "180ms" }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40 mb-5">Campus breakdown</p>
            {campuses.isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">{[1, 2].map(i => <div key={i} className="h-24 animate-pulse rounded-xl bg-white/5" />)}</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {campuses.data?.map(campus => (
                  <div key={campus.campusId} className="rounded-xl bg-accent/30 border border-border/40 p-4 platform-reveal" data-testid={`row-campus-${campus.campusId}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-[14px]">{campus.campusName}</p>
                        <p className="text-[12px] text-muted-foreground">{campus.employeeCount} employees · {campus.activeEmployees} active</p>
                      </div>
                      {campus.privacyGuarded && (
                        <span className="text-[10px] text-yellow-400/80 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-2 py-0.5 font-medium shrink-0 ml-2">
                          <Shield className="inline h-2.5 w-2.5 mr-0.5" />Guarded
                        </span>
                      )}
                    </div>
                    {!campus.privacyGuarded ? (
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                          { label: "Auth", v: campus.totalAuthorized,  cls: "text-white/80" },
                          { label: "Used", v: campus.totalRedeemed,    cls: "text-primary"  },
                          { label: "Hold", v: campus.totalReserved,    cls: "text-[hsl(var(--platform-brass))]" },
                        ].map(col => (
                          <div key={col.label} className="rounded-lg bg-background/30 py-2">
                            <p className={cn("font-semibold text-sm tabular-nums", col.cls)}>{money(col.v)}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{col.label}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] text-muted-foreground italic">Group too small — data suppressed.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DataState>
  );
}

// ── Roster tab ────────────────────────────────────────────────────────────────
type RosterFilter = { campus: string; tier: string; eligibility: string };

function RosterTab() {
  const qc = useQueryClient();
  const employees = useListEmployerEmployees({ query: { queryKey: getListEmployerEmployeesQueryKey() } });
  const campuses  = useGetEmployerCampusBreakdown({ query: { queryKey: getGetEmployerCampusBreakdownQueryKey() } });
  const updater   = useUpdateEmployerEmployee({ mutation: { onSuccess: () => void qc.invalidateQueries({ queryKey: getListEmployerEmployeesQueryKey() }) } });
  const adder     = useAddEmployerEmployee({ mutation: { onSuccess: () => { void qc.invalidateQueries({ queryKey: getListEmployerEmployeesQueryKey() }); setShowAdd(false); setNewEmp({ name: "", workEmail: "", department: "", benefitTier: "Faculty" }); } } });
  const importer  = useImportEmployerEmployees();

  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState<RosterFilter>({ campus: "", tier: "", eligibility: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [showCsv, setShowCsv] = useState(false);
  const [csv, setCsv]         = useState("");
  const [editId, setEditId]   = useState<number | null>(null);
  const [newEmp, setNewEmp]   = useState({ name: "", workEmail: "", department: "", benefitTier: "Faculty" });

  const roster = (employees.data ?? []).filter(emp => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${emp.name} ${emp.workEmail} ${emp.department}`.toLowerCase().includes(q);
    const matchTier   = !filter.tier || emp.benefitTier === filter.tier;
    const matchElig   = !filter.eligibility || emp.eligibilityStatus === filter.eligibility;
    return matchSearch && matchTier && matchElig;
  });

  const tiers       = [...new Set((employees.data ?? []).map(e => e.benefitTier))];
  const eligibilities = ["eligible", "ineligible", "pending"];

  function toggleEligibility(id: number, current: string) {
    const next = current === "eligible" ? "ineligible" : "eligible";
    updater.mutate({ id, data: { eligibilityStatus: next } });
    setEditId(id);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <label className="flex items-center gap-2 rounded-xl border border-border/80 bg-background/60 px-3.5 py-2 text-sm focus-within:ring-2 focus-within:ring-primary transition-all">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people…" className="bg-transparent outline-none w-36 text-sm placeholder:text-muted-foreground" data-testid="input-employer-roster-search" />
        </label>

        {/* Tier filter */}
        <select value={filter.tier} onChange={e => setFilter(f => ({ ...f, tier: e.target.value }))} className="rounded-xl border border-border/80 bg-background/60 px-3.5 py-2 text-sm outline-none" data-testid="select-tier-filter">
          <option value="">All tiers</option>
          {tiers.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Eligibility filter */}
        <select value={filter.eligibility} onChange={e => setFilter(f => ({ ...f, eligibility: e.target.value }))} className="rounded-xl border border-border/80 bg-background/60 px-3.5 py-2 text-sm outline-none" data-testid="select-eligibility-filter">
          <option value="">All statuses</option>
          {eligibilities.map(e => <option key={e} value={e}>{e}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-2">
          {/* CSV import toggle */}
          <button type="button" onClick={() => { setShowCsv(v => !v); setShowAdd(false); }} className={cn("inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors", showCsv ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:bg-accent/30")} data-testid="button-toggle-csv">
            <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
          </button>
          {/* Add employee */}
          <button type="button" onClick={() => { setShowAdd(v => !v); setShowCsv(false); }} className={cn("inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all hover:-translate-y-0.5", showAdd ? "bg-foreground/80 text-background" : "bg-foreground text-background")} data-testid="button-add-employee">
            <Plus className="h-3.5 w-3.5" /> Add employee
          </button>
        </div>
      </div>

      {/* Inline add-employee form (horizontal) */}
      {showAdd && (
        <div className="rounded-xl border border-primary/20 bg-background/40 backdrop-blur-sm p-4 platform-reveal">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[140px]">
              <label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium block mb-1">Full name</label>
              <input value={newEmp.name} onChange={e => setNewEmp(p => ({ ...p, name: e.target.value }))} className="input-std" placeholder="e.g. Aisha Bakr" data-testid="input-add-name" />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium block mb-1">Work email</label>
              <input value={newEmp.workEmail} onChange={e => setNewEmp(p => ({ ...p, workEmail: e.target.value }))} className="input-std" placeholder="a.bakr@school.edu" data-testid="input-add-workEmail" />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium block mb-1">Department</label>
              <input value={newEmp.department} onChange={e => setNewEmp(p => ({ ...p, department: e.target.value }))} className="input-std" placeholder="Academic" data-testid="input-add-department" />
            </div>
            <div className="w-36">
              <label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium block mb-1">Tier</label>
              <select value={newEmp.benefitTier} onChange={e => setNewEmp(p => ({ ...p, benefitTier: e.target.value }))} className="input-std" data-testid="select-add-tier">
                {["Faculty", "Staff", "Administrative"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <button
              type="button"
              disabled={!newEmp.name || !newEmp.workEmail || !newEmp.department || adder.isPending}
              onClick={() => adder.mutate({ data: { name: newEmp.name, workEmail: newEmp.workEmail, department: newEmp.department, benefitTier: newEmp.benefitTier } })}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors whitespace-nowrap"
              data-testid="button-submit-add-employee"
            >
              {adder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground p-2"><X className="h-4 w-4" /></button>
          </div>
          {adder.isError && <p className="mt-2 text-xs text-destructive" data-testid="error-add-employee">Failed to add employee. Check all fields.</p>}
        </div>
      )}

      {/* Inline CSV import */}
      {showCsv && (
        <div className="rounded-xl border border-border/40 bg-background/40 backdrop-blur-sm p-4 platform-reveal">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium mb-2">CSV import — columns: name, work_email, department, benefit_tier</p>
          <div className="flex gap-2">
            <input value={csv} onChange={e => setCsv(e.target.value)} placeholder="Paste CSV rows (one per line)…" className="flex-1 input-std text-sm" data-testid="input-employer-csv" />
            <button type="button" disabled={!csv || importer.isPending} onClick={() => importer.mutate({ data: { csv } })} className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50 whitespace-nowrap" data-testid="button-employer-import">
              {importer.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-3.5 w-3.5 inline mr-1.5" />Import</>}
            </button>
          </div>
          {importer.data && <p className="mt-2 text-xs text-primary flex items-center gap-1.5" data-testid="status-employer-import"><CheckCircle2 className="h-3.5 w-3.5" />{importer.data.message}</p>}
        </div>
      )}

      {/* Employee table */}
      <div className="overflow-x-auto rounded-xl border border-border/50 bg-background/30">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-accent/20 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {["Employee", "Department", "Campus", "Tier", "Eligibility", "Household", ""].map(h => (
                <th key={h} className="px-5 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {employees.isLoading
              ? [1, 2, 3].map(i => <tr key={i}><td colSpan={7} className="px-5 py-3"><div className="h-5 animate-pulse rounded bg-white/5" /></td></tr>)
              : roster.map((emp, i) => (
                <tr key={emp.id} className={cn("transition-colors hover:bg-accent/30", i % 2 === 0 ? "" : "bg-accent/10")} data-testid={`row-employer-employee-${emp.id}`}>
                  <td className="px-5 py-3">
                    <p className="font-medium">{emp.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{emp.workEmail}</p>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground text-[13px]">{emp.department}</td>
                  <td className="px-5 py-3 text-muted-foreground text-[13px]">
                    {(emp as typeof emp & { campusName?: string }).campusName ?? <span className="italic opacity-40">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium">{emp.benefitTier}</span>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => toggleEligibility(emp.id, emp.eligibilityStatus)}
                      disabled={updater.isPending && editId === emp.id}
                      className="inline-flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-opacity"
                      data-testid={`button-toggle-eligibility-${emp.id}`}
                    >
                      {updater.isPending && editId === emp.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : emp.eligibilityStatus === "eligible"
                          ? <ToggleRight className="h-4 w-4 text-primary" />
                          : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                      <span className={emp.eligibilityStatus === "eligible" ? "text-primary" : "text-muted-foreground"}>
                        {emp.eligibilityStatus}
                      </span>
                    </button>
                  </td>
                  <td className="px-5 py-3 text-[13px] text-muted-foreground">{emp.householdEligible ? "Eligible" : "Only"}</td>
                  <td className="px-5 py-3">
                    <span className="text-[11px] text-muted-foreground/50">#{emp.id}</span>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
        {!employees.isLoading && roster.length === 0 && (
          <div className="p-10 text-center" data-testid="empty-employer-roster">
            <Search className="mx-auto h-7 w-7 text-muted-foreground mb-2" />
            <p className="font-medium">No employees found</p>
            <p className="text-sm text-muted-foreground mt-1">Adjust your filters or search term.</p>
          </div>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">{roster.length} of {employees.data?.length ?? 0} employees</p>
    </div>
  );
}

// ── Benefits tab ──────────────────────────────────────────────────────────────
type TierDraft = { name: string; monthlyAllowance: number; description: string };
type PlanDraft = { name: string; period: string; renewalFrequency: string; expirationPolicy: string; rolloverEnabled: boolean; householdAccess: boolean; topUpPermitted: boolean; tiers: TierDraft[] };

const BLANK_PLAN: PlanDraft = {
  name: "", period: "monthly", renewalFrequency: "monthly", expirationPolicy: "expires_at_period_end",
  rolloverEnabled: false, householdAccess: true, topUpPermitted: true,
  tiers: [{ name: "Faculty", monthlyAllowance: 750, description: "Teaching and academic staff" }],
};

function BenefitsTab() {
  const qc = useQueryClient();
  const plans   = useListBenefitPlans({ query: { queryKey: getListBenefitPlansQueryKey() } });
  const creator = useCreateBenefitPlan({ mutation: { onSuccess: () => { void qc.invalidateQueries({ queryKey: getListBenefitPlansQueryKey() }); setShowBuilder(false); setDraft(BLANK_PLAN); } } });

  const [showBuilder, setShowBuilder] = useState(false);
  const [draft, setDraft] = useState<PlanDraft>(BLANK_PLAN);

  const setDraftField = <K extends keyof PlanDraft>(k: K, v: PlanDraft[K]) => setDraft(p => ({ ...p, [k]: v }));
  const monthlyLiabilityPreview = draft.tiers.reduce((s, t) => s + t.monthlyAllowance, 0);

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Configured plans & tiers</p>
        <button type="button" onClick={() => setShowBuilder(v => !v)} className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3.5 py-2 text-sm font-medium text-background hover:-translate-y-0.5 transition-all" data-testid="button-new-plan">
          <Plus className="h-3.5 w-3.5" /> New plan
        </button>
      </div>

      {/* Plan builder (collapsed by default) */}
      {showBuilder && (
        <div className="rounded-xl border border-primary/20 bg-background/40 backdrop-blur-sm p-5 platform-reveal">
          <div className="flex items-center justify-between mb-5">
            <p className="font-semibold text-[15px]">New benefit plan</p>
            <button type="button" onClick={() => setShowBuilder(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>

          {/* Plan-level fields — horizontal */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-5">
            <div>
              <label className="label-xs">Plan name</label>
              <input value={draft.name} onChange={e => setDraftField("name", e.target.value)} className="input-std mt-1" placeholder="Premium Wellness 2026" data-testid="input-plan-name" />
            </div>
            <div>
              <label className="label-xs">Period</label>
              <select value={draft.period} onChange={e => setDraftField("period", e.target.value)} className="input-std mt-1">
                {["monthly", "quarterly", "annual"].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="label-xs">Renewal</label>
              <select value={draft.renewalFrequency} onChange={e => setDraftField("renewalFrequency", e.target.value)} className="input-std mt-1">
                {["monthly", "quarterly", "annual"].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="label-xs">Expiration policy</label>
              <select value={draft.expirationPolicy} onChange={e => setDraftField("expirationPolicy", e.target.value)} className="input-std mt-1">
                {["expires_at_period_end", "rollover_unlimited", "rollover_capped_50pct"].map(o => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          </div>

          {/* Toggles inline */}
          <div className="flex flex-wrap gap-5 mb-5">
            {(["rolloverEnabled", "householdAccess", "topUpPermitted"] as const).map(field => (
              <label key={field} className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={draft[field]} onChange={e => setDraftField(field, e.target.checked)} className="h-4 w-4 rounded accent-primary" />
                {field === "rolloverEnabled" ? "Rollover" : field === "householdAccess" ? "Household access" : "Top-ups"}
              </label>
            ))}
          </div>

          {/* Tiers — each tier is one horizontal row */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tiers</p>
              <button type="button" onClick={() => setDraft(p => ({ ...p, tiers: [...p.tiers, { name: "", monthlyAllowance: 500, description: "" }] }))} className="text-xs text-primary hover:opacity-80 flex items-center gap-1"><Plus className="h-3 w-3" />Add tier</button>
            </div>
            <div className="space-y-2">
              {draft.tiers.map((tier, ti) => (
                <div key={ti} className="flex flex-wrap items-end gap-3 rounded-xl bg-accent/20 border border-border/30 px-4 py-3">
                  <div className="flex-1 min-w-[120px]">
                    <label className="label-xs">Name</label>
                    <input value={tier.name} onChange={e => setDraft(p => ({ ...p, tiers: p.tiers.map((t, i) => i === ti ? { ...t, name: e.target.value } : t) }))} className="input-std mt-1" placeholder="Faculty" />
                  </div>
                  <div className="w-28">
                    <label className="label-xs">AED / month</label>
                    <input type="number" min={0} value={tier.monthlyAllowance} onChange={e => setDraft(p => ({ ...p, tiers: p.tiers.map((t, i) => i === ti ? { ...t, monthlyAllowance: parseInt(e.target.value) || 0 } : t) }))} className="input-std mt-1" />
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <label className="label-xs">Description</label>
                    <input value={tier.description} onChange={e => setDraft(p => ({ ...p, tiers: p.tiers.map((t, i) => i === ti ? { ...t, description: e.target.value } : t) }))} className="input-std mt-1" placeholder="Teaching staff" />
                  </div>
                  <button type="button" disabled={draft.tiers.length <= 1} onClick={() => setDraft(p => ({ ...p, tiers: p.tiers.filter((_, i) => i !== ti) }))} className="text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors p-1"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Cost preview + actions — one row */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-primary/5 border border-primary/15 px-4 py-3 mb-4">
            <p className="text-sm text-muted-foreground">Monthly liability per employee</p>
            <p className="font-serif text-xl font-semibold text-primary">{money(monthlyLiabilityPreview)}</p>
          </div>
          <div className="flex gap-3">
            <button type="button" disabled={!draft.name || draft.tiers.some(t => !t.name) || creator.isPending} onClick={() => creator.mutate({ data: draft })} className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50" data-testid="button-create-plan">
              {creator.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create plan"}
            </button>
            <button type="button" onClick={() => setDraft(BLANK_PLAN)} className="rounded-xl border border-border/60 px-5 py-2 text-sm text-muted-foreground hover:bg-accent/30 transition-colors">Reset</button>
          </div>
          {creator.isError && <p className="mt-3 text-sm text-destructive flex items-center gap-2" data-testid="error-create-plan"><AlertCircle className="h-4 w-4" />Failed to create plan.</p>}
        </div>
      )}

      {/* Existing plans */}
      {plans.isLoading
        ? <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-36 animate-pulse rounded-xl bg-white/5" />)}</div>
        : plans.data?.length === 0
          ? <div className="rounded-xl border border-dashed border-white/10 p-10 text-center"><Layers3 className="mx-auto h-7 w-7 text-muted-foreground mb-2" /><p className="font-medium">No plans configured yet</p><p className="text-sm text-muted-foreground mt-1">Create your first benefit plan above.</p></div>
          : (
            <div className="grid gap-4 lg:grid-cols-2">
              {plans.data?.map((plan, pi) => (
                <div key={plan.id} className="glass-card rounded-xl p-5 platform-reveal" style={{ animationDelay: `${pi * 60}ms` }} data-testid={`row-plan-${plan.id}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-[15px]">{plan.name}</p>
                      <p className="text-[12px] text-muted-foreground mt-0.5">{plan.period} · {plan.renewalFrequency} renewal</p>
                    </div>
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ml-3", plan.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                      {plan.active ? <BadgeCheck className="h-3 w-3" /> : null} {plan.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-[12px] text-muted-foreground mb-3">
                    <span>🏠 {plan.householdAccess ? "Household" : "Employee only"}</span>
                    <span>↩ {plan.rolloverEnabled ? "Rollover on" : "No rollover"}</span>
                    <span>+ {plan.topUpPermitted ? "Top-ups" : "No top-ups"}</span>
                  </div>
                  <div className="space-y-1.5">
                    {plan.tiers.map(tier => (
                      <div key={tier.id} className="flex items-center justify-between rounded-lg bg-accent/30 border border-border/30 px-3 py-2" data-testid={`row-tier-${tier.id}`}>
                        <div>
                          <span className="font-medium text-[13px]">{tier.name}</span>
                          <span className="text-[11px] text-muted-foreground ml-2">{tier.description}</span>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <span className="font-semibold text-primary text-[13px]">{money(tier.monthlyAllowance)}<span className="text-[11px] font-normal text-muted-foreground">/mo</span></span>
                          <span className="text-[11px] text-muted-foreground ml-2">· {tier.employeeCount} emp</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between pt-3 border-t border-border/30 text-[13px]">
                    <span className="text-muted-foreground">{plan.employeeCount} covered</span>
                    <span className="font-semibold">{money(plan.monthlyLiability)}<span className="text-muted-foreground font-normal">/mo</span></span>
                  </div>
                </div>
              ))}
            </div>
          )}
    </div>
  );
}

// ── Reports tab ───────────────────────────────────────────────────────────────
function ReportsTab() {
  const BASE = import.meta.env.BASE_URL;
  const [downloading, setDownloading] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reportDefs = [
    {
      label: "Employee eligibility roster",
      desc:  "Name, email, department, campus, tier, eligibility, allowance amount, and benefit start/end dates.",
      path:  "v1/employer/export/roster",
      file:  "meridian-employee-roster.csv",
      cols:  "Name · Email · Department · Campus · Tier · Eligibility · Allowance · Start/End date",
    },
    {
      label: "Allowance utilization by campus",
      desc:  "Campus-level breakdown of authorized, reserved, and redeemed allowances.",
      path:  "v1/employer/export/utilization",
      file:  "meridian-utilization.csv",
      cols:  "Campus · Employees · Authorized · Reserved · Redeemed · Remaining",
    },
    {
      label: "Billing & payroll ledger",
      desc:  "Per-employee ledger entries grouped by benefit cycle with subtotals per tier.",
      path:  "v1/employer/export/billing",
      file:  "meridian-billing-ledger.csv",
      cols:  "Cycle · Name · Email · Tier · Authorized · Reserved · Redeemed · Remaining",
    },
  ];

  async function handleExport(path: string, filename: string) {
    setDownloading(path);
    setErrors(e => ({ ...e, [path]: "" }));
    try {
      const res = await fetch(`${BASE}api/${path}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const text = await res.text();
      const blob = new Blob([text], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrors(e => ({ ...e, [path]: err instanceof Error ? err.message : "Download failed" }));
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Data exports</p>

      {/* Reports as a horizontal table-style list */}
      <div className="rounded-xl border border-border/50 bg-background/30 overflow-hidden">
        {reportDefs.map((exp, i) => (
          <div key={exp.label} className={cn("flex items-start gap-4 px-5 py-4 hover:bg-accent/20 transition-colors", i < reportDefs.length - 1 && "border-b border-border/40")} data-testid={`row-export-${i}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-[14px]">{exp.label}</p>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary/60 bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">.csv</span>
              </div>
              <p className="text-[12px] text-muted-foreground mt-0.5">{exp.desc}</p>
              <p className="text-[11px] text-muted-foreground/50 mt-1 font-mono">{exp.cols}</p>
              {errors[exp.path] && (
                <p className="mt-1 text-[11px] text-destructive">{errors[exp.path]}</p>
              )}
            </div>
            <button
              type="button"
              disabled={downloading === exp.path}
              onClick={() => handleExport(exp.path, exp.file)}
              className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-border/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-colors disabled:opacity-50 mt-0.5"
              data-testid={`link-export-${exp.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {downloading === exp.path ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Download CSV
            </button>
          </div>
        ))}
      </div>
      <p className="text-[12px] text-muted-foreground">Files open directly in Excel and Google Sheets.</p>
    </div>
  );
}

// ── Root page ─────────────────────────────────────────────────────────────────
export default function Employer() {
  const [tab, setTab] = useState<Tab>("overview");
  const overview = useGetEmployerOverview({ query: { queryKey: getGetEmployerOverviewQueryKey() } });
  const employerName = overview.data?.employerName ?? "Institution portal";

  return (
    <PlatformShell role="institution">
      {/* ── Compact horizontal header + integrated tab bar ── */}
      <div className="mb-6 platform-reveal">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--platform-brass))/0.15] border border-[hsl(var(--platform-brass))/0.25]">
              <ShieldCheck className="h-4.5 w-4.5 text-[hsl(var(--platform-brass))]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40 leading-none">Benefits governance</p>
              <p className="mt-0.5 text-[17px] font-semibold text-white truncate leading-tight">{employerName}</p>
            </div>
          </div>

          {/* Tab bar — right-aligned, flush */}
          <div className="flex gap-0.5 rounded-xl bg-white/[0.04] border border-white/[0.07] p-1">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  data-testid={`tab-employer-${t.id}`}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-150",
                    tab === t.id
                      ? "bg-foreground text-background shadow-sm"
                      : "text-white/40 hover:text-white hover:bg-white/5",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="mt-5 border-b border-white/[0.06]" />
      </div>

      {/* Tab content */}
      <div className="pt-1">
        {tab === "overview"  && <OverviewTab />}
        {tab === "roster"    && <RosterTab />}
        {tab === "benefits"  && <BenefitsTab />}
        {tab === "reports"   && <ReportsTab />}
      </div>
    </PlatformShell>
  );
}
