import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  useGetHousehold,
  useListHouseholdActivity,
  useListPackMessages,
  useSendPackMessage,
  useListServiceRequests,
  useCreateServiceRequest,
  useListProviders,
  useGetProvider,
  getListPackMessagesQueryKey,
  getListServiceRequestsQueryKey,
  getGetHomeSummaryQueryKey,
} from "@workspace/api-client-react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ServiceRequestCard } from "@/components/service-request-card"
import { usePushNotifications } from "@/hooks/use-push"
import { Users, Crown, CreditCard, Activity, CalendarCheck, MessageSquare, ShieldAlert, Send, Loader2, Plus, Bell, BellOff } from "lucide-react"

function NotificationsToggle() {
  const { toast } = useToast()
  const { supported, enabled, busy, permissionDenied, enable, disable } = usePushNotifications()

  if (!supported) return null

  const handleClick = async () => {
    try {
      if (enabled) {
        await disable()
        toast({ title: "Notifications off", description: "You won't get phone alerts from the pack." })
      } else {
        const ok = await enable()
        if (ok) {
          toast({ title: "Notifications on", description: "You'll get an alert for new pack messages and approval requests." })
        } else {
          toast({
            title: "Notifications blocked",
            description: "Allow notifications for Loup in your browser or phone settings, then try again.",
            variant: "destructive",
          })
        }
      }
    } catch {
      toast({ title: "Couldn't update notifications", description: "Please try again.", variant: "destructive" })
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={busy}
      className="gap-2"
      title={permissionDenied ? "Notifications are blocked in your browser settings" : undefined}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : enabled ? (
        <Bell className="h-4 w-4 text-primary" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
      {enabled ? "Alerts on" : "Alerts off"}
    </Button>
  )
}

function PackThread() {
  const queryClient = useQueryClient()
  const { data: messages, isLoading } = useListPackMessages({
    query: { refetchInterval: 4000, queryKey: getListPackMessagesQueryKey() },
  })
  const sendMessage = useSendPackMessage()
  const [body, setBody] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages?.length])

  // Fetching messages marks them read server-side; refresh the summary so nav badges clear
  useEffect(() => {
    if (messages) {
      queryClient.invalidateQueries({ queryKey: getGetHomeSummaryQueryKey() })
    }
  }, [messages, queryClient])

  const handleSend = () => {
    const trimmed = body.trim()
    if (!trimmed || sendMessage.isPending) return
    sendMessage.mutate({ data: { body: trimmed } }, {
      onSuccess: () => {
        setBody("")
        queryClient.invalidateQueries({ queryKey: getListPackMessagesQueryKey() })
        queryClient.invalidateQueries({ queryKey: getGetHomeSummaryQueryKey() })
      },
    })
  }

  return (
    <Card className="border-border">
      <CardContent className="p-0 flex flex-col h-[440px]">
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="flex gap-3"><Skeleton className="h-9 w-9 rounded-full" /><div className="space-y-2 flex-1"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-2/3" /></div></div>
            ))
          ) : messages?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No messages yet — say hi to the pack</p>
          ) : (
            messages?.map(msg => (
              <div key={msg.id} className={`flex items-start gap-3 ${msg.isCurrentUser ? "flex-row-reverse" : ""}`}>
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className={msg.isCurrentUser ? "bg-primary text-primary-foreground text-xs" : "bg-secondary text-primary text-xs"}>
                    {msg.initials}
                  </AvatarFallback>
                </Avatar>
                <div className={`max-w-[80%] rounded-2xl border p-3.5 ${msg.isCurrentUser ? "bg-primary/10 border-primary/20 rounded-tr-none" : "bg-secondary/40 border-border/50 rounded-tl-none"}`}>
                  <div className="flex items-baseline justify-between gap-4 mb-1">
                    <span className="text-sm font-medium">{msg.isCurrentUser ? "You" : msg.memberName.split(" ")[0]}</span>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                      {new Date(msg.sentAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/85 leading-relaxed">{msg.body}</p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
        <div className="p-4 border-t border-border flex gap-2">
          <Input
            placeholder="Message the pack…"
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
          />
          <Button size="icon" onClick={handleSend} disabled={!body.trim() || sendMessage.isPending}>
            {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function RequestServiceDialog() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [providerId, setProviderId] = useState<number | null>(null)
  const [serviceId, setServiceId] = useState<number | null>(null)
  const [note, setNote] = useState("")

  const { data: providers } = useListProviders(undefined, { query: { enabled: open, queryKey: ["listProviders"] as const } })
  const { data: provider } = useGetProvider(providerId ?? 0, {
    query: { enabled: open && !!providerId, queryKey: ["getProvider", providerId] as const },
  })
  const createRequest = useCreateServiceRequest()

  const reset = () => { setProviderId(null); setServiceId(null); setNote("") }

  const submit = () => {
    if (!serviceId || !note.trim()) return
    createRequest.mutate({ data: { serviceId, note: note.trim() } }, {
      onSuccess: () => {
        setOpen(false)
        reset()
        queryClient.invalidateQueries({ queryKey: getListServiceRequestsQueryKey() })
        queryClient.invalidateQueries({ queryKey: getGetHomeSummaryQueryKey() })
        toast({ title: "Request sent", description: "The head of household will review it." })
      },
      onError: () => toast({ title: "Couldn't send the request", variant: "destructive" }),
    })
  }

  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) reset() }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Plus className="h-4 w-4" /> Request a service</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">Request a service</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={providerId ? String(providerId) : ""} onValueChange={v => { setProviderId(Number(v)); setServiceId(null) }}>
            <SelectTrigger><SelectValue placeholder="Choose a provider" /></SelectTrigger>
            <SelectContent>
              {providers?.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name} — {p.categoryName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={serviceId ? String(serviceId) : ""} onValueChange={v => setServiceId(Number(v))} disabled={!provider}>
            <SelectTrigger><SelectValue placeholder={providerId ? "Choose a service" : "Pick a provider first"} /></SelectTrigger>
            <SelectContent>
              {provider?.services.map(s => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name} — {s.price} AED</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Why do you need it? e.g. “My room's AC is barely cooling”"
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={!serviceId || !note.trim() || createRequest.isPending}>
            {createRequest.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Send for approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Household() {
  const { data: household, isLoading: isLoadingHousehold } = useGetHousehold()
  const { data: activity, isLoading: isLoadingActivity } = useListHouseholdActivity()
  const { data: requests, isLoading: isLoadingRequests } = useListServiceRequests()

  const pending = requests?.filter(r => r.status === "pending") ?? []
  const decided = requests?.filter(r => r.status !== "pending") ?? []

  const getActivityIcon = (kind: string) => {
    switch (kind) {
      case 'booking_created': return <CalendarCheck className="h-4 w-4 text-blue-500" />
      case 'booking_completed': return <CalendarCheck className="h-4 w-4 text-emerald-500" />
      case 'payment': return <CreditCard className="h-4 w-4 text-primary" />
      case 'review': return <MessageSquare className="h-4 w-4 text-amber-500" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-3xl font-serif tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            The Pack
          </h1>
          <NotificationsToggle />
        </div>
        <div className="text-muted-foreground mt-2">
          {isLoadingHousehold ? <Skeleton className="h-5 w-48" /> : `Manage ${household?.name} household`}
        </div>
      </header>

      {/* Family thread */}
      <section className="space-y-4">
        <h2 className="text-2xl font-serif tracking-tight flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" /> Pack thread
        </h2>
        <PackThread />
      </section>

      {/* Service requests */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-serif tracking-tight">Requests</h2>
          <div className="flex items-center gap-3">
            {pending.length > 0 && <Badge variant="secondary" className="text-primary">{pending.length} pending</Badge>}
            <RequestServiceDialog />
          </div>
        </div>
        {isLoadingRequests ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map(i => <Skeleton key={i} className="h-44 rounded-2xl" />)}
          </div>
        ) : requests?.length === 0 ? (
          <Card className="border-dashed bg-transparent shadow-none">
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              No requests yet — family members can request a service for approval here.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {pending.map(request => <ServiceRequestCard key={request.id} request={request} />)}
            </div>
            {decided.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Decided</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {decided.map(request => <ServiceRequestCard key={request.id} request={request} />)}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Members */}
      <section className="space-y-4">
        <h2 className="text-2xl font-serif tracking-tight">Members</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {isLoadingHousehold ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardContent className="p-5 flex gap-4"><Skeleton className="h-12 w-12 rounded-full" /><div className="space-y-2 flex-1"><Skeleton className="h-5 w-1/2" /><Skeleton className="h-4 w-1/3" /></div></CardContent></Card>
            ))
          ) : (
            household?.members.map(member => {
              const spendPercent = member.monthlySpendLimit 
                ? Math.min(100, Math.round((member.monthToDateSpend / member.monthlySpendLimit) * 100))
                : 0
              const isNearLimit = spendPercent >= 85

              return (
                <Card key={member.id} className={`border-border ${member.isCurrentUser ? 'border-primary/30 bg-primary/5' : ''}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                          <AvatarFallback className={member.role === 'head' || member.role === 'owner' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}>
                            {member.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{member.name}</h3>
                            {member.isCurrentUser && <Badge variant="secondary" className="text-[10px] h-5 px-1.5 py-0">You</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            {member.role === 'head' || member.role === 'owner' ? <Crown className="h-3 w-3 text-amber-500" /> : null}
                            {member.relation}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-border/50">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Month to date</span>
                        <span className="font-medium">{member.monthToDateSpend} AED</span>
                      </div>
                      
                      {member.monthlySpendLimit && (
                        <div className="space-y-1.5">
                          <Progress 
                            value={spendPercent} 
                            className={`h-2 ${isNearLimit ? '[&>div]:bg-destructive' : ''}`}
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{spendPercent}% used</span>
                            <span className="flex items-center gap-1">
                              {isNearLimit && <ShieldAlert className="h-3 w-3 text-destructive" />}
                              Limit: {member.monthlySpendLimit}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </section>

      {/* Activity Feed */}
      <section className="space-y-4">
        <h2 className="text-2xl font-serif tracking-tight">Recent Activity</h2>
        <Card>
          <CardContent className="p-0">
            {isLoadingActivity ? (
              <div className="p-6 space-y-6">
                {[1,2,3].map(i => <div key={i} className="flex gap-4"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-2 flex-1"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/4" /></div></div>)}
              </div>
            ) : activity?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No recent activity</div>
            ) : (
              <div className="divide-y divide-border">
                {activity?.map(item => (
                  <div key={item.id} className="p-4 sm:p-5 flex gap-4 hover:bg-secondary/20 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      {getActivityIcon(item.kind)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium text-foreground">{item.memberName}</span>
                        {' '}
                        <span className="text-muted-foreground">{item.description}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.occurredAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                        {item.amount && (
                          <>
                            <span className="text-muted-foreground/30">•</span>
                            <span className="text-xs font-medium text-foreground">{item.amount} AED</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
