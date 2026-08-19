import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useOverview, useQualityFlags, useResolveQualityFlag } from "@/hooks/api-hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatAED, formatDateTime } from "@/lib/utils";
import { 
  Building2, 
  Users, 
  Calendar, 
  Wallet, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

export default function Overview() {
  const [, navigate] = useLocation();
  const { data: overview, isLoading: isOverviewLoading } = useOverview();
  const { data: flags, isLoading: isFlagsLoading } = useQualityFlags();
  const resolveFlag = useResolveQualityFlag();

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
          <h1 className="text-3xl font-bold tracking-tight">Platform Overview</h1>
          <p className="text-muted-foreground mt-2">Real-time pulse of the Loup ecosystem.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...kpis, monthlyFeeKpi].map((kpi, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.label}
                </CardTitle>
                <kpi.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">{kpi.trend}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Open Incidents alert card */}
        <Card
          className={`cursor-pointer transition-colors hover:bg-muted/50 ${openIncidentsCount > 0 ? "border-destructive/60" : ""}`}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                        Resolve Flag
                      </Button>
                    </div>
                  ))}
                  {flags.filter(f => f.status === "open").length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500/50" />
                      No open quality flags. The platform is healthy.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500/50" />
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
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Provider Capacity</span>
                  <span className="font-medium">{overview?.activeProviders || 0} Active</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[78%]" />
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">API Latency</span>
                  <span className="font-medium text-green-500">42ms</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-[15%]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
