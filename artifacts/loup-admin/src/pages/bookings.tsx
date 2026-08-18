import { useState } from "react";
import { Layout } from "@/components/layout";
import { useBookings, useUpdateBookingStatus } from "@/hooks/api-hooks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatAED, formatDateTime } from "@/lib/utils";
import { Filter } from "lucide-react";

export default function Bookings() {
  const [filter, setFilter] = useState<string>("");
  const { data: bookings, isLoading } = useBookings(filter || undefined);
  const updateStatus = useUpdateBookingStatus();

  if (isLoading) return <Layout><div className="animate-pulse">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bookings Audit</h1>
            <p className="text-muted-foreground mt-2">Platform-wide overview of all service fulfillments.</p>
          </div>
          <div className="flex gap-2">
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

        <Card>
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
                    <Badge 
                      variant={
                        booking.status === "completed" ? "success" : 
                        booking.status === "cancelled" ? "destructive" : 
                        "warning"
                      }
                    >
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
