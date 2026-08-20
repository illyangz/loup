import { useRef, useState } from "react";
import { Layout } from "@/components/layout";
import { useBookings, useUpdateBookingStatus } from "@/hooks/api-hooks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useReveal } from "@/hooks/use-reveal";
import { formatAED, formatDateTime } from "@/lib/utils";
import { Filter } from "lucide-react";

export default function Bookings() {
  const [filter, setFilter] = useState<string>("");
  const { data: bookings, isLoading } = useBookings(filter || undefined);
  const updateStatus = useUpdateBookingStatus();

  const headerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  useReveal(headerRef, { y: 12, immediate: true });
  useReveal(tableRef, { y: 16, immediate: true, delay: 0.1 });

  if (isLoading) return <Layout><div className="animate-pulse">Loading...</div></Layout>;

  const statusVariant = (status: string) =>
    status === "completed" ? "default" as const :
    status === "cancelled" ? "destructive" as const :
    "secondary" as const;

  return (
    <Layout>
      <div className="space-y-6">
        <div ref={headerRef} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl tracking-tight">Bookings Audit</h1>
            <p className="text-muted-foreground mt-2">Platform-wide overview of all service fulfillments.</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
            <Button variant={filter === "" ? "default" : "outline"} onClick={() => setFilter("")} size="sm">
              All
            </Button>
            <Button variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")} size="sm">
              Pending
            </Button>
            <Button variant={filter === "completed" ? "default" : "outline"} onClick={() => setFilter("completed")} size="sm">
              Completed
            </Button>
          </div>
        </div>

        {/* Cards below sm, real table sm+ */}
        <div ref={tableRef} className="sm:hidden space-y-3">
          {bookings?.map((booking) => (
            <Card key={booking.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{booking.memberName}</div>
                  <div className="text-xs text-muted-foreground font-mono">#{booking.id.toString().padStart(6, '0')}</div>
                </div>
                <Badge variant={statusVariant(booking.status)} className="shrink-0">{booking.status}</Badge>
              </div>
              <div className="mt-2">
                <div className="font-medium text-sm">{booking.serviceName}</div>
                <div className="text-xs text-muted-foreground">via {booking.providerName}</div>
              </div>
              <div className="mt-2 text-[13px] text-muted-foreground">{formatDateTime(booking.scheduledAt)}</div>
              {booking.status !== "cancelled" && booking.status !== "completed" && (
                <div className="mt-3 flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => updateStatus.mutate({ id: booking.id, status: "completed" })}>
                    Complete
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => updateStatus.mutate({ id: booking.id, status: "cancelled" })}>
                    Cancel
                  </Button>
                </div>
              )}
            </Card>
          ))}
          {bookings?.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
              No bookings found matching the current filter.
            </div>
          )}
        </div>

        <Card className="hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking ID</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Service & Provider</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings?.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    #{booking.id.toString().padStart(6, '0')}
                  </TableCell>
                  <TableCell className="font-medium">
                    {booking.memberName}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{booking.serviceName}</div>
                    <div className="text-xs text-muted-foreground">via {booking.providerName}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDateTime(booking.scheduledAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(booking.status)}>
                      {booking.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {booking.status !== "cancelled" && booking.status !== "completed" && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateStatus.mutate({ id: booking.id, status: "completed" })}
                        >
                          Complete
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => updateStatus.mutate({ id: booking.id, status: "cancelled" })}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {bookings?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No bookings found matching the current filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </Layout>
  );
}
