import { useRef } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useOverview, useQualityFlags, useResolveQualityFlag, useProviders } from "@/hooks/api-hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useReveal } from "@/hooks/use-reveal";
import { cn, formatAED, formatDateTime } from "@/lib/utils";
import {
  Building2,
  Users,
  Calendar,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

function TrendTag({ trend }: { trend: string }) {
  const up = trend.startsWith("+");
  const down = trend.startsWith("-");
  if (!up && !down) return <p className="text-xs text-muted-foreground mt-1">{trend}</p>;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <p className={cn("mt-1 flex items-center gap-1 text-xs font-medium", up ? "text-muted-foreground" : "text-destructive")}>
      <Icon className="h-3 w-3" /> {trend}
    </p>
  );
}

export default function Overview() {
  const [, navigate] = useLocation();
  const { data: overview, isLoading: isOverviewLoading } = useOverview();
  const { data: flags, isLoading: isFlagsLoading } = useQualityFlags();
  const { data: providers } = useProviders();
  const resolveFlag = useResolveQualityFlag();

  const kpiGridRef = useRef<HTMLDivElement>(null);
  const incidentsRef = useRef<HTMLDivElement>(null);
  const detailGridRef = useRef<HTMLDivElement>(null);
  useReveal(kpiGridRef, { y: 12, stagger: true, immediate: true });
  useReveal(incidentsRef, { y: 12, immediate: true, delay: 0.1 });
  useReveal(detailGridRef, { y: 16, stagger: true });

  if (isOverviewLoading) {
    return (
      <Layout>
        <div className="h-full flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading platform metrics...</div>
        </div>
      </Layout>
    );
  }

  const openIncidentsCount = overview?.openIncidentsCount ?? 0;

  const kpis = [
    { label: "Active Institutions", value: overview?.totalInstitutions, icon: Building2, trend: "+2 this month" },
    { label: "Registered Employees", value: overview?.totalEmployees, icon: Users, trend: "+145 this week" },
    { label: "Today's Bookings", value: overview?.bookingsToday, icon: Calendar, trend: "4 pending" },
    { label: "Revenue Estimate", value: overview?.platformRevenueEstimate ? formatAED(overview.platformRevenueEstimate) : 0, icon: Wallet, trend: "+12% vs last month" },
  ];

  const feeLine = `${overview?.platformFeeRatePct ?? 8}% of redemptions${(overview?.perEmployeeMonthlyFee ?? 0) > 0 ? ` + AED ${overview?.perEmployeeMonthlyFee}/employee` : ""}`;
  const monthlyFeeKpi = {
    label: "Est. Monthly Platform Revenue",
    value: overview?.estimatedMonthlyPlatformRevenue ? formatAED(overview.estimatedMonthlyPlatformRevenue) : 0,
    icon: TrendingUp,
    trend: feeLine,
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="font-serif text-4xl font-normal tracking-[-0.02em] text-foreground">Platform Overview</h1>
          <p className="text-muted-foreground mt-3">Real-time pulse of the Loup ecosystem.</p>
        </div>

        <div ref={kpiGridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...kpis, monthlyFeeKpi].map((kpi, i) => (
            <Card key={i} className="transition-all hover:-translate-y-0.5 hover:border-primary/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.label}
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded bg-secondary">
                  <kpi.icon className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums text-foreground">{kpi.value || 0}</div>
                <TrendTag trend={kpi.trend} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Open Incidents alert card */}
        <Card
          ref={incidentsRef}
          className={`cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary/40 ${openIncidentsCount > 0 ? "border-destructive/60" : ""}`}
          onClick={() => navigate("/incidents?status=open")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <ShieldAlert className={`h-5 w-5 ${openIncidentsCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
            </div>
            {openIncidentsCount > 0 ? (
              <Badge variant="destructive">{openIncidentsCount} Open</Badge>
            ) : (
              <Badge variant="secondary">All Clear</Badge>
            )}
          </CardHeader>
          <CardContent>
            {openIncidentsCount > 0 ? (
              <p className="text-sm text-muted-foreground">
                {openIncidentsCount} incident{openIncidentsCount !== 1 ? "s" : ""} require attention. Click to review open and investigating incidents.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No open or investigating incidents. Platform support is healthy.</p>
            )}
          </CardContent>
        </Card>

        <div ref={detailGridRef} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Quality Command Center</CardTitle>
                  <CardDescription>Active flags requiring attention</CardDescription>
                </div>
                {overview && overview.qualityWarningsCount > 0 && (
                  <Badge variant="destructive" className="ml-auto">
                    {overview.qualityWarningsCount} Critical
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isFlagsLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1,2,3].map(i => <div key={i} className="h-16 bg-muted/50 rounded-lg" />)}
                </div>
              ) : flags && flags.length > 0 ? (
                <div className="space-y-4">
                  {flags.filter(f => f.status === "open").map(flag => (
                    <div key={flag.id} className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                        </div>
                        <div>
                          <div className="font-semibold">{flag.providerName}</div>
                          <div className="text-sm text-muted-foreground">
                            Flagged for {flag.flagType.replace(/_/g, ' ')} • Current: {flag.currentValue.toFixed(1)} (Threshold: {flag.threshold})
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Raised {formatDateTime(flag.createdAt)}
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => resolveFlag.mutate(flag.id)}
                        disabled={resolveFlag.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2 text-muted-foreground" />
                        Resolve Flag
                      </Button>
                    </div>
                  ))}
                  {flags.filter(f => f.status === "open").length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                      No open quality flags. The platform is healthy.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  No quality flags found.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {(() => {
                const totalProviders = providers?.length ?? 0;
                const activeProviders = overview?.activeProviders ?? 0;
                const capacityPct = totalProviders > 0 ? Math.round((activeProviders / totalProviders) * 100) : 0;
                const warningsCount = overview?.qualityWarningsCount ?? 0;
                const warningsPct = totalProviders > 0 ? Math.min(100, Math.round((warningsCount / totalProviders) * 100)) : 0;
                return (
                  <>
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Provider Capacity</span>
                        <span className="font-medium">{activeProviders} / {totalProviders} Active</span>
                      </div>
                      <Progress value={capacityPct} />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Quality Warnings</span>
                        <span className={cn("font-medium", warningsCount > 0 ? "text-destructive" : "text-muted-foreground")}>
                          {warningsCount} flagged
                        </span>
                      </div>
                      <Progress
                        value={warningsCount > 0 ? Math.max(warningsPct, 6) : 0}
                        className="bg-secondary [&>div]:bg-destructive"
                      />
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
