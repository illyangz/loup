import { Layout } from "@/components/layout";
import { useAnalytics } from "@/hooks/api-hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatAED } from "@/lib/utils";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const CATEGORY_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a78bfa",
  "#c4b5fd",
  "#d946ef",
  "#f43f5e",
  "#fb7185",
  "#f97316",
];

function formatDay(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function Analytics() {
  const { data, isLoading } = useAnalytics();

  if (isLoading) {
    return (
      <Layout>
        <div className="h-full flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
        </div>
      </Layout>
    );
  }

  const bookingsPerDay = data?.bookingsPerDay ?? [];
  const revenueByCategory = data?.revenueByCategory ?? [];
  const redemptionByInstitution = data?.redemptionByInstitution ?? [];

  const totalBookings30d = bookingsPerDay.reduce((s, d) => s + d.count, 0);
  const totalRevenue = revenueByCategory.reduce((s, c) => s + c.revenue, 0);
  const avgRedemptionRate =
    redemptionByInstitution.length > 0
      ? redemptionByInstitution.reduce((s, i) => s + i.redemptionRate, 0) /
        redemptionByInstitution.length
      : 0;

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Booking volumes, revenue trends, and allowance redemption — last 30 days.
          </p>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Bookings (30 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalBookings30d}</div>
              <p className="text-xs text-muted-foreground mt-1">Across all categories</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Billed Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatAED(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">From bill items</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Redemption Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{avgRedemptionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">Across institutions</p>
            </CardContent>
          </Card>
        </div>

        {/* Bookings per day chart */}
        <Card>
          <CardHeader>
            <CardTitle>Bookings per Day</CardTitle>
            <CardDescription>New bookings created each day over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bookingsPerDay} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bookingGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDay}
                    tick={{ fontSize: 11 }}
                    interval={4}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} className="text-muted-foreground" />
                  <Tooltip
                    labelFormatter={(v) => new Date(v as string).toLocaleDateString()}
                    formatter={(v: number) => [v, "Bookings"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#bookingGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by category */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Category</CardTitle>
              <CardDescription>Total billed amount per service category</CardDescription>
            </CardHeader>
            <CardContent>
              {revenueByCategory.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-muted-foreground text-sm border border-dashed rounded-lg">
                  No billing data yet
                </div>
              ) : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={revenueByCategory}
                      layout="vertical"
                      margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                        className="text-muted-foreground"
                      />
                      <YAxis
                        dataKey="categoryName"
                        type="category"
                        tick={{ fontSize: 11 }}
                        width={90}
                        className="text-muted-foreground"
                      />
                      <Tooltip
                        formatter={(v: number, _name, props) => [
                          formatAED(v),
                          `${props.payload.bookingCount} bookings`,
                        ]}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                        {revenueByCategory.map((_entry, i) => (
                          <Cell
                            key={i}
                            fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Redemption rate by institution */}
          <Card>
            <CardHeader>
              <CardTitle>Allowance Redemption by Institution</CardTitle>
              <CardDescription>Redeemed vs authorized allowance per institution</CardDescription>
            </CardHeader>
            <CardContent>
              {redemptionByInstitution.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-muted-foreground text-sm border border-dashed rounded-lg">
                  No ledger data yet
                </div>
              ) : (
                <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                  {redemptionByInstitution.map((inst) => (
                    <div key={inst.institutionId} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate max-w-[60%]" title={inst.institutionName}>
                          {inst.institutionName}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {inst.redemptionRate.toFixed(1)}%
                          <span className="text-xs ml-2">
                            ({formatAED(inst.redeemedAmount)} / {formatAED(inst.authorizedAmount)})
                          </span>
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.min(inst.redemptionRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
