import { useState } from "react";
import { Layout } from "@/components/layout";
import { useIncidents, useResolveIncident } from "@/hooks/api-hooks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatAED, formatDateTime } from "@/lib/utils";
import { AdminIncident } from "@/lib/api";
import { AlertTriangle } from "lucide-react";

const STATUS_VARIANTS: Record<string, "default" | "warning" | "success" | "destructive" | "secondary"> = {
  open: "destructive",
  investigating: "warning",
  resolved: "success",
  closed: "secondary",
};

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  quality: "Quality",
  billing: "Billing",
  safety: "Safety",
  other: "Other",
};

export default function Incidents() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [resolving, setResolving] = useState<AdminIncident | null>(null);
  const [resolution, setResolution] = useState("");

  const { data: incidents, isLoading } = useIncidents(statusFilter || undefined);
  const resolveIncident = useResolveIncident();

  function handleResolve(incident: AdminIncident) {
    setResolving(incident);
    setResolution("");
  }

  function handleConfirmResolve() {
    if (!resolving) return;
    resolveIncident.mutate(
      { id: resolving.id, status: "resolved", resolution: resolution || undefined },
      {
        onSuccess: () => {
          setResolving(null);
          setResolution("");
        },
      },
    );
  }

  function handleMarkInvestigating(id: number) {
    resolveIncident.mutate({ id, status: "investigating" });
  }

  if (isLoading) return <Layout><div className="animate-pulse">Loading...</div></Layout>;

  const openCount = incidents?.filter(i => i.status === "open").length ?? 0;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Support Incidents</h1>
            <p className="text-muted-foreground mt-2">
              Disputed bookings and provider-reported issues requiring admin action.
              {openCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-destructive font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {openCount} open {openCount === 1 ? "incident" : "incidents"}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {(["", "open", "investigating", "resolved", "closed"] as const).map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(s)}
              >
                {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Member / Provider</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reported</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents?.map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    #{incident.id.toString().padStart(4, "0")}
                  </TableCell>
                  <TableCell>
                    {incident.bookingId ? (
                      <div>
                        <div className="font-mono text-xs">#{incident.bookingId.toString().padStart(6, "0")}</div>
                        {incident.bookingStatus && (
                          <Badge variant="outline" className="text-xs mt-0.5">
                            {incident.bookingStatus}
                          </Badge>
                        )}
                        {incident.bookingPriceEstimate != null && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {formatAED(incident.bookingPriceEstimate)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{incident.memberName ?? incident.employeeName ?? "—"}</div>
                    {incident.providerName && (
                      <div className="text-xs text-muted-foreground">via {incident.providerName}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {CATEGORY_LABELS[incident.category] ?? incident.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm line-clamp-2">{incident.description}</p>
                    {incident.resolution && (
                      <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">
                        ✓ {incident.resolution}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[incident.status] ?? "secondary"}>
                      {incident.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(incident.createdAt)}
                    {incident.resolvedAt && (
                      <div className="text-xs mt-0.5">
                        Closed {formatDateTime(incident.resolvedAt)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {incident.status === "open" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkInvestigating(incident.id)}
                          disabled={resolveIncident.isPending}
                        >
                          Investigate
                        </Button>
                      )}
                      {(incident.status === "open" || incident.status === "investigating") && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleResolve(incident)}
                          disabled={resolveIncident.isPending}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {incidents?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No incidents found{statusFilter ? ` with status "${statusFilter}"` : ""}.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={!!resolving} onOpenChange={(open) => !open && setResolving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Incident #{resolving?.id.toString().padStart(4, "0")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium mb-1">{resolving?.description}</p>
              {resolving?.memberName && (
                <p className="text-muted-foreground text-xs">Member: {resolving.memberName}</p>
              )}
              {resolving?.providerName && (
                <p className="text-muted-foreground text-xs">Provider: {resolving.providerName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="resolution">Resolution note (optional)</Label>
              <Textarea
                id="resolution"
                placeholder="Describe how this incident was resolved…"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={3}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Resolving will close the incident and, if the booking was in <strong>disputed</strong> status, return it to <strong>confirmed</strong>.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolving(null)}>Cancel</Button>
            <Button onClick={handleConfirmResolve} disabled={resolveIncident.isPending}>
              {resolveIncident.isPending ? "Resolving…" : "Mark Resolved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
