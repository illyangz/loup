import { useState, useEffect } from "react";
import { ArrowRight, CalendarDays, Check, Clock3, CreditCard, Home, LifeBuoy, Repeat2, Sparkles, Building2, MapPin, Award, Sliders, Save, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

  useEffect(() => { setMounted(true); }, []);

  // Sync draft allocations when allocation data loads
  useEffect(() => {
    if (allocation) setDraftAllocations([...allocation.allocations]);
  }, [allocation]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    e.currentTarget.style.setProperty("--rx", `${-y * 6}deg`);
    e.currentTarget.style.setProperty("--ry", `${x * 6}deg`);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.setProperty("--rx", "0deg");
    e.currentTarget.style.setProperty("--ry", "0deg");
  };

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
            <Link href="/browse" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[#d27c4b] px-5 py-2.5 text-sm font-semibold text-black transition-all hover:-translate-y-0.5 hover:shadow-[0_0_20px_hsl(var(--primary)/0.4)] active:scale-95" data-testid="link-employee-browse">
              Browse services <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />

        <DataState loading={overviewQuery.isLoading} error={overviewQuery.isError} onRetry={() => void overviewQuery.refetch()}>
          {data && (
            <div className="space-y-6">
              {/* Institution context banner */}
              <div className="glass-card rounded-2xl px-6 py-4 flex flex-wrap items-center gap-x-6 gap-y-3 platform-reveal">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-white/40 shrink-0" />
                  <span className="text-white/60">{data.institutionName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-white/40 shrink-0" />
                  <span className="text-white/60">{data.campusName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Award className="h-4 w-4 text-white/40 shrink-0" />
                  <span className="text-white/60">{data.benefitTierName} tier</span>
                  <span className="text-xs font-semibold text-[hsl(var(--primary))] bg-[hsl(var(--primary))/0.1] border border-[hsl(var(--primary))/0.2] rounded-full px-2.5 py-0.5">
                    {money(data.benefitTierAllowance)}/mo
                  </span>
                </div>
              </div>

              {/* Hero: Allowance card + Upcoming booking */}
              <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
                <div
                  className="glass-card-glow relative overflow-hidden rounded-3xl p-8 sm:p-10 platform-reveal"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  style={{ transform: "perspective(800px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))", transition: "transform 0.15s ease-out" }}
                >
                  <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[hsl(var(--primary))/0.3] rounded-full blur-[80px] pointer-events-none" />
                  <div className="relative z-10" style={{ transform: "translateZ(30px)" }}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/50 font-medium">Available to use</p>
                      <div className="rounded-full bg-[hsl(var(--primary))/0.2] border border-[hsl(var(--primary))/0.3] px-2.5 py-1 text-[10px] font-medium tracking-wide text-[hsl(var(--primary))]">
                        Renews {data.allowance.renewalDate}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-baseline gap-3">
                      <span className="font-serif text-7xl count-up text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] font-bold">
                        {mounted ? money(data.allowance.available) : "AED 0"}
                      </span>
                      <span className="text-sm text-white/60 font-medium">of {money(data.allowance.authorized)} this cycle</span>
                    </div>
                    <div className="mt-8 h-2.5 overflow-hidden rounded-full bg-white/5 ring-1 ring-inset ring-white/10">
                      <div
                        className="h-full rounded-full bg-[hsl(var(--primary))] shadow-[0_0_10px_hsl(var(--primary)/0.8)]"
                        style={{
                          width: mounted ? `${Math.min(100, (data.allowance.redeemed / data.allowance.authorized) * 100)}%` : "0%",
                          transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                      />
                    </div>
                    <div className="mt-4 flex justify-between text-sm text-white/50">
                      <span>{money(data.allowance.redeemed)} redeemed</span>
                      <span>{money(data.allowance.reserved)} reserved</span>
                    </div>
                    <Link href="/billing" className="mt-10 inline-flex items-center gap-2 text-sm font-medium text-[hsl(var(--primary))] hover:text-white transition-colors group" data-testid="link-employee-allowance-details">
                      See allowance details <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>

                <div className="glass-card rounded-3xl p-8 platform-reveal" style={{ animationDelay: "50ms" }}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/50 font-medium">Next on the calendar</p>
                    <div className="h-10 w-10 rounded-full bg-[hsl(var(--primary))/0.1] flex items-center justify-center">
                      <CalendarDays className="h-5 w-5 text-[hsl(var(--primary))]" />
                    </div>
                  </div>

                  {data.upcomingBooking ? (
                    <div className="relative mt-8">
                      <div className="absolute left-0 top-2 bottom-0 w-0.5 bg-white/10">
                        <div className="absolute -left-[5px] top-0 h-3 w-3 rounded-full bg-[hsl(var(--primary))] shadow-[0_0_10px_hsl(var(--primary))]" />
                      </div>
                      <div className="pl-6">
                        <p className="font-serif text-4xl font-bold text-white">{data.upcomingBooking.serviceName}</p>
                        <p className="mt-3 text-[15px] text-white/50">
                          {data.upcomingBooking.providerName} <span className="mx-2">•</span> {fmtDate(data.upcomingBooking.scheduledAt)}
                        </p>
                        <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium rounded-full bg-white/5 px-3 py-1.5 border border-white/10 text-white/80">
                          <span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))] animate-pulse shadow-[0_0_8px_hsl(var(--primary))]" />
                          <span className="capitalize">{data.upcomingBooking.status.replaceAll("_", " ")}</span>
                        </div>
                        <div className="mt-8">
                          <Link href={`/bookings/${data.upcomingBooking.id}`} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-all hover:shadow-sm" data-testid="link-employee-upcoming-booking">
                            Open booking <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-8 rounded-2xl bg-white/5 border border-white/10 p-6">
                      <p className="font-serif text-3xl text-white font-bold">A calm calendar is a good calendar.</p>
                      <Link href="/browse" className="mt-5 inline-flex items-center text-sm font-medium text-[hsl(var(--primary))] hover:text-white transition-colors" data-testid="link-employee-empty-booking">
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
              <section className="glass-card rounded-3xl overflow-hidden platform-reveal" style={{ animationDelay: "80ms" }}>
                <button
                  className="w-full flex items-center justify-between p-7 sm:p-9 text-left hover:bg-white/[0.02] transition-colors"
                  onClick={() => setAllocationOpen(prev => !prev)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-[hsl(var(--primary))/0.1] flex items-center justify-center shrink-0">
                      <Sliders className="h-6 w-6 text-[hsl(var(--primary))]" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-white/50 font-medium mb-1">Benefit allocation</p>
                      <h2 className="text-2xl sm:text-3xl text-white">Distribute your allowance.</h2>
                    </div>
                  </div>
                  {allocationOpen ? (
                    <ChevronUp className="h-5 w-5 text-white/40 shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-white/40 shrink-0" />
                  )}
                </button>

                {allocationOpen && (
                  <div className="px-7 sm:px-9 pb-9 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Summary bar */}
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-white/60">Total allocated</span>
                      <div className="flex items-center gap-3">
                        <span className={cn("font-semibold", isOverAllocated ? "text-red-400" : "text-white")}>{money(totalDraft)}</span>
                        <span className="text-white/30">/</span>
                        <span className="text-white/60">{money(allocation?.totalAllowance ?? data.allowance.authorized)}</span>
                        <span className={cn(
                          "text-xs font-semibold px-2 py-0.5 rounded-full border",
                          isOverAllocated
                            ? "bg-red-500/10 border-red-500/20 text-red-400"
                            : "bg-[hsl(var(--primary))/0.1] border-[hsl(var(--primary))/0.2] text-[hsl(var(--primary))]"
                        )}>
                          {isOverAllocated ? "Over by " + money(Math.abs(draftRemaining)) : money(draftRemaining) + " unallocated"}
                        </span>
                      </div>
                    </div>

                    {/* Stacked progress bar */}
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-300", isOverAllocated ? "bg-red-500" : "bg-[hsl(var(--primary))]")}
                        style={{ width: `${Math.min(100, (totalDraft / (allocation?.totalAllowance ?? data.allowance.authorized)) * 100)}%` }}
                      />
                    </div>

                    {allocationQuery.isLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {draftAllocations.map((cat, i) => (
                          <div key={cat.slug} className="space-y-2" data-testid={`allocation-row-${cat.slug}`}>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-white/80">{cat.name}</span>
                              <span className="text-sm font-semibold text-white">{money(cat.amount)}</span>
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
                              className="w-full accent-[hsl(var(--primary))] h-1.5 rounded-full"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="outline"
                        className="border-white/10 text-white/60 hover:text-white"
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
              <section className="grid gap-6 lg:grid-cols-[1fr_.8fr]">
                <div className="glass-card rounded-3xl p-7 sm:p-9 platform-reveal" style={{ animationDelay: "100ms" }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-white/50 font-medium">Eligible services</p>
                      <h2 className="mt-3 text-3xl sm:text-4xl text-white">Make room for what matters.</h2>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-[hsl(var(--primary))/0.1] flex items-center justify-center shrink-0">
                      <Sparkles className="h-6 w-6 text-[hsl(var(--primary))]" />
                    </div>
                  </div>
                  <div className="mt-8 divide-y divide-white/10">
                    {data.activeCategories.slice(0, 4).map((service, i) => (
                      <div key={service.slug} className="flex items-center gap-5 py-4 group platform-reveal" style={{ animationDelay: `${150 + i * 50}ms` }} data-testid={`row-employee-service-${service.slug}`}>
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5 group-hover:bg-[hsl(var(--primary))/0.1] transition-colors border border-white/5">
                          <Home className="h-5 w-5 text-white/40 group-hover:text-[hsl(var(--primary))] transition-colors" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[15px] text-white/90">{service.name}</p>
                          <p className="truncate text-[13px] text-white/50 mt-0.5">{service.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-medium whitespace-nowrap bg-white/5 rounded-full px-2.5 py-1 border border-white/10 text-white/80">
                            {money(service.employeeCopayment)}
                          </span>
                          {service.employerContribution > 0 && (
                            <p className="mt-1 text-[11px] text-[hsl(var(--primary))]">+{money(service.employerContribution)} covered</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link href="/browse" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[hsl(var(--primary))] hover:text-white transition-colors" data-testid="link-employee-all-services">
                    View all services <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="glass-card rounded-3xl p-7 sm:p-9 platform-reveal" style={{ animationDelay: "150ms" }}>
                  <p className="text-xs uppercase tracking-[0.16em] text-white/50 font-medium">Routines</p>
                  <h2 className="mt-3 text-3xl sm:text-4xl text-white">Set it, then forget it.</h2>
                  <div className="mt-8 space-y-4">
                    {data.routines.slice(0, 3).map((routine, i) => (
                      <div key={routine.id} className="rounded-2xl bg-white/5 border border-white/10 p-5 hover:bg-white/10 transition-colors platform-reveal" style={{ animationDelay: `${200 + i * 50}ms` }} data-testid={`row-employee-routine-${routine.id}`}>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))/0.1]">
                            <Repeat2 className="h-4 w-4 text-[hsl(var(--primary))]" />
                          </div>
                          <p className="font-medium text-white/90">{routine.label}</p>
                          <span className="ml-auto text-xs font-medium px-2 py-1 rounded-full bg-[hsl(var(--primary))/0.1] text-[hsl(var(--primary))] capitalize border border-[hsl(var(--primary))/0.2]">
                            {routine.status}
                          </span>
                        </div>
                        <p className="mt-3 pl-11 text-[13px] text-white/50">
                          {routine.frequency} <span className="mx-1">•</span> {routine.preferredDay}, {routine.preferredTime}
                        </p>
                      </div>
                    ))}
                  </div>
                  <Link href="/household" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[hsl(var(--primary))] hover:text-white transition-colors" data-testid="link-employee-household">
                    Manage household <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </section>
            </div>
          )}
        </DataState>

        <div className="mt-10 flex flex-wrap gap-5 text-xs text-white/50 font-medium pb-8">
          <span className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5"><Check className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> Benefit privacy protected</span>
          <span className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5"><Clock3 className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> Human support when needed</span>
          <Link href="/support" className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10 hover:text-white transition-colors" data-testid="link-employee-support"><LifeBuoy className="h-3.5 w-3.5" /> Talk to Loup support</Link>
          <Link href="/billing" className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10 hover:text-white transition-colors" data-testid="link-employee-billing"><CreditCard className="h-3.5 w-3.5" /> View billing</Link>
        </div>
      </div>
    </PlatformShell>
  );
}
