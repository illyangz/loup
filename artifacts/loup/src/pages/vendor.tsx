import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  PackageCheck,
  Plus,
  TrendingUp,
  Trash2,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import {
  useGetProviderDashboard,
  getGetProviderDashboardQueryKey,
  useListProviderOrders,
  getListProviderOrdersQueryKey,
  useAcceptProviderOrder,
  useRejectProviderOrder,
  useAdvanceProviderOrder,
  useReportProviderOrderIssue,
  useListProviderAvailability,
  getListProviderAvailabilityQueryKey,
  useCreateProviderAvailability,
  useDeleteProviderAvailability,
  useGetProviderAnalytics,
  getGetProviderAnalyticsQueryKey,
  useGetProviderSettlement,
  getGetProviderSettlementQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { PlatformShell } from "@/components/platform-shell";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";
import gsap from "gsap";

// ── Helpers ───────────────────────────────────────────────────────────────────
function money(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(v);
}
function pct(v: number) { return `${v.toFixed(1)}%`; }
function timeStr(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
function dateStr(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const STATUS_BADGE: Record<string, string> = {
  pending:     "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  accepted:    "bg-secondary text-foreground border-border",
  confirmed:   "bg-secondary text-foreground border-border",
  en_route:    "bg-blue-500/15 text-blue-400 border-blue-500/25",
  arrived:     "bg-blue-400/15 text-blue-300 border-blue-400/25",
  in_progress: "bg-secondary text-foreground border-border",
  completed:   "bg-secondary text-muted-foreground border-border",
  rejected:    "bg-destructive/10 text-destructive border-destructive/20",
  cancelled:   "bg-muted text-muted-foreground border-border/40",
  disputed:    "bg-orange-500/15 text-orange-400 border-orange-500/25",
};

const STATUS_LABEL: Record<string, string> = {
  pending:     "Pending",
  accepted:    "Accepted",
  confirmed:   "Confirmed",
  en_route:    "En Route",
  arrived:     "Arrived",
  in_progress: "In Progress",
  completed:   "Completed",
  rejected:    "Rejected",
  cancelled:   "Cancelled",
  disputed:    "Disputed",
};

const NEXT_ACTION_LABEL: Record<string, string> = {
  accepted:  "Confirm Availability",
  confirmed: "Mark On the Way",
  en_route:  "Mark Arrived",
  arrived:   "Mark Started",
  in_progress: "Mark Completed",
};

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = "dashboard" | "orders" | "availability" | "analytics" | "settlement";
const TABS: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: "dashboard",    label: "Dashboard",    icon: BarChart3  },
  { id: "orders",       label: "Orders",       icon: PackageCheck },
  { id: "availability", label: "Availability", icon: Calendar   },
  { id: "analytics",   label: "Analytics",    icon: TrendingUp },
  { id: "settlement",  label: "Settlement",   icon: Wallet     },
];

// ── Order card ────────────────────────────────────────────────────────────────
type OrderScope = "pending" | "active" | "upcoming" | "completed" | "rejected";

interface ProviderOrderCardProps {
  order: {
    id: number;
    serviceName: string;
    categoryName: string;
    memberName: string;
    addressLabel: string;
    zone: string;
    scheduledAt: string;
    status: string;
    priceEstimate: number;
    instructions?: string | null;
    etaMinutes?: number | null;
  };
  scope: OrderScope;
  onRefresh: () => void;
}

function OrderCard({ order, scope, onRefresh }: ProviderOrderCardProps) {
  const qc = useQueryClient();
  const [showRejectForm, setShowRejectForm]  = useState(false);
  const [showIssueForm,  setShowIssueForm]   = useState(false);
  const [rejectReason,   setRejectReason]    = useState("");
  const [issueDesc,      setIssueDesc]       = useState("");

  const refetchAll = () => {
    void qc.invalidateQueries({ queryKey: getListProviderOrdersQueryKey() });
    void qc.invalidateQueries({ queryKey: getGetProviderDashboardQueryKey() });
    onRefresh();
  };

  const accepter  = useAcceptProviderOrder({ mutation: { onSuccess: refetchAll } });
  const rejecter  = useRejectProviderOrder({ mutation: { onSuccess: () => { setShowRejectForm(false); refetchAll(); } } });
  const advancer  = useAdvanceProviderOrder({ mutation: { onSuccess: refetchAll } });
  const reporter  = useReportProviderOrderIssue({ mutation: { onSuccess: () => { setShowIssueForm(false); refetchAll(); } } });

  const nextActionLabel = NEXT_ACTION_LABEL[order.status];
  const isWorking = accepter.isPending || rejecter.isPending || advancer.isPending || reporter.isPending;

  return (
    <div className="rounded-lg border border-border/50 bg-background/40 backdrop-blur-sm overflow-hidden transition-all hover:-translate-y-0.5 hover:border-primary/40" data-testid={`card-order-${order.id}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-[14px]">{order.serviceName}</p>
            <span className={cn("inline-flex rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", STATUS_BADGE[order.status] ?? "bg-muted text-muted-foreground border-border")}>
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 mt-1.5 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{dateStr(order.scheduledAt)} · {timeStr(order.scheduledAt)}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{order.addressLabel} · {order.zone}</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{order.memberName}</span>
          </div>
          {order.instructions && (
            <p className="mt-2 text-[12px] text-muted-foreground/80 italic leading-relaxed line-clamp-2">{order.instructions}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-semibold text-[15px] text-foreground">{money(order.priceEstimate)}</p>
          <p className="text-[11px] text-muted-foreground">#{order.id}</p>
        </div>
      </div>

      {/* Action bar */}
      {scope !== "completed" && scope !== "rejected" && (
        <div className="px-4 pb-4 flex flex-wrap gap-2 border-t border-border/30 pt-3">
          {/* Pending: Accept / Reject */}
          {scope === "pending" && (
            <>
              <button
                type="button"
                disabled={isWorking}
                onClick={() => accepter.mutate({ id: order.id })}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
                data-testid={`button-accept-${order.id}`}
              >
                {accepter.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Accept
              </button>
              <button
                type="button"
                disabled={isWorking}
                onClick={() => setShowRejectForm(v => !v)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded border border-destructive/40 px-3.5 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                data-testid={`button-reject-toggle-${order.id}`}
              >
                <X className="h-3.5 w-3.5" /> Reject
              </button>
            </>
          )}

          {/* Active: Next status advance */}
          {nextActionLabel && (scope === "active" || scope === "upcoming") && (
            <button
              type="button"
              disabled={isWorking}
              onClick={() => advancer.mutate({ id: order.id })}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded bg-foreground px-3.5 py-2 text-sm font-medium text-background disabled:opacity-50 hover:bg-foreground/90 transition-colors"
              data-testid={`button-advance-${order.id}`}
            >
              {advancer.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronRight className="h-3.5 w-3.5" />} {nextActionLabel}
            </button>
          )}

          {/* Report issue (any active order) */}
          {(scope === "active" || scope === "upcoming") && (
            <button
              type="button"
              disabled={isWorking}
              onClick={() => setShowIssueForm(v => !v)}
              className="inline-flex items-center gap-1.5 rounded border border-border/50 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent/30 transition-colors disabled:opacity-50"
              data-testid={`button-issue-toggle-${order.id}`}
            >
              <AlertTriangle className="h-3 w-3" /> Report issue
            </button>
          )}
        </div>
      )}

      {/* Reject form */}
      {showRejectForm && (
        <div className="px-4 pb-4 border-t border-border/30 pt-3 bg-destructive/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-destructive mb-2">Reason for rejection</p>
          <div className="flex gap-2">
            <input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Optional — customer will be notified" className="flex-1 input-std text-sm" data-testid={`input-reject-reason-${order.id}`} />
            <button type="button" disabled={rejecter.isPending} onClick={() => rejecter.mutate({ id: order.id, data: rejectReason ? { reason: rejectReason } : {} })} className="rounded bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50" data-testid={`button-reject-confirm-${order.id}`}>
              {rejecter.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm"}
            </button>
          </div>
        </div>
      )}

      {/* Issue form */}
      {showIssueForm && (
        <div className="px-4 pb-4 border-t border-border/30 pt-3 bg-orange-500/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-400 mb-2">Describe the issue</p>
          <div className="flex gap-2">
            <input value={issueDesc} onChange={e => setIssueDesc(e.target.value)} placeholder="What's wrong with this booking?" className="flex-1 input-std text-sm" data-testid={`input-issue-desc-${order.id}`} />
            <button type="button" disabled={reporter.isPending || !issueDesc} onClick={() => reporter.mutate({ id: order.id, data: { description: issueDesc } })} className="rounded bg-orange-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-50" data-testid={`button-issue-confirm-${order.id}`}>
              {reporter.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Submit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dashboard tab ─────────────────────────────────────────────────────────────
function DashboardTab({ onViewOrders }: { onViewOrders: () => void }) {
  const dash = useGetProviderDashboard({ query: { queryKey: getGetProviderDashboardQueryKey() } });
  const pending = useListProviderOrders(
    { scope: "pending" },
    { query: { queryKey: getListProviderOrdersQueryKey({ scope: "pending" }), enabled: !dash.isLoading && !dash.isError } }
  );

  const kpiRef = useRef<HTMLDivElement>(null);
  const perfRef = useRef<HTMLDivElement>(null);
  const perfBarsRef = useRef<HTMLDivElement>(null);
  const pendingListRef = useRef<HTMLDivElement>(null);
  useReveal(kpiRef, { stagger: true, y: 12, immediate: true });
  useReveal(perfRef, { stagger: true, y: 12, immediate: true, delay: 0.1 });
  useReveal(pendingListRef, { stagger: true, y: 10, deps: [pending.data] });

  // Performance bars: grow each metric's fill from 0 to its real width once the card is on screen.
  useEffect(() => {
    if (!perfBarsRef.current || !dash.data) return;
    const el = perfBarsRef.current;
    const bars = Array.from(el.querySelectorAll<HTMLElement>("[data-perf-bar]"));
    const ctx = gsap.context(() => {
      gsap.fromTo(
        bars,
        { width: "0%" },
        {
          width: (i: number) => bars[i].dataset.perfBar ?? "0%",
          duration: 0.7,
          stagger: 0.08,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        }
      );
    }, el);
    return () => ctx.revert();
  }, [dash.data]);

  if (dash.isLoading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />)}</div>;
  if (dash.isError) return <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center"><p className="text-destructive text-sm">Dashboard data unavailable</p><button type="button" onClick={() => dash.refetch()} className="mt-3 text-xs text-primary hover:underline">Retry</button></div>;

  const d = dash.data!;
  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div ref={kpiRef} className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-muted rounded-lg overflow-hidden border border-border">
        {[
          { label: "Pending",   value: String(d.pendingCount),   sub: "awaiting acceptance" },
          { label: "Active",    value: String(d.acceptedCount + d.confirmedCount + d.activeCount), sub: "accepted + confirmed + live" },
          { label: "This month", value: String(d.completedThisMonth), sub: `${d.cancelledThisMonth} cancelled` },
          { label: "Settlement est.", value: money(d.estimatedSettlement), sub: "completed bookings" },
        ].map((item, i) => (
          <div key={i} className="bg-background/60 px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">{item.label}</p>
            <p className="mt-1.5 text-[1.6rem] leading-none font-semibold tabular-nums text-foreground">{item.value}</p>
            {item.sub && <p className="mt-1 text-[11px] text-muted-foreground">{item.sub}</p>}
          </div>
        ))}
      </div>

      {/* Performance metrics */}
      <div ref={perfRef} className="glass-card rounded-lg p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-5">Performance</p>
        <div ref={perfBarsRef} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Avg rating",     value: `${d.averageRating.toFixed(1)} / 5`, bar: d.averageRating / 5 },
            { label: "Fulfilment",     value: pct(d.fulfilmentRate),               bar: d.fulfilmentRate / 100 },
            { label: "Cancellation",   value: pct(d.cancellationRate),             bar: d.cancellationRate / 100, inverted: true },
            { label: "SLA (15-min)",   value: pct(d.slaRate),                      bar: d.slaRate / 100 },
          ].map(item => (
            <div key={item.label} className="rounded-lg bg-accent/20 p-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium">{item.label}</p>
              <p className="mt-1 text-[1.2rem] font-semibold tabular-nums">{item.value}</p>
              <div className="mt-2 h-1.5 rounded bg-muted">
                <div
                  className={cn("h-full rounded", item.inverted ? "bg-destructive/70" : "bg-primary")}
                  style={{ width: 0 }}
                  data-perf-bar={`${Math.min(100, item.bar * 100)}%`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Needs your attention — surfaces the same pending orders the Orders tab shows, so the dashboard is never a dead end */}
      <div className="glass-card rounded-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Needs your attention</p>
          {(pending.data?.length ?? 0) > 0 && (
            <button type="button" onClick={onViewOrders} className="text-xs font-medium text-primary hover:underline" data-testid="button-dashboard-view-orders">
              View all pending →
            </button>
          )}
        </div>
        {pending.isLoading ? (
          <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}</div>
        ) : (pending.data?.length ?? 0) === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-8 text-center">
            <CheckCircle2 className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">All caught up — no orders waiting on you.</p>
          </div>
        ) : (
          <div ref={pendingListRef} className="space-y-2">
            {pending.data!.slice(0, 3).map(order => (
              <button
                key={order.id}
                type="button"
                onClick={onViewOrders}
                className="w-full flex items-center justify-between gap-3 rounded-lg border border-border/50 px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent/20"
                data-testid={`row-dashboard-pending-${order.id}`}
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium truncate">{order.serviceName}</p>
                  <p className="text-[11px] text-muted-foreground">{dateStr(order.scheduledAt)} · {timeStr(order.scheduledAt)} · {order.memberName}</p>
                </div>
                <span className="shrink-0 text-[13px] font-semibold text-foreground">{money(order.priceEstimate)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SLA note */}
      <p className="text-[11px] text-muted-foreground/50">Settlement estimate is the sum of completed booking fees for the current billing period. Actual payout depends on Loup's settlement schedule and any applicable deductions.</p>
    </div>
  );
}

// ── Orders tab ────────────────────────────────────────────────────────────────
const ORDER_SCOPES: { id: OrderScope; label: string }[] = [
  { id: "pending",   label: "New" },
  { id: "upcoming",  label: "Upcoming" },
  { id: "active",    label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "rejected",  label: "Declined" },
];

function OrdersTab() {
  const [scope, setScope] = useState<OrderScope>("pending");
  const orders = useListProviderOrders(
    { scope },
    { query: { queryKey: getListProviderOrdersQueryKey({ scope }) } }
  );
  const listRef = useRef<HTMLDivElement>(null);
  useReveal(listRef, { stagger: true, y: 12, deps: [orders.data] });

  return (
    <div className="space-y-4">
      {/* Scope bar */}
      <div className="flex gap-1 rounded-lg bg-muted border border-border p-1 w-fit">
        {ORDER_SCOPES.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => setScope(s.id)}
            data-testid={`tab-orders-${s.id}`}
            className={cn(
              "rounded px-3.5 py-2 text-sm font-medium transition-all duration-150",
              scope === s.id ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Order list */}
      {orders.isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : orders.isError ? (
        <div className="rounded-lg border border-destructive/20 p-6 text-center"><p className="text-destructive text-sm">Failed to load orders</p><button type="button" onClick={() => orders.refetch()} className="mt-2 text-xs text-primary">Retry</button></div>
      ) : orders.data?.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center" data-testid={`empty-orders-${scope}`}>
          <PackageCheck className="mx-auto h-7 w-7 text-muted-foreground mb-2" />
          <p className="font-medium">{scope === "pending" ? "No new orders" : `No ${scope} orders`}</p>
          <p className="text-sm text-muted-foreground mt-1">{scope === "pending" ? "New orders will appear here when customers book." : "Nothing to show here right now."}</p>
        </div>
      ) : (
        <div ref={listRef} className="space-y-3">
          {orders.data?.map(order => (
            <OrderCard key={order.id} order={order} scope={scope} onRefresh={() => void orders.refetch()} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Availability tab ──────────────────────────────────────────────────────────
const DUBAI_ZONES = ["Jumeirah 3", "Downtown Dubai", "Dubai Hills", "Al Qouz", "Marina", "JBR", "Deira", "Business Bay"];

function AvailabilityTab() {
  const qc = useQueryClient();
  const slots   = useListProviderAvailability({ query: { queryKey: getListProviderAvailabilityQueryKey() } });
  const creator = useCreateProviderAvailability({ mutation: { onSuccess: () => { void qc.invalidateQueries({ queryKey: getListProviderAvailabilityQueryKey() }); setShowForm(false); resetForm(); } } });
  const deleter = useDeleteProviderAvailability({ mutation: { onSuccess: () => void qc.invalidateQueries({ queryKey: getListProviderAvailabilityQueryKey() }) } });

  const [showForm,   setShowForm]    = useState(false);
  const [dayOfWeek,  setDayOfWeek]   = useState(1);
  const [startTime,  setStartTime]   = useState("08:00");
  const [endTime,    setEndTime]     = useState("18:00");
  const [maxCap,     setMaxCap]      = useState(10);
  const [zones,      setZones]       = useState<string[]>(["Jumeirah 3", "Dubai Hills"]);
  const [deletingId, setDeletingId]  = useState<number | null>(null);

  const resetForm = () => { setDayOfWeek(1); setStartTime("08:00"); setEndTime("18:00"); setMaxCap(10); setZones(["Jumeirah 3", "Dubai Hills"]); };
  const toggleZone = (z: string) => setZones(prev => prev.includes(z) ? prev.filter(x => x !== z) : [...prev, z]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Weekly schedule</p>
        <button type="button" onClick={() => setShowForm(v => !v)} className="inline-flex items-center gap-1.5 rounded bg-foreground px-3.5 py-2 text-sm font-medium text-background hover:-translate-y-0.5 transition-all" data-testid="button-add-slot">
          <Plus className="h-3.5 w-3.5" /> Add slot
        </button>
      </div>

      {/* Add slot form */}
      {showForm && (
        <div className="rounded-lg border border-border bg-background/40 backdrop-blur-sm p-5 space-y-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="label-xs">Day</label>
              <select value={dayOfWeek} onChange={e => setDayOfWeek(parseInt(e.target.value))} className="input-std mt-1" data-testid="select-availability-day">
                {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label-xs">Start</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="input-std mt-1" data-testid="input-availability-start" />
            </div>
            <div>
              <label className="label-xs">End</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="input-std mt-1" data-testid="input-availability-end" />
            </div>
            <div>
              <label className="label-xs">Max capacity</label>
              <input type="number" min={1} max={50} value={maxCap} onChange={e => setMaxCap(parseInt(e.target.value) || 1)} className="input-std mt-1 w-24" data-testid="input-availability-capacity" />
            </div>
          </div>

          <div>
            <label className="label-xs mb-2 block">Service zones</label>
            <div className="flex flex-wrap gap-2">
              {DUBAI_ZONES.map(z => (
                <button
                  key={z}
                  type="button"
                  onClick={() => toggleZone(z)}
                  className={cn("rounded border px-3 py-1.5 text-xs font-medium transition-colors", zones.includes(z) ? "bg-primary border-primary/50 text-primary-foreground" : "border-border/50 text-muted-foreground hover:bg-accent/30")}
                  data-testid={`zone-toggle-${z.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  {z}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              disabled={creator.isPending || zones.length === 0}
              onClick={() => creator.mutate({ data: { dayOfWeek, startTime, endTime, zones, maxCapacity: maxCap } })}
              className="rounded bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              data-testid="button-create-slot"
            >
              {creator.isPending ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Create slot"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded border border-border/60 px-5 py-2 text-sm text-muted-foreground hover:bg-accent/30 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Slots list — grouped by day */}
      {slots.isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : slots.data?.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center" data-testid="empty-availability">
          <Calendar className="mx-auto h-7 w-7 text-muted-foreground mb-2" />
          <p className="font-medium">No slots configured</p>
          <p className="text-sm text-muted-foreground mt-1">Add availability slots so customers can book you on specific days.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {DAY_NAMES.map((dayName, dow) => {
            const daySlots = slots.data?.filter(s => s.dayOfWeek === dow) ?? [];
            if (!daySlots.length) return null;
            return (
              <div key={dow} className="rounded-lg border border-border/40 bg-background/30 overflow-hidden">
                <div className="px-5 py-3 border-b border-border/30 bg-accent/10">
                  <p className="font-medium text-[13px]">{dayName}</p>
                </div>
                <div className="divide-y divide-border/30">
                  {daySlots.map(slot => (
                    <div key={slot.id} className="flex items-center gap-4 px-5 py-3 hover:bg-accent/10 transition-colors" data-testid={`row-slot-${slot.id}`}>
                      <div className="flex-1 flex flex-wrap gap-3 text-[13px]">
                        <span className="font-medium">{slot.startTime} – {slot.endTime}</span>
                        <span className="text-muted-foreground">{slot.maxCapacity} slots</span>
                        <span className="text-muted-foreground">{slot.zones.join(", ")}</span>
                      </div>
                      <button
                        type="button"
                        disabled={deleter.isPending && deletingId === slot.id}
                        onClick={() => { setDeletingId(slot.id); deleter.mutate({ id: slot.id }); }}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded hover:bg-destructive/10"
                        data-testid={`button-delete-slot-${slot.id}`}
                      >
                        {deleter.isPending && deletingId === slot.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const serviceChartConfig: ChartConfig = { bookings: { label: "Bookings", color: "hsl(var(--primary))" } };
const dayChartConfig: ChartConfig = { bookings: { label: "Bookings", color: "hsl(var(--foreground) / 0.35)" } };

// ── Analytics tab ─────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const analytics = useGetProviderAnalytics({ query: { queryKey: getGetProviderAnalyticsQueryKey() } });

  if (analytics.isLoading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />)}</div>;
  if (analytics.isError) return <div className="rounded-lg border border-destructive/20 p-6 text-center text-sm text-destructive">Failed to load analytics</div>;

  const a = analytics.data!;

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-muted rounded-lg overflow-hidden border border-border">
        {[
          { label: "Completion",    value: pct(a.completionRate) },
          { label: "Avg rating",    value: `${a.averageRating.toFixed(1)} / 5` },
          { label: "Repeat rate",   value: pct(a.repeatBookingRate) },
          { label: "Capacity util.", value: pct(a.capacityUtilization), accent: "text-foreground" },
        ].map((kpi, i) => (
          <div key={i} className="bg-background/60 px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">{kpi.label}</p>
            <p className={cn("mt-1.5 text-[1.6rem] leading-none font-semibold tabular-nums", kpi.accent)}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Demand by service */}
        <div className="glass-card rounded-lg p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-5">Demand by service</p>
          {a.demandByService.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet</p>
          ) : (
            <ChartContainer config={serviceChartConfig} className="aspect-auto h-[240px] w-full">
              <BarChart data={a.demandByService.slice(0, 6)} layout="vertical" margin={{ left: 4, right: 12 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" hide />
                <YAxis dataKey="serviceName" type="category" tickLine={false} axisLine={false} width={128} tick={{ fontSize: 11 }} />
                <ChartTooltip
                  cursor={{ fill: "hsl(var(--accent))" }}
                  content={<ChartTooltipContent formatter={(value, _name, item) => `${value} bookings · ${money(item.payload.revenue)}`} hideLabel />}
                />
                <Bar dataKey="bookings" fill="var(--color-bookings)" radius={4} maxBarSize={22} />
              </BarChart>
            </ChartContainer>
          )}
        </div>

        {/* Demand by day of week */}
        <div className="glass-card rounded-lg p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-5">Demand by day</p>
          <ChartContainer config={dayChartConfig} className="aspect-auto h-[240px] w-full">
            <BarChart data={a.demandByDay} margin={{ left: -20 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="dayLabel" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(0, 3)} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
              <ChartTooltip cursor={{ fill: "hsl(var(--accent))" }} content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="bookings" fill="var(--color-bookings)" radius={4} maxBarSize={32} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>

      {/* Demand by zone */}
      {a.demandByZone.length > 0 && (
        <div className="glass-card rounded-lg p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-4">Geographic demand</p>
          <div className="flex flex-wrap gap-2">
            {a.demandByZone.map(item => (
              <div key={item.zone} className="flex items-center gap-2 rounded bg-accent/30 border border-border/30 px-3.5 py-2.5 min-w-[140px]">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[13px] font-medium">{item.zone}</p>
                  <p className="text-[11px] text-muted-foreground">{item.bookings} bookings</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Demand forecast */}
      <div className="glass-card rounded-lg p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1">Operational demand forecast</p>
            <p className="text-3xl font-semibold tabular-nums text-foreground">{a.forecast.estimate} <span className="text-lg font-normal text-muted-foreground">bookings</span></p>
            <p className="mt-2 text-[13px] text-muted-foreground">Confidence: {pct(a.forecast.confidence * 100)}</p>
          </div>
          <div className="shrink-0">
            <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
          </div>
        </div>
        <div className="mt-4 rounded bg-accent/20 border border-border/30 px-4 py-3">
          <p className="text-[11px] text-muted-foreground leading-relaxed">{a.forecast.method}</p>
          <p className="text-[10px] text-muted-foreground/50 mt-1">Last updated: {new Date(a.forecast.updatedAt).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function SettlementTab() {
  const settlement = useGetProviderSettlement({ query: { queryKey: getGetProviderSettlementQueryKey() } });

  if (settlement.isLoading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />)}</div>;
  if (settlement.isError) return <div className="rounded-lg border border-destructive/20 p-6 text-center text-sm text-destructive">Failed to load settlement</div>;

  const s = settlement.data!;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-muted rounded-lg overflow-hidden border border-border">
        <div className="bg-background/60 px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">Gross revenue · {s.cycleLabel}</p>
          <p className="mt-1.5 text-[1.6rem] leading-none font-semibold tabular-nums text-foreground">{money(s.grossRevenue)}</p>
        </div>
        <div className="bg-background/60 px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">Loup platform fee</p>
          <p className="mt-1.5 text-[1.6rem] leading-none font-semibold tabular-nums text-muted-foreground">− {money(s.platformFee)}</p>
        </div>
        <div className="bg-background/60 px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">Net payout</p>
          <p className="mt-1.5 text-[1.6rem] leading-none font-semibold tabular-nums text-foreground">{money(s.netPayout)}</p>
        </div>
      </div>

      <div className="glass-card rounded-lg overflow-hidden">
        <p className="px-6 pt-5 pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {s.bookingCount} completed booking{s.bookingCount === 1 ? "" : "s"} this cycle
        </p>
        {s.lines.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">No completed bookings yet this cycle.</p>
        ) : (
          <>
            {/* Cards below sm, real table sm+ */}
            <div className="sm:hidden space-y-3 px-6 pb-6">
              {s.lines.map(line => (
                <div key={line.bookingId} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-foreground">{line.serviceName}</p>
                    <p className="shrink-0 font-medium text-foreground">{money(line.netPayout)}</p>
                  </div>
                  <p className="mt-1 text-[13px] text-muted-foreground">{line.institutionName ?? "— (direct booking)"}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
                    <span>{dateStr(line.completedAt)}</span>
                    <span>Gross {money(line.grossAmount)}</span>
                    <span>{line.feeRatePct > 0 ? `Fee − ${money(line.platformFee)}` : "No fee"}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-t border-border text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                    {["Service", "Institution", "Completed", "Gross", "Fee", "Net"].map(h => <th key={h} className="px-6 py-3 font-medium">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {s.lines.map(line => (
                    <tr key={line.bookingId}>
                      <td className="px-6 py-3 font-medium text-foreground">{line.serviceName}</td>
                      <td className="px-6 py-3 text-muted-foreground">{line.institutionName ?? "— (direct booking)"}</td>
                      <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">{dateStr(line.completedAt)}</td>
                      <td className="px-6 py-3 text-foreground">{money(line.grossAmount)}</td>
                      <td className="px-6 py-3 text-muted-foreground">{line.feeRatePct > 0 ? `− ${money(line.platformFee)}` : "—"}</td>
                      <td className="px-6 py-3 font-medium text-foreground">{money(line.netPayout)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Root page ─────────────────────────────────────────────────────────────────
export default function Vendor() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const dash = useGetProviderDashboard({ query: { queryKey: getGetProviderDashboardQueryKey() } });
  const providerName = dash.data?.providerName ?? "Provider workspace";
  const pendingCount = dash.data?.pendingCount ?? 0;

  return (
    <PlatformShell role="provider">
      {/* Compact horizontal header + tabs */}
      <div className="mb-6 platform-reveal">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-secondary border border-border">
              <Building2 className="h-4.5 w-4.5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground leading-none">Service operations</p>
              <p className="mt-0.5 text-[17px] font-semibold text-foreground truncate leading-tight">{providerName}</p>
            </div>
            {pendingCount > 0 && (
              <span className="flex items-center gap-1 rounded bg-yellow-400/15 border border-yellow-400/30 px-2.5 py-0.5 text-[11px] font-semibold text-yellow-400">
                <Zap className="h-3 w-3" />{pendingCount} new
              </span>
            )}
          </div>

          {/* Tab bar */}
          <div className="flex gap-0.5 rounded-lg bg-muted border border-border p-1">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  data-testid={`tab-provider-${t.id}`}
                  className={cn(
                    "flex items-center gap-1.5 rounded px-3.5 py-2 text-sm font-medium transition-all duration-150",
                    tab === t.id
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 border-b border-border" />
      </div>

      {/* Tab content */}
      <div className="pt-1">
        {tab === "dashboard"    && <DashboardTab onViewOrders={() => setTab("orders")} />}
        {tab === "orders"       && <OrdersTab />}
        {tab === "availability" && <AvailabilityTab />}
        {tab === "analytics"    && <AnalyticsTab />}
        {tab === "settlement"   && <SettlementTab />}
      </div>
    </PlatformShell>
  );
}
