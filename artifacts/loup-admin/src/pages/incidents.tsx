import { useState } from "react";
import { useSearch } from "wouter";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatAED, formatDateTime } from "@/lib/utils";
import { AdminIncident, IncidentNote } from "@/lib/api";
import { useIncidents, useResolveIncident, useIncidentNotes, useAddIncidentNote, useAssignIncident } from "@/hooks/api-hooks";
import { Input } from "@/components/ui/input";
import { AlertTriangle, ChevronDown, ChevronRight, MessageSquare, Send, UserCheck, X } from "lucide-react";

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

function AssignControl({ incident }: { incident: AdminIncident }) {
  const assignIncident = useAssignIncident();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(incident.assigneeName ?? "");

  function handleOpen() {
    setDraft(incident.assigneeName ?? "");
    setEditing(true);
  }

  function handleSave() {
    const name = draft.trim() || null;
    assignIncident.mutate(
      { id: incident.id, assigneeName: name },
      { onSuccess: () => setEditing(false) },
    );
  }

  function handleUnassign() {
    assignIncident.mutate(
      { id: incident.id, assigneeName: null },
      { onSuccess: () => setEditing(false) },
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Team member name…"
          className="h-7 text-xs w-36"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <Button size="sm" className="h-7 px-2 text-xs" onClick={handleSave} disabled={assignIncident.isPending}>
          Save
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-1" onClick={() => setEditing(false)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  if (incident.assigneeName) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
          <UserCheck className="h-3.5 w-3.5" />
          {incident.assigneeName}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
          onClick={handleUnassign}
          disabled={assignIncident.isPending}
          title="Remove assignment"
        >
          <X className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-5 px-1 text-xs text-muted-foreground"
          onClick={handleOpen}
          disabled={assignIncident.isPending}
        >
          Change
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-6 px-2 text-xs text-muted-foreground"
      onClick={(e) => { e.stopPropagation(); handleOpen(); }}
      disabled={assignIncident.isPending || incident.status === "closed"}
    >
      <UserCheck className="h-3.5 w-3.5 mr-1" />
      Assign
    </Button>
  );
}
function NoteThread({ incidentId, incidentStatus }: { incidentId: number; incidentStatus: string }) {
  const { data: notes, isLoading } = useIncidentNotes(incidentId);
  const addNote = useAddIncidentNote();
  const [draft, setDraft] = useState("");

  function handleSubmit() {
    if (!draft.trim()) return;
    addNote.mutate(
      { id: incidentId, note: draft.trim() },
      { onSuccess: () => setDraft("") },
    );
  }

  const isTerminal = incidentStatus === "closed";

  return (
    <div className="space-y-3">
      {/* Existing notes */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground animate-pulse">Loading notes…</p>
      ) : notes && notes.length > 0 ? (
        <div className="space-y-2">
          {notes.map((n: IncidentNote) => (
            <div key={n.id} className="flex gap-2">
              <div className="flex-shrink-0 mt-0.5 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-3 w-3 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium capitalize">{n.authorRole}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">{n.note}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No notes yet.</p>
      )}

      {/* Add a note (always visible unless closed) */}
      {!isTerminal && (
        <div className="flex gap-2 pt-1">
          <Textarea
            placeholder="Add a note…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            className="flex-1 resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={addNote.isPending || !draft.trim()}
            className="self-end"
          >
            <Send className="h-3.5 w-3.5 mr-1" />
            Post
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Expandable incident row ────────────────────────────────────────────────

function IncidentRow({
  incident,
  onInvestigate,
  onResolve,
  isPending,
}: {
  incident: AdminIncident;
  onInvestigate: (id: number) => void;
  onResolve: (incident: AdminIncident) => void;
  isPending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/40"
        onClick={() => setExpanded((v) => !v)}
      >
        <TableCell className="w-6 px-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </TableCell>
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
        {/* Assignee column */}
        <TableCell onClick={(e) => e.stopPropagation()}>
          <AssignControl incident={incident} />
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {formatDateTime(incident.createdAt)}
          {incident.resolvedAt && (
            <div className="text-xs mt-0.5">
              Closed {formatDateTime(incident.resolvedAt)}
            </div>
          )}
        </TableCell>
        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-2">
            {incident.status === "open" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onInvestigate(incident.id)}
                disabled={isPending}
              >
                Investigate
              </Button>
            )}
            {(incident.status === "open" || incident.status === "investigating") && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onResolve(incident)}
                disabled={isPending}
              >
                Resolve
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={10} className="px-8 py-4">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Activity &amp; Notes
              </p>
              <NoteThread incidentId={incident.id} incidentStatus={incident.status} />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Incidents() {
  const search = useSearch();
  const initialStatus = new URLSearchParams(search).get("status") ?? "";
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
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
                <TableHead className="w-6" />
                <TableHead>ID</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Member / Provider</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Reported</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents?.map((incident) => (
                <IncidentRow
                  key={incident.id}
                  incident={incident}
                  onInvestigate={handleMarkInvestigating}
                  onResolve={handleResolve}
                  isPending={resolveIncident.isPending}
                />
              ))}
              {incidents?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
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
