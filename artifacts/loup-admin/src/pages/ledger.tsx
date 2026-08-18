import { useState } from "react";
import { Layout } from "@/components/layout";
import { useLedger, useRefundLedgerEntry, useInstitutions } from "@/hooks/api-hooks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatAED, formatDateTime } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, History } from "lucide-react";

export default function Ledger() {
  const [instId, setInstId] = useState<number | undefined>();
  const { data: entries, isLoading } = useLedger(instId);
  const { data: institutions } = useInstitutions();
  const refundEntry = useRefundLedgerEntry();

  if (isLoading) return <Layout><div className="animate-pulse">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Allowance Ledger</h1>
            <p className="text-muted-foreground mt-2">Audit trail of all benefit transactions across the platform.</p>
          </div>
          <div className="flex gap-2">
            <select 
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

        <Card>
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
                        <ArrowUpRight className="h-4 w-4 mr-1 text-green-500" />
                      ) : (
                        <ArrowDownLeft className="h-4 w-4 mr-1 text-red-500" />
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
                    <span className={`font-medium ${entry.amount > 0 ? 'text-green-500' : ''}`}>
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
