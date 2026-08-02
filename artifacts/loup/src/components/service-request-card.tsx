import { useQueryClient } from "@tanstack/react-query"
import {
  useGetHomeSummary,
  useApproveServiceRequest,
  useDeclineServiceRequest,
  getListServiceRequestsQueryKey,
  getListPackMessagesQueryKey,
  getGetHomeSummaryQueryKey,
  getListBookingsQueryKey,
  type ServiceRequest,
} from "@workspace/api-client-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Check, Loader2 } from "lucide-react"

export function ServiceRequestCard({ request }: { request: ServiceRequest }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { data: summary } = useGetHomeSummary()
  const canDecide = summary?.isHeadOfHousehold ?? false
  const approve = useApproveServiceRequest()
  const decline = useDeclineServiceRequest()
  const busy = approve.isPending || decline.isPending

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getListServiceRequestsQueryKey() })
    queryClient.invalidateQueries({ queryKey: getListPackMessagesQueryKey() })
    queryClient.invalidateQueries({ queryKey: getGetHomeSummaryQueryKey() })
    queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() })
  }

  const firstName = request.memberName.split(" ")[0]

  return (
    <Card className="border-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="bg-secondary text-primary text-sm">{request.initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm">
                <span className="font-medium">{firstName}</span>{" "}
                <span className="text-muted-foreground">requested</span>
              </p>
              <p className="font-serif text-lg leading-tight truncate">{request.serviceName}</p>
              <p className="text-xs text-muted-foreground truncate">{request.providerName} · {request.categoryName}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">From</p>
            <p className="font-serif text-lg text-primary">{request.price} AED</p>
          </div>
        </div>

        <p className="text-[13px] italic text-foreground/80 bg-secondary/40 border border-border/50 rounded-xl p-3 mb-4">
          “{request.note}”
        </p>

        {request.status === "pending" && !canDecide ? (
          <p className="text-xs font-medium text-muted-foreground">Waiting for the head of household to decide</p>
        ) : request.status === "pending" ? (
          <div className="flex gap-2.5">
            <Button
              className="flex-1"
              disabled={busy}
              onClick={() =>
                approve.mutate(
                  { id: request.id },
                  {
                    onSuccess: () => {
                      refresh()
                      toast({ title: "Approved & booked", description: `${request.serviceName} booked for ${firstName} — tomorrow 10:00 AM.` })
                    },
                    onError: () => toast({ title: "Couldn't approve the request", variant: "destructive" }),
                  },
                )
              }
            >
              {approve.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Approve & book
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                decline.mutate(
                  { id: request.id },
                  {
                    onSuccess: () => {
                      refresh()
                      toast({ title: "Request declined", description: `${firstName} will see it in the pack thread.` })
                    },
                    onError: () => toast({ title: "Couldn't decline the request", variant: "destructive" }),
                  },
                )
              }
            >
              {decline.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Decline"}
            </Button>
          </div>
        ) : (
          <p className="text-xs font-medium text-muted-foreground">
            {request.status === "approved" ? "Approved & booked" : "Declined"}
            {request.decidedAt ? ` · ${new Date(request.decidedAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : ""}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
