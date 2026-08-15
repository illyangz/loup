import { useState, useEffect } from "react";
import { ArrowUpRight, CheckCircle2, Download, FileSpreadsheet, Link2, Search, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { useGetEmployerOverview, getGetEmployerOverviewQueryKey, useListEmployerEmployees, getListEmployerEmployeesQueryKey, useGetEmployerUtilization, getGetEmployerUtilizationQueryKey, useGetEmployerIntegrations, getGetEmployerIntegrationsQueryKey, useImportEmployerEmployees } from "@workspace/api-client-react";
import { DataState, PlatformHeader, PlatformShell, StatTile } from "@/components/platform-shell";
import { cn } from "@/lib/utils";

function percent(value: number) { return `${Math.round(value * 100)}%`; }
function percentagePoints(value: number) { return `${Math.round(value)}%`; }
function percentageWidth(value: number) { return `${Math.min(100, Math.max(0, value))}%`; }
function money(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(value); }

export default function Employer() {
  const [search, setSearch] = useState("");
  const [csv, setCsv] = useState("");
  const [mounted, setMounted] = useState(false);
  
  const overview = useGetEmployerOverview({ query: { queryKey: getGetEmployerOverviewQueryKey() } });
  const employees = useListEmployerEmployees({ query: { queryKey: getListEmployerEmployeesQueryKey() } });
  const utilization = useGetEmployerUtilization({ query: { queryKey: getGetEmployerUtilizationQueryKey() } });
  const integrations = useGetEmployerIntegrations({ query: { queryKey: getGetEmployerIntegrationsQueryKey() } });
  const importer = useImportEmployerEmployees();
  
  const roster = employees.data?.filter((employee) => `${employee.name} ${employee.workEmail} ${employee.department}`.toLowerCase().includes(search.toLowerCase())) ?? [];
  const retry = () => { void overview.refetch(); void employees.refetch(); void utilization.refetch(); void integrations.refetch(); };
  
  useEffect(() => {
    setMounted(true);
  }, []);

  return <PlatformShell role="employer">
    <PlatformHeader 
      kicker="Benefits governance" 
      title={overview.data?.employerName ?? "Employer workspace"} 
      description="See whether the benefit is reaching people, where it is helping, and what the next operational decision should be." 
      action={<button type="button" onClick={() => document.getElementById("import-roster")?.focus()} className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:-translate-y-0.5 hover:shadow-md transition-all active:scale-95" data-testid="button-employer-import-focus"><Download className="h-4 w-4" /> Import roster</button>} 
    />
    <DataState loading={overview.isLoading} error={overview.isError} onRetry={retry}>
      {overview.data && <div className="space-y-6">
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile index={0} label="Activated employees" value={`${overview.data.activatedEmployees} / ${overview.data.eligibleEmployees}`} detail={`${percent(overview.data.activatedEmployees / overview.data.eligibleEmployees)} activation`} tone="brass" />
          <StatTile index={1} label="Forecast redemptions" value={money(overview.data.forecastRedemptions)} detail="next 30 days" />
          <StatTile index={2} label="Completion rate" value={percentagePoints(overview.data.completionRate)} detail={`${overview.data.satisfaction.toFixed(1)} / 5 satisfaction`} tone="mint" />
          <StatTile index={3} label="Invoice estimate" value={money(overview.data.invoiceEstimate)} detail="current cycle" tone="plum" />
        </section>
        
        <section className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <div className="platform-surface platform-card-lift rounded-3xl p-7 sm:p-9 platform-reveal" style={{ animationDelay: '100ms' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">Benefit pulse</p>
                <h2 className="mt-3 text-3xl sm:text-4xl">Adoption with a human read.</h2>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
            </div>
            
            {utilization.data ? (
              <div className="mt-10 grid gap-5 sm:grid-cols-2">
                <div className="rounded-2xl bg-accent/40 border border-border/50 p-6 platform-reveal" style={{ animationDelay: '150ms' }}>
                  <p className="text-sm font-medium text-muted-foreground">Activation rate</p>
                  <p className="mt-3 font-serif text-4xl count-up">{mounted ? percentagePoints(utilization.data.activationRate) : "0%"}</p>
                  <div className="mt-5 h-2 rounded-full bg-border/80 ring-1 ring-inset ring-black/5 dark:ring-white/5">
                    <div 
                      className={cn("h-full rounded-full bg-primary", mounted && "bar-grow")} 
                      style={{ "--target-width": percentageWidth(utilization.data.activationRate) } as React.CSSProperties} 
                    />
                  </div>
                </div>
                <div className="rounded-2xl bg-accent/40 border border-border/50 p-6 platform-reveal" style={{ animationDelay: '200ms' }}>
                  <p className="text-sm font-medium text-muted-foreground">Time returned</p>
                  <p className="mt-3 font-serif text-4xl count-up">{mounted ? `${Math.round(utilization.data.estimatedTimeSavedMinutes / 60)}h` : "0h"}</p>
                  <p className="mt-2 text-[13px] text-muted-foreground">estimated across the roster</p>
                </div>
                <div className="rounded-2xl bg-accent/40 border border-border/50 p-6 platform-reveal" style={{ animationDelay: '250ms' }}>
                  <p className="text-sm font-medium text-muted-foreground">Corporate savings</p>
                  <p className="mt-3 font-serif text-4xl count-up">{mounted ? money(utilization.data.corporateSavings) : "AED 0"}</p>
                  <p className="mt-2 text-[13px] text-muted-foreground">versus unmanaged time cost</p>
                </div>
                <div className="rounded-2xl bg-accent/40 border border-border/50 p-6 platform-reveal" style={{ animationDelay: '300ms' }}>
                  <p className="text-sm font-medium text-muted-foreground">Service recovery</p>
                  <p className="mt-3 font-serif text-4xl count-up">{mounted ? percentagePoints(utilization.data.serviceRecoveryRate) : "0%"}</p>
                  <p className="mt-2 text-[13px] text-muted-foreground">issues resolved by Loup</p>
                </div>
              </div>
            ) : (
              <div className="mt-10 grid gap-5 sm:grid-cols-2">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted/60" />)}
              </div>
            )}
          </div>
          
          <div className="platform-surface platform-card-lift rounded-3xl p-7 sm:p-9 platform-reveal" style={{ animationDelay: '150ms' }}>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">Category mix</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">What people hand off.</h2>
            <div className="mt-10 space-y-6">
              {utilization.data?.categoryUtilization.map((item, i) => (
                <div key={item.category} className="platform-reveal" style={{ animationDelay: `${200 + (i*50)}ms` }} data-testid={`row-utilization-${item.category}`}>
                  <div className="mb-2 flex justify-between text-[15px]">
                    <span className="font-medium">{item.category}</span>
                    <span className="text-muted-foreground">{item.bookings} bookings</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-accent ring-1 ring-inset ring-black/5 dark:ring-white/5">
                    <div 
                      className={cn("h-full rounded-full bg-gradient-to-r from-primary/80 to-primary", mounted && "bar-grow")} 
                      style={{ "--target-width": `${Math.max(8, item.share * 100)}%` } as React.CSSProperties} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        <section id="roster" className="platform-surface platform-card-lift scroll-mt-24 rounded-3xl p-7 sm:p-9 platform-reveal" style={{ animationDelay: '200ms' }}>
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end mb-8">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">People covered</p>
              <h2 className="mt-3 text-3xl sm:text-4xl">Roster</h2>
            </div>
            <label className="flex items-center gap-3 rounded-full border border-border/80 bg-background/60 px-4 py-2.5 text-sm focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="sr-only">Search employees</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people" className="w-48 bg-transparent outline-none placeholder:text-muted-foreground" data-testid="input-employer-roster-search" />
            </label>
          </div>
          
          <div className="overflow-x-auto rounded-2xl border border-border/50 bg-background/30">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-accent/20 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-6 py-4 font-medium">Employee</th>
                  <th className="px-6 py-4 font-medium">Department</th>
                  <th className="px-6 py-4 font-medium">Tier</th>
                  <th className="px-6 py-4 font-medium">Eligibility</th>
                  <th className="px-6 py-4 font-medium">Household</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {roster.map((employee, i) => (
                  <tr key={employee.id} className={cn("transition-colors hover:bg-accent/40", i % 2 === 0 ? "bg-transparent" : "bg-accent/10")} data-testid={`row-employer-employee-${employee.id}`}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-[15px]">{employee.name}</p>
                      <p className="text-[13px] text-muted-foreground mt-0.5">{employee.workEmail}</p>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{employee.department}</td>
                    <td className="px-6 py-4"><span className="inline-flex rounded-full bg-accent px-2.5 py-1 text-xs font-medium">{employee.benefitTier}</span></td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-2 text-xs font-medium">
                        <span className="h-2 w-2 rounded-full bg-primary" />
                        {employee.eligibilityStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{employee.householdEligible ? "Eligible" : "Employee only"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!employees.isLoading && !employees.isError && roster.length === 0 && (
              <div className="p-12 text-center" data-testid="empty-employer-roster">
                <div className="mx-auto w-12 h-12 rounded-full bg-accent/50 flex items-center justify-center mb-4">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-base font-medium">No employees found</p>
                <p className="text-sm text-muted-foreground mt-1">Try adjusting your search terms</p>
              </div>
            )}
          </div>
        </section>
        
        <section id="integrations" className="grid scroll-mt-24 gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="platform-surface platform-card-lift rounded-3xl p-7 sm:p-9 platform-reveal" style={{ animationDelay: '250ms' }}>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Link2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">Connected systems</p>
                <h2 className="mt-1 text-2xl sm:text-3xl font-serif">Integration cues</h2>
              </div>
            </div>
            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between rounded-2xl bg-accent/40 border border-border/50 p-5 hover:bg-accent/60 transition-colors">
                <span className="font-medium text-[15px]">{integrations.data?.ssoLabel ?? "SSO connection"}</span>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                  <CheckCircle2 className="h-4 w-4" /> Connected
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-accent/40 border border-border/50 p-5 hover:bg-accent/60 transition-colors">
                <span className="font-medium text-[15px]">Embedded employee widget</span>
                <Link href="/embed/demo" className="text-sm font-medium text-primary hover:opacity-80 transition-opacity flex items-center" data-testid="link-employer-widget">
                  Preview <ArrowUpRight className="ml-1.5 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
          
          <div className="platform-surface platform-card-lift rounded-3xl p-7 sm:p-9 platform-reveal" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">Roster import</p>
                <h2 className="mt-1 text-2xl sm:text-3xl font-serif">Bring people in.</h2>
              </div>
            </div>
            <p className="mt-6 text-[15px] leading-relaxed text-muted-foreground">Upload a CSV with work email, name, department, and benefit tier. This is a simulated import for the demo.</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <input id="import-roster" value={csv} onChange={(event) => setCsv(event.target.value)} placeholder="Paste CSV rows or a file name" className="min-w-0 flex-1 rounded-xl border border-border/80 bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm" data-testid="input-employer-csv" />
              <button type="button" disabled={!csv || importer.isPending} onClick={() => importer.mutate({ data: { csv } })} className="rounded-xl bg-foreground px-6 py-3 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50 hover:bg-foreground/90 transition-colors shrink-0" data-testid="button-employer-import">
                {importer.isPending ? "Importing…" : "Import"}
              </button>
            </div>
            {importer.data && (
              <div className="mt-4 rounded-lg bg-primary/10 border border-primary/20 p-3 platform-reveal">
                <p className="text-sm text-primary font-medium flex items-center gap-2" data-testid="status-employer-import">
                  <CheckCircle2 className="h-4 w-4" /> {importer.data.message}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>}
    </DataState>
  </PlatformShell>;
}
