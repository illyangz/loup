import { useRef, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  AlertCircle, BadgeCheck, Building2, CheckCircle2, ChevronDown,
  Download, FileSpreadsheet, Layers3, Loader2, Plus, Search,
  Shield, ShieldCheck, ToggleLeft, ToggleRight, Upload, Users, X,
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useReveal } from "@/hooks/use-reveal";
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
  useGetEmployerConsent, getGetEmployerConsentQueryKey,
  useRecordEmployerConsent,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DataState, PlatformShell } from "@/components/platform-shell";
import { cn } from "@/lib/utils";
import { API_BASE_URL, authHeaders } from "@/lib/demo-auth";


// ── Utilities ─────────────────────────────────────────────────────────────────
function money(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(v);
}
function pct(v: number) { return `${Math.round(v)}%`; }

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
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref, { y: 12, stagger: true, immediate: true });

  return (
    <div ref={ref} className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-muted rounded-lg overflow-hidden border border-border mb-7">
      {items.map((item, i) => (
        <div key={i} className="bg-background/60 px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">{item.label}</p>
          <p className={cn("mt-1.5 text-[1.6rem] leading-none font-semibold tabular-nums", item.accent ?? "text-foreground")}>{item.value}</p>
          {item.sub && <p className="mt-1 text-[11px] text-muted-foreground">{item.sub}</p>}
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
  const campusGridRef = useRef<HTMLDivElement>(null);
  useReveal(campusGridRef, { y: 12, stagger: true, deps: [campuses.data] });

  const retry = () => { void overview.refetch(); void utilization.refetch(); void campuses.refetch(); };

  return (
    <DataState loading={overview.isLoading} error={overview.isError} onRetry={retry}>
      {overview.data && (
        <div className="space-y-5">
          {/* KPI strip */}
          <StatStrip items={[
            { label: "Activated employees", value: `${overview.data.activatedEmployees} / ${overview.data.eligibleEmployees}`, sub: `${pct(overview.data.activatedEmployees / overview.data.eligibleEmployees * 100)} activation` },
            { label: "Authorized allowance", value: money(overview.data.authorizedMaximum), sub: "this cycle" },
            { label: "Completion rate",      value: `${overview.data.completionRate.toFixed(1)}%`, sub: `${overview.data.satisfaction.toFixed(1)} / 5 satisfaction` },
            { label: "Invoice estimate",     value: money(overview.data.invoiceEstimate), sub: "redeemed + reserved" },
          ]} />

          {/* Loup platform fee (P0-4) */}
          <div className="glass-card rounded-lg p-6 platform-reveal" style={{ animationDelay: "40ms" }}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Loup platform fee</p>
                <p className="text-2xl font-semibold tabular-nums text-foreground">
                  {overview.data.platformFeeRatePct}% <span className="text-muted-foreground text-base font-normal">of redemptions</span>
                  {overview.data.perEmployeeMonthlyFee > 0 && (
                    <> + <span className="text-foreground">AED {overview.data.perEmployeeMonthlyFee}</span> <span className="text-muted-foreground text-base font-normal">/ employee / month</span></>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Estimated monthly platform revenue</p>
                <p className="text-2xl font-semibold tabular-nums text-foreground">{money(overview.data.estimatedMonthlyPlatformRevenue)}</p>
              </div>
            </div>
          </div>

          {/* Allowance + category mix */}
          <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
            {/* Allowance breakdown — donut chart + legend */}
            <div className="glass-card rounded-lg p-6 platform-reveal" style={{ animationDelay: "60ms" }}>
              <div className="flex items-baseline justify-between mb-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Allowance breakdown</p>
                <div className="flex gap-5 text-[11px] text-muted-foreground">
                  <span>Forecast <span className="text-muted-foreground font-medium">{money(overview.data.forecastRedemptions)}</span></span>
                  <span>Satisfaction <span className="text-muted-foreground font-medium">{overview.data.satisfaction.toFixed(1)} / 5</span></span>
                  <span>Completion <span className="text-muted-foreground font-medium">{overview.data.completionRate.toFixed(1)}%</span></span>
                </div>
              </div>
              {(() => {
                const remaining = Math.max(0, overview.data.authorizedMaximum - overview.data.redeemedAllowances - overview.data.reservedAllowances);
                const rows = [
                  { key: "redeemed",  label: "Redeemed",  amount: overview.data.redeemedAllowances, color: "hsl(var(--primary))" },
                  { key: "reserved",  label: "Reserved",  amount: overview.data.reservedAllowances, color: "hsl(var(--foreground) / 0.4)" },
                  { key: "remaining", label: "Remaining", amount: remaining, color: "hsl(var(--muted-foreground) / 0.35)" },
                ];
                const chartConfig: ChartConfig = Object.fromEntries(rows.map(r => [r.key, { label: r.label, color: r.color }]));
                return (
                  <div className="flex items-center gap-6">
                    <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[168px] w-[168px] shrink-0">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(value, name) => [money(Number(value)), rows.find(r => r.key === name)?.label ?? name]} />} />
                        <Pie data={rows} dataKey="amount" nameKey="key" innerRadius={48} outerRadius={80} strokeWidth={3} stroke="hsl(var(--card))">
                          {rows.map(r => <Cell key={r.key} fill={r.color} />)}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    <div className="flex-1 space-y-3">
                      {rows.map(row => (
                        <div key={row.key} className="flex items-center justify-between text-sm" data-testid={`row-allowance-${row.label.toLowerCase()}`}>
                          <span className="flex items-center gap-2 text-foreground font-medium">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: row.color }} />
                            {row.label}
                          </span>
                          <span className="tabular-nums text-muted-foreground">{money(row.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Category mix — horizontal bar chart */}
            <div className="glass-card rounded-lg p-6 platform-reveal" style={{ animationDelay: "120ms" }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-5">Category mix</p>
              {utilization.data ? (
                <ChartContainer
                  config={Object.fromEntries(utilization.data.categoryUtilization.map(c => [c.category, { label: c.category, color: "hsl(var(--primary))" }]))}
                  className="h-[220px] w-full"
                >
                  <BarChart data={utilization.data.categoryUtilization} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="category" width={110} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(value) => [`${value} bookings`, ""]} />} />
                    <Bar dataKey="bookings" radius={4} barSize={14}>
                      {utilization.data.categoryUtilization.map((c, i) => {
                        const isTop = c.bookings === Math.max(...utilization.data!.categoryUtilization.map(x => x.bookings));
                        return <Cell key={i} fill={isTop ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.18)"} />;
                      })}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />)}</div>
              )}
            </div>
          </div>

          {/* Campus breakdown */}
          <div className="glass-card rounded-lg p-6 platform-reveal" style={{ animationDelay: "180ms" }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-5">Campus breakdown</p>
            {campuses.isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">{[1, 2].map(i => <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />)}</div>
            ) : (
              <div ref={campusGridRef} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {campuses.data?.map(campus => (
                  <div key={campus.campusId} className="rounded-lg bg-accent/30 border border-border/40 p-4 transition-transform hover:-translate-y-0.5 hover:border-primary/40" data-testid={`row-campus-${campus.campusId}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-[14px]">{campus.campusName}</p>
                        <p className="text-[12px] text-muted-foreground">{campus.employeeCount} employees · {campus.activeEmployees} active</p>
                      </div>
                      {campus.privacyGuarded && (
                        <span className="text-[10px] text-muted-foreground bg-secondary border border-border rounded px-2 py-0.5 font-medium shrink-0 ml-2">
                          <Shield className="inline h-2.5 w-2.5 mr-0.5" />Guarded
                        </span>
                      )}
                    </div>
                    {!campus.privacyGuarded ? (
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                          { label: "Auth", v: campus.totalAuthorized,  cls: "text-foreground" },
                          { label: "Used", v: campus.totalRedeemed,    cls: "text-foreground"  },
                          { label: "Hold", v: campus.totalReserved,    cls: "text-foreground/70" },
                        ].map(col => (
                          <div key={col.label} className="rounded bg-background/30 py-2">
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
  const employees = useListEmployerEmployees(undefined, { query: { queryKey: getListEmployerEmployeesQueryKey() } });
  const campuses  = useGetEmployerCampusBreakdown({ query: { queryKey: getGetEmployerCampusBreakdownQueryKey() } });
  const updater   = useUpdateEmployerEmployee({ mutation: { onSuccess: () => void qc.invalidateQueries({ queryKey: getListEmployerEmployeesQueryKey() }) } });
  const adder     = useAddEmployerEmployee({ mutation: { onSuccess: () => { void qc.invalidateQueries({ queryKey: getListEmployerEmployeesQueryKey() }); setShowAdd(false); setNewEmp({ name: "", workEmail: "", department: "", benefitTier: "Faculty" }); } } });
  const importer  = useImportEmployerEmployees({ mutation: { onSuccess: () => void qc.invalidateQueries({ queryKey: getListEmployerEmployeesQueryKey() }) } });

  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState<RosterFilter>({ campus: "", tier: "", eligibility: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [showCsv, setShowCsv] = useState(false);
  const [csv, setCsv]         = useState("");
  const [editId, setEditId]   = useState<number | null>(null);
  const [newEmp, setNewEmp]   = useState({ name: "", workEmail: "", department: "", benefitTier: "Faculty" });
  const [templateError, setTemplateError] = useState("");

  async function downloadTemplate() {
    setTemplateError("");
    try {
      const res = await fetch(`${API_BASE_URL}${import.meta.env.BASE_URL}api/v1/employer/employees/template`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const text = await res.text();
      const blob = new Blob([text], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "loup-roster-template.csv"; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : "Download failed");
    }
  }

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
        <label className="flex items-center gap-2 rounded border border-border/80 bg-background/60 px-3.5 py-2 text-sm focus-within:ring-2 focus-within:ring-primary transition-all">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people…" className="bg-transparent outline-none w-36 text-sm placeholder:text-muted-foreground" data-testid="input-employer-roster-search" />
        </label>

        {/* Tier filter */}
        <select value={filter.tier} onChange={e => setFilter(f => ({ ...f, tier: e.target.value }))} className="rounded border border-border/80 bg-background/60 px-3.5 py-2 text-sm outline-none" data-testid="select-tier-filter">
          <option value="">All tiers</option>
          {tiers.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Eligibility filter */}
        <select value={filter.eligibility} onChange={e => setFilter(f => ({ ...f, eligibility: e.target.value }))} className="rounded border border-border/80 bg-background/60 px-3.5 py-2 text-sm outline-none" data-testid="select-eligibility-filter">
          <option value="">All statuses</option>
          {eligibilities.map(e => <option key={e} value={e}>{e}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-2">
          {/* CSV import toggle */}
          <button type="button" onClick={() => { setShowCsv(v => !v); setShowAdd(false); }} className={cn("inline-flex items-center gap-1.5 rounded border px-3.5 py-2 text-sm font-medium transition-colors", showCsv ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:bg-accent/30")} data-testid="button-toggle-csv">
            <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
          </button>
          {/* Add employee */}
          <button type="button" onClick={() => { setShowAdd(v => !v); setShowCsv(false); }} className={cn("inline-flex items-center gap-1.5 rounded px-3.5 py-2 text-sm font-medium transition-all hover:-translate-y-0.5", showAdd ? "bg-foreground/80 text-background" : "bg-foreground text-background")} data-testid="button-add-employee">
            <Plus className="h-3.5 w-3.5" /> Add employee
          </button>
        </div>
      </div>

      {/* Inline add-employee form (horizontal) */}
      {showAdd && (
        <div className="rounded-lg border border-border bg-background/40 backdrop-blur-sm p-4 platform-reveal">
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
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors whitespace-nowrap"
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
        <div className="rounded-lg border border-border/40 bg-background/40 backdrop-blur-sm p-4 platform-reveal">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
              Bulk upsert — columns: externalEmployeeId, name, workEmail, department, benefitTier, eligibilityStatus, householdEligible. Matches on externalEmployeeId (creates new, updates existing).
            </p>
            <button type="button" onClick={() => void downloadTemplate()} className="shrink-0 text-xs text-primary hover:underline whitespace-nowrap" data-testid="button-download-roster-template">
              Download template
            </button>
          </div>
          {templateError && <p className="mb-2 text-xs text-destructive">{templateError}</p>}
          <div className="flex gap-2">
            <input value={csv} onChange={e => setCsv(e.target.value)} placeholder="Paste CSV rows (one per line)…" className="flex-1 input-std text-sm" data-testid="input-employer-csv" />
            <button type="button" disabled={!csv || importer.isPending} onClick={() => importer.mutate({ data: { csv } })} className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50 whitespace-nowrap" data-testid="button-employer-import">
              {importer.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-3.5 w-3.5 inline mr-1.5" />Import</>}
            </button>
          </div>
          {importer.data && (
            <div className="mt-2 space-y-1" data-testid="status-employer-import">
              <p className={cn("text-xs flex items-center gap-1.5", importer.data.status === "failed" ? "text-destructive" : "text-primary")}>
                <CheckCircle2 className="h-3.5 w-3.5" />{importer.data.message}
              </p>
              {importer.data.errors.length > 0 && (
                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                  {importer.data.errors.map((e, i) => <li key={i}>Row {e.row}: {e.message}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Employee table — cards below sm, real table sm+ */}
      <div className="sm:hidden space-y-3">
        {employees.isLoading
          ? [1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />)
          : roster.map(emp => (
            <div key={emp.id} className="rounded-lg border border-border bg-card p-4" data-testid={`row-employer-employee-mobile-${emp.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{emp.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{emp.workEmail}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">{emp.benefitTier}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
                <span>{emp.department}</span>
                <span>{(emp as typeof emp & { campusName?: string }).campusName ?? "—"}</span>
                <span>{emp.householdEligible ? "Household eligible" : "Employee only"}</span>
              </div>
              <button
                type="button"
                onClick={() => toggleEligibility(emp.id, emp.eligibilityStatus)}
                disabled={updater.isPending && editId === emp.id}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-opacity"
                data-testid={`button-toggle-eligibility-mobile-${emp.id}`}
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
            </div>
          ))
        }
        {!employees.isLoading && roster.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-10 text-center" data-testid="empty-employer-roster-mobile">
            <Search className="mx-auto h-7 w-7 text-muted-foreground mb-2" />
            <p className="font-medium">No employees found</p>
            <p className="text-sm text-muted-foreground mt-1">Adjust your filters or search term.</p>
          </div>
        )}
      </div>
      <div className="hidden sm:block overflow-x-auto rounded-lg border border-border bg-card">
        <Table className="min-w-[780px]">
          <TableHeader>
            <TableRow className="bg-accent/40 hover:bg-accent/40">
              {["Employee", "Department", "Campus", "Tier", "Eligibility", "Household", ""].map(h => (
                <TableHead key={h} className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em]">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.isLoading
              ? [1, 2, 3].map(i => <TableRow key={i}><TableCell colSpan={7} className="px-5 py-3"><div className="h-5 animate-pulse rounded bg-muted" /></TableCell></TableRow>)
              : roster.map(emp => (
                <TableRow key={emp.id} data-testid={`row-employer-employee-${emp.id}`}>
                  <TableCell className="px-5 py-3">
                    <p className="font-medium">{emp.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{emp.workEmail}</p>
                  </TableCell>
                  <TableCell className="px-5 py-3 text-muted-foreground text-[13px]">{emp.department}</TableCell>
                  <TableCell className="px-5 py-3 text-muted-foreground text-[13px]">
                    {(emp as typeof emp & { campusName?: string }).campusName ?? <span className="italic opacity-40">—</span>}
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <Badge variant="secondary">{emp.benefitTier}</Badge>
                  </TableCell>
                  <TableCell className="px-5 py-3">
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
                  </TableCell>
                  <TableCell className="px-5 py-3 text-[13px] text-muted-foreground">{emp.householdEligible ? "Eligible" : "Only"}</TableCell>
                  <TableCell className="px-5 py-3">
                    <span className="text-[11px] text-muted-foreground/50">#{emp.id}</span>
                  </TableCell>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
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
        <button type="button" onClick={() => setShowBuilder(v => !v)} className="inline-flex items-center gap-1.5 rounded bg-foreground px-3.5 py-2 text-sm font-medium text-background hover:-translate-y-0.5 transition-all" data-testid="button-new-plan">
          <Plus className="h-3.5 w-3.5" /> New plan
        </button>
      </div>

      {/* Plan builder (collapsed by default) */}
      {showBuilder && (
        <div className="rounded-lg border border-border bg-background/40 backdrop-blur-sm p-5 platform-reveal">
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
                <div key={ti} className="flex flex-wrap items-end gap-3 rounded-lg bg-accent/20 border border-border/30 px-4 py-3">
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
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-secondary border border-border px-4 py-3 mb-4">
            <p className="text-sm text-muted-foreground">Monthly liability per employee</p>
            <p className="font-serif text-xl font-semibold text-foreground">{money(monthlyLiabilityPreview)}</p>
          </div>
          <div className="flex gap-3">
            <button type="button" disabled={!draft.name || draft.tiers.some(t => !t.name) || creator.isPending} onClick={() => creator.mutate({ data: draft })} className="rounded bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50" data-testid="button-create-plan">
              {creator.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create plan"}
            </button>
            <button type="button" onClick={() => setDraft(BLANK_PLAN)} className="rounded border border-border/60 px-5 py-2 text-sm text-muted-foreground hover:bg-accent/30 transition-colors">Reset</button>
          </div>
          {creator.isError && <p className="mt-3 text-sm text-destructive flex items-center gap-2" data-testid="error-create-plan"><AlertCircle className="h-4 w-4" />Failed to create plan.</p>}
        </div>
      )}

      {/* Existing plans */}
      {plans.isLoading
        ? <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-36 animate-pulse rounded-lg bg-muted" />)}</div>
        : plans.data?.length === 0
          ? <div className="rounded-lg border border-dashed border-border p-10 text-center"><Layers3 className="mx-auto h-7 w-7 text-muted-foreground mb-2" /><p className="font-medium">No plans configured yet</p><p className="text-sm text-muted-foreground mt-1">Create your first benefit plan above.</p></div>
          : (
            <div className="grid gap-4 lg:grid-cols-2">
              {plans.data?.map((plan, pi) => (
                <div key={plan.id} className="glass-card rounded-lg p-5 platform-reveal" style={{ animationDelay: `${pi * 60}ms` }} data-testid={`row-plan-${plan.id}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-[15px]">{plan.name}</p>
                      <p className="text-[12px] text-muted-foreground mt-0.5">{plan.period} · {plan.renewalFrequency} renewal</p>
                    </div>
                    <Badge variant={plan.active ? "default" : "secondary"} className="shrink-0 ml-3 gap-1">
                      {plan.active ? <BadgeCheck className="h-3 w-3" /> : null} {plan.active ? "Active" : "Inactive"}
                    </Badge>
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
                          <span className="font-semibold text-foreground text-[13px]">{money(tier.monthlyAllowance)}<span className="text-[11px] font-normal text-muted-foreground">/mo</span></span>
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
  const BASE = `${API_BASE_URL}${import.meta.env.BASE_URL}`;
  const [downloading, setDownloading] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const qc = useQueryClient();
  const consent = useGetEmployerConsent({ query: { queryKey: getGetEmployerConsentQueryKey() } });
  const recordConsent = useRecordEmployerConsent({ mutation: { onSuccess: () => void qc.invalidateQueries({ queryKey: getGetEmployerConsentQueryKey() }) } });
  const [exportingFull, setExportingFull] = useState(false);
  const [fullExportError, setFullExportError] = useState("");

  async function downloadFullExport() {
    setExportingFull(true);
    setFullExportError("");
    try {
      const res = await fetch(`${BASE}api/v1/employer/data-export`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = await res.text();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "loup-full-data-export.json"; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setFullExportError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setExportingFull(false);
    }
  }

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
      <div className="rounded-lg border border-border/50 bg-background/30 overflow-hidden">
        {reportDefs.map((exp, i) => (
          <div key={exp.label} className={cn("flex items-start gap-4 px-5 py-4 hover:bg-accent/20 transition-colors", i < reportDefs.length - 1 && "border-b border-border/40")} data-testid={`row-export-${i}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-[14px]">{exp.label}</p>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground bg-secondary border border-border rounded px-2 py-0.5">.csv</span>
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

      {/* Privacy & compliance (PDPL, P1-11) */}
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold pt-4">Privacy &amp; compliance</p>
      <div className="rounded-lg border border-border/50 bg-background/30 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", consent.data?.consented ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400")}>
            <Shield className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[14px]">Data processing consent</p>
            {consent.isLoading ? (
              <p className="text-[12px] text-muted-foreground mt-0.5">Loading…</p>
            ) : consent.data?.consented ? (
              <p className="text-[12px] text-muted-foreground mt-0.5" data-testid="status-consent">
                Recorded {new Date(consent.data.consentedAt!).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} by {consent.data.consentedBy}
              </p>
            ) : (
              <p className="text-[12px] text-muted-foreground mt-0.5" data-testid="status-consent">Not yet recorded for this institution.</p>
            )}
          </div>
          {!consent.isLoading && !consent.data?.consented && (
            <button
              type="button"
              disabled={recordConsent.isPending}
              onClick={() => recordConsent.mutate()}
              className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-foreground px-3.5 py-1.5 text-xs font-medium text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
              data-testid="button-record-consent"
            >
              {recordConsent.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              Record consent
            </button>
          )}
        </div>

        <div className="flex items-start gap-3 pt-4 border-t border-border/40">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/40 text-muted-foreground">
            <Download className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[14px]">Full data export</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">Every record tied to your institution — roster, ledger, bookings, incidents, webhook events — as one JSON bundle (PDPL data-portability request).</p>
            {fullExportError && <p className="mt-1 text-[11px] text-destructive">{fullExportError}</p>}
          </div>
          <button
            type="button"
            disabled={exportingFull}
            onClick={() => void downloadFullExport()}
            className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-border/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-colors disabled:opacity-50"
            data-testid="button-full-data-export"
          >
            {exportingFull ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Download JSON
          </button>
        </div>
      </div>
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
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-secondary border border-border">
              <ShieldCheck className="h-4.5 w-4.5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground leading-none">Benefits governance</p>
              <p className="mt-0.5 text-[17px] font-semibold text-foreground truncate leading-tight">{employerName}</p>
            </div>
          </div>

          {/* Tab bar — right-aligned, flush */}
          <div className="flex gap-0.5 rounded bg-muted border border-border p-1">
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
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
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
        <div className="mt-5 border-b border-border" />
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
