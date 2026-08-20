import { useState, useEffect, useRef } from "react";
import { ArrowRight, CalendarDays, Check, Clock3, CreditCard, Home, LifeBuoy, Repeat2, Sparkles, Building2, MapPin, Award, Sliders, Save, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  useGetEmployeeOverview,
  useGetEmployeeAllocation,
  useSaveEmployeeAllocation,
  getGetEmployeeOverviewQueryKey,
  getGetEmployeeAllocationQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PlatformHeader, StatTile, DataState, PlatformShell } from "@/components/platform-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useToast } from "@/hooks/use-toast";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

const allowanceChartConfig = {
  redeemed: { label: "Redeemed", color: "hsl(var(--primary))" },
  reserved: { label: "Reserved", color: "hsl(var(--primary) / 0.45)" },
  available: { label: "Available", color: "hsl(var(--muted))" },
} satisfies ChartConfig;

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(value);
}
function fmtDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
}

export default function Employee() {
  const [mounted, setMounted] = useState(false);
  const [allocationOpen, setAllocationOpen] = useState(false);
  const [draftAllocations, setDraftAllocations] = useState<{ slug: string; name: string; amount: number }[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const overviewQuery = useGetEmployeeOverview({ query: { queryKey: getGetEmployeeOverviewQueryKey() } });
  const allocationQuery = useGetEmployeeAllocation({
    query: { queryKey: getGetEmployeeAllocationQueryKey(), enabled: allocationOpen },
  });
  const saveAllocation = useSaveEmployeeAllocation();

  const data = overviewQuery.data;
  const allocation = allocationQuery.data;

  const bannerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const allocationRef = useRef<HTMLElement>(null);
  const servicesRoutinesRef = useRef<HTMLElement>(null);
  const serviceListRef = useRef<HTMLDivElement>(null);
  const routineListRef = useRef<HTMLDivElement>(null);

  useReveal(bannerRef, { y: 10, immediate: true, duration: 0.5, deps: [!!data] });
  useReveal(heroRef, { y: 12, stagger: true, immediate: true, duration: 0.5, deps: [!!data] });
  useReveal(allocationRef, { y: 12, deps: [!!data] });
  useReveal(servicesRoutinesRef, { y: 12, stagger: true, deps: [!!data] });

  useEffect(() => { setMounted(true); }, []);

  // Sync draft allocations when allocation data loads
  useEffect(() => {
    if (allocation) setDraftAllocations([...allocation.allocations]);
  }, [allocation]);

  const totalDraft = draftAllocations.reduce((s, a) => s + a.amount, 0);
  const draftRemaining = (allocation?.totalAllowance ?? data?.allowance.authorized ?? 750) - totalDraft;
  const isOverAllocated = draftRemaining < 0;

  const handleSaveAllocation = () => {
    saveAllocation.mutate(
      { data: { allocations: draftAllocations } },
      {
        onSuccess: () => {
          toast({ title: "Allocation saved", description: "Your benefit distribution has been updated." });
          queryClient.invalidateQueries({ queryKey: getGetEmployeeAllocationQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetEmployeeOverviewQueryKey() });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.response?.data?.error ?? "Could not save allocation.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <PlatformShell role="employee">
      <div className="mx-auto max-w-6xl">
        <PlatformHeader
          kicker="Your Loup benefit"
          title={data ? `Good morning, ${data.employeeName.split(" ")[0]}.` : "Your life, with a little more room."}
          description={data ? `${data.institutionName} has set aside a private allowance for the things that keep your household moving.` : "Your private benefit concierge is loading."}
          action={
            <Link href="/browse" className="inline-flex items-center gap-2 rounded bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5" data-testid="link-employee-browse">
              Browse services <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />

        <DataState loading={overviewQuery.isLoading} error={overviewQuery.isError} onRetry={() => void overviewQuery.refetch()}>
          {data && (
            <div className="space-y-6">
              {/* Institution context banner */}
              <div ref={bannerRef} className="glass-card rounded-lg px-6 py-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{data.institutionName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{data.campusName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Award className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{data.benefitTierName} tier</span>
                  <span className="text-xs font-semibold text-foreground bg-secondary border border-border rounded px-2.5 py-0.5">
                    {money(data.benefitTierAllowance)}/mo
                  </span>
                </div>
              </div>

              {/* Hero: Allowance card + Upcoming booking */}
              <section ref={heroRef} className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
                <div className="glass-card rounded-lg p-8 sm:p-10">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-medium">Available to use</p>
                    <div className="rounded border border-border bg-secondary px-2.5 py-1 text-[10px] font-medium tracking-wide text-muted-foreground">
                      Renews {data.allowance.renewalDate}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-baseline gap-3">
                      <span className="text-7xl tabular-nums text-foreground font-semibold">
                        {mounted ? money(data.allowance.available) : "AED 0"}
                      </span>
                      <span className="text-sm text-muted-foreground font-medium">of {money(data.allowance.authorized)} this cycle</span>
                    </div>
                    <ChartContainer config={allowanceChartConfig} className="mt-8 h-9 w-full aspect-auto">
                      <BarChart
                        data={[{ name: "allowance", redeemed: data.allowance.redeemed, reserved: data.allowance.reserved, available: data.allowance.available }]}
                        layout="vertical"
                        barSize={22}
                        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                      >
                        <XAxis type="number" hide domain={[0, data.allowance.authorized]} />
                        <YAxis type="category" dataKey="name" hide />
                        <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => [` ${money(Number(value))}`, allowanceChartConfig[name as keyof typeof allowanceChartConfig]?.label ?? name]} />} />
                        <Bar dataKey="redeemed" stackId="a" fill="var(--color-redeemed)" radius={[6, 0, 0, 6]} />
                        <Bar dataKey="reserved" stackId="a" fill="var(--color-reserved)" />
                        <Bar dataKey="available" stackId="a" fill="var(--color-available)" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ChartContainer>
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> {money(data.allowance.redeemed)} redeemed</span>
                      <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary/45" /> {money(data.allowance.reserved)} reserved</span>
                      <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted ring-1 ring-inset ring-border" /> {money(data.allowance.available)} available</span>
                    </div>
                  <Link href="/billing" className="mt-10 inline-flex items-center gap-2 text-sm font-medium text-primary hover:opacity-70 transition-opacity group" data-testid="link-employee-allowance-details">
                    See allowance details <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>

                <div className="glass-card rounded-lg p-8">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">Next on the calendar</p>
                    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                      <CalendarDays className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>

                  {data.upcomingBooking ? (
                    <div className="relative mt-8">
                      <div className="absolute left-0 top-2 bottom-0 w-0.5 bg-secondary">
                        <div className="absolute -left-[5px] top-0 h-3 w-3 rounded-full bg-primary" />
                      </div>
                      <div className="pl-6">
                        <p className="font-serif text-4xl text-foreground">{data.upcomingBooking.serviceName}</p>
                        <p className="mt-3 text-[15px] text-muted-foreground">
                          {data.upcomingBooking.providerName} <span className="mx-2">•</span> {fmtDate(data.upcomingBooking.scheduledAt)}
                        </p>
                        <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium rounded bg-secondary px-3 py-1.5 border border-border text-foreground">
                          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                          <span className="capitalize">{data.upcomingBooking.status.replaceAll("_", " ")}</span>
                        </div>
                        <div className="mt-8">
                          <Link href={`/bookings/${data.upcomingBooking.id}`} className="inline-flex items-center gap-2 rounded border border-border bg-secondary px-5 py-2.5 text-sm font-medium text-foreground hover:bg-foreground/5 transition-colors" data-testid="link-employee-upcoming-booking">
                            Open booking <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-8 rounded-lg bg-secondary border border-border p-6">
                      <p className="font-serif text-3xl text-foreground">A calm calendar is a good calendar.</p>
                      <Link href="/browse" className="mt-5 inline-flex items-center text-sm font-medium text-primary hover:opacity-70 transition-opacity" data-testid="link-employee-empty-booking">
                        Find a service <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Link>
                    </div>
                  )}
                </div>
              </section>

              {/* Stats row */}
              <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile index={0} label="Time returned" value={`${Math.floor(data.metrics.estimatedTimeSavedMinutes / 60)}h ${data.metrics.estimatedTimeSavedMinutes % 60}m`} detail="estimated this year" tone="brass" />
                <StatTile index={1} label="Services completed" value={String(data.metrics.servicesCompleted)} detail="across your household" />
                <StatTile index={2} label="Employer support" value={money(data.metrics.employerSupport)} detail="contributed to your care" tone="mint" />
                <StatTile index={3} label="Household allocations" value={String(data.metrics.householdAllocations)} detail="shared with your pack" tone="plum" />
              </section>

              {/* Flexible Allocation section */}
              <section ref={allocationRef} className="glass-card rounded-lg overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-7 sm:p-9 text-left hover:bg-foreground/5 transition-colors"
                  onClick={() => setAllocationOpen(prev => !prev)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <Sliders className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium mb-1">Benefit allocation</p>
                      <h2 className="font-serif text-2xl sm:text-3xl text-foreground">Distribute your allowance.</h2>
                    </div>
                  </div>
                  {allocationOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                </button>

                {allocationOpen && (
                  <div className="px-7 sm:px-9 pb-9 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Summary bar */}
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Total allocated</span>
                      <div className="flex items-center gap-3">
                        <span className={cn("font-semibold", isOverAllocated ? "text-destructive" : "text-foreground")}>{money(totalDraft)}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-muted-foreground">{money(allocation?.totalAllowance ?? data.allowance.authorized)}</span>
                        <span className={cn(
                          "text-xs font-semibold px-2 py-0.5 rounded border",
                          isOverAllocated
                            ? "bg-destructive/10 border-destructive/20 text-destructive"
                            : "bg-primary/10 border-primary/20 text-primary"
                        )}>
                          {isOverAllocated ? "Over by " + money(Math.abs(draftRemaining)) : money(draftRemaining) + " unallocated"}
                        </span>
                      </div>
                    </div>

                    {/* Stacked progress bar */}
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-300", isOverAllocated ? "bg-destructive" : "bg-primary")}
                        style={{ width: `${Math.min(100, (totalDraft / (allocation?.totalAllowance ?? data.allowance.authorized)) * 100)}%` }}
                      />
                    </div>

                    {allocationQuery.isLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-16 bg-secondary rounded-lg animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {draftAllocations.map((cat, i) => (
                          <div key={cat.slug} className="space-y-2" data-testid={`allocation-row-${cat.slug}`}>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-foreground">{cat.name}</span>
                              <span className="text-sm font-semibold text-foreground">{money(cat.amount)}</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={allocation?.totalAllowance ?? data.allowance.authorized}
                              step={10}
                              value={cat.amount}
                              onChange={e => {
                                const newAmount = Number(e.target.value);
                                setDraftAllocations(prev => prev.map((a, idx) => idx === i ? { ...a, amount: newAmount } : a));
                              }}
                              className="w-full accent-primary h-1.5 rounded-full"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="outline"
                        className="border-border text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          if (allocation) setDraftAllocations([...allocation.allocations]);
                        }}
                      >
                        Reset
                      </Button>
                      <Button
                        className="flex-1 font-semibold"
                        disabled={isOverAllocated || saveAllocation.isPending}
                        onClick={handleSaveAllocation}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {saveAllocation.isPending ? "Saving…" : "Save allocation"}
                      </Button>
                    </div>
                  </div>
                )}
              </section>

              {/* Services + Routines */}
              <section ref={servicesRoutinesRef} className="grid gap-6 lg:grid-cols-[1fr_.8fr]">
                <div className="glass-card rounded-lg p-7 sm:p-9">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">Eligible services</p>
                      <h2 className="mt-3 font-serif text-3xl sm:text-4xl text-foreground">Make room for what matters.</h2>
                    </div>
                    <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <Sparkles className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                  <div ref={serviceListRef} className="mt-8 divide-y divide-border">
                    {data.activeCategories.slice(0, 4).map((service) => (
                      <div key={service.slug} className="flex items-center gap-5 py-4 group" data-testid={`row-employee-service-${service.slug}`}>
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary transition-colors border border-border">
                          <Home className="h-5 w-5 text-muted-foreground transition-colors" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[15px] text-foreground">{service.name}</p>
                          <p className="truncate text-[13px] text-muted-foreground mt-0.5">{service.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-medium whitespace-nowrap bg-secondary rounded px-2.5 py-1 border border-border text-foreground">
                            {money(service.employeeCopayment)}
                          </span>
                          {service.employerContribution > 0 && (
                            <p className="mt-1 text-[11px] text-primary">+{money(service.employerContribution)} covered</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link href="/browse" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:opacity-70 transition-opacity" data-testid="link-employee-all-services">
                    View all services <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="glass-card rounded-lg p-7 sm:p-9">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">Routines</p>
                  <h2 className="mt-3 font-serif text-3xl sm:text-4xl text-foreground">Set it, then forget it.</h2>
                  <div ref={routineListRef} className="mt-8 space-y-4">
                    {data.routines.slice(0, 3).map((routine) => (
                      <div key={routine.id} className="rounded-lg bg-secondary border border-border p-5 hover:bg-foreground/5 transition-colors" data-testid={`row-employee-routine-${routine.id}`}>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-card border border-border">
                            <Repeat2 className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="font-medium text-foreground">{routine.label}</p>
                          <span className="ml-auto text-xs font-medium px-2 py-1 rounded bg-card capitalize border border-border text-muted-foreground">
                            {routine.status}
                          </span>
                        </div>
                        <p className="mt-3 pl-11 text-[13px] text-muted-foreground">
                          {routine.frequency} <span className="mx-1">•</span> {routine.preferredDay}, {routine.preferredTime}
                        </p>
                      </div>
                    ))}
                  </div>
                  <Link href="/household" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:opacity-70 transition-opacity" data-testid="link-employee-household">
                    Manage household <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </section>
            </div>
          )}
        </DataState>

        <div className="mt-10 flex flex-wrap gap-5 text-xs text-muted-foreground font-medium pb-8">
          <span className="inline-flex items-center gap-2.5 rounded border border-border bg-secondary px-3 py-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Benefit privacy protected</span>
          <span className="inline-flex items-center gap-2.5 rounded border border-border bg-secondary px-3 py-1.5"><Clock3 className="h-3.5 w-3.5 text-primary" /> Human support when needed</span>
          <Link href="/support" className="inline-flex items-center gap-2.5 rounded border border-border bg-secondary px-3 py-1.5 hover:bg-foreground/5 hover:text-foreground transition-colors" data-testid="link-employee-support"><LifeBuoy className="h-3.5 w-3.5" /> Talk to Loup support</Link>
          <Link href="/billing" className="inline-flex items-center gap-2.5 rounded border border-border bg-secondary px-3 py-1.5 hover:bg-foreground/5 hover:text-foreground transition-colors" data-testid="link-employee-billing"><CreditCard className="h-3.5 w-3.5" /> View billing</Link>
        </div>
      </div>
    </PlatformShell>
  );
}
