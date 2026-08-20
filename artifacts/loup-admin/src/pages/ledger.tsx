import { useMemo, useRef, useState } from "react";
import { Layout } from "@/components/layout";
import { useLedger, useRefundLedgerEntry, useInstitutions } from "@/hooks/api-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatAED, formatDateTime } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, History } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useReveal } from "@/hooks/use-reveal";

const ledgerChartConfig: ChartConfig = { amount: { label: "Amount", color: "hsl(var(--primary))" } };

export default function Ledger() {
  const [instId, setInstId] = useState<number | undefined>();
  const { data: entries, isLoading } = useLedger(instId);
  const { data: institutions } = useInstitutions();
  const refundEntry = useRefundLedgerEntry();

  const totalsChartData = useMemo(() => {
    const totals = (entries ?? []).reduce<Record<string, number>>((acc, e) => {
      acc[e.entryType] = (acc[e.entryType] ?? 0) + Math.abs(e.amount);
      return acc;
    }, {});
    return Object.entries(totals)
      .map(([type, amount]) => ({ type: type.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()), amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [entries]);

  const headerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  useReveal(headerRef, { y: 12, immediate: true });
  useReveal(chartRef, { y: 16, immediate: true, delay: 0.08 });
  useReveal(tableRef, { y: 16, immediate: true, delay: 0.14 });

  if (isLoading) return <Layout><div className="animate-pulse">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div ref={headerRef} className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl tracking-tight">Allowance Ledger</h1>
            <p className="text-muted-foreground mt-2">Audit trail of all benefit transactions across the platform.</p>
          </div>
          <div className="flex gap-2">
            <select
              className="h-9 rounded border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={instId || ""}
              onChange={(e) => setInstId(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">All Institutions</option>
              {institutions?.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
        </div>

        {totalsChartData.length > 0 && (
          <Card ref={chartRef}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Transaction volume by type</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={ledgerChartConfig} className="aspect-auto h-[160px] w-full">
                <BarChart data={totalsChartData} layout="vertical" margin={{ left: 4, right: 12 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="type" type="category" tickLine={false} axisLine={false} width={90} tick={{ fontSize: 12 }} />
                  <ChartTooltip cursor={{ fill: "hsl(var(--accent))" }} content={<ChartTooltipContent formatter={(value) => `${formatAED(Number(value))}`} hideLabel />} />
                  <Bar dataKey="amount" fill="var(--color-amount)" radius={4} maxBarSize={22} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Cards below sm, real table sm+ */}
        <div ref={tableRef} className="sm:hidden space-y-3">
          {entries?.map((entry) => (
            <Card key={entry.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{entry.employeeName}</div>
                  <div className="text-xs text-muted-foreground font-mono">#{entry.id.toString().padStart(6, '0')}</div>
                </div>
                <span className="shrink-0 font-medium text-foreground">
                  {entry.amount > 0 ? '+' : ''}{formatAED(entry.amount)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
                <span className="flex items-center capitalize">
                  {entry.amount > 0 ? <ArrowUpRight className="h-3.5 w-3.5 mr-1" /> : <ArrowDownLeft className="h-3.5 w-3.5 mr-1" />}
                  {entry.entryType.replace(/_/g, ' ')}
                </span>
                <span>{formatDateTime(entry.createdAt)}</span>
              </div>
              {entry.entryType === 'spend' && entry.amount < 0 && (
                <Button variant="outline" size="sm" className="mt-3" onClick={() => refundEntry.mutate(entry.id)} disabled={refundEntry.isPending}>
                  Refund
                </Button>
              )}
            </Card>
          ))}
        </div>
        <Card className="hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries?.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    #{entry.id.toString().padStart(6, '0')}
                    {entry.referenceId && (
                      <div className="mt-1 flex items-center text-[10px]">
                        <History className="h-3 w-3 mr-1" />
                        {entry.referenceType} #{entry.referenceId}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {entry.employeeName}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {entry.amount > 0 ? (
                        <ArrowUpRight className="h-4 w-4 mr-1 text-muted-foreground" />
                      ) : (
                        <ArrowDownLeft className="h-4 w-4 mr-1 text-muted-foreground" />
                      )}
                      <span className="capitalize">{entry.entryType.replace(/_/g, ' ')}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-medium text-foreground">
                      {entry.amount > 0 ? '+' : ''}{formatAED(entry.amount)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.entryType === 'spend' && entry.amount < 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refundEntry.mutate(entry.id)}
                        disabled={refundEntry.isPending}
                      >
                        Refund
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </Layout>
  );
}
