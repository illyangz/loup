import { useEffect, useMemo, useRef, useState, useCallback } from "react"
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
  useCreateOpenaiConversation,
  useGetOpenaiConversation,
  getListPackMessagesQueryKey,
  getListServiceRequestsQueryKey,
  getGetHomeSummaryQueryKey,
  type OpenaiMessage,
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
import {
  Activity, Bell, BellOff, CalendarCheck, CheckCircle2, CreditCard,
  Crown, Loader2, MapPin, MessageSquare, Navigation, Plus,
  Send, ShieldAlert, Sparkles, Users, Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Dubai zone map data ────────────────────────────────────────────────────
const DUBAI_ZONES = [
  { id: "palm",       label: "Palm",         cx: 88,  cy: 155, r: 18 },
  { id: "jbr",        label: "JBR",          cx: 115, cy: 178, r: 14 },
  { id: "marina",     label: "Marina",       cx: 130, cy: 195, r: 16 },
  { id: "jlt",        label: "JLT",          cx: 148, cy: 210, r: 12 },
  { id: "dhills",     label: "Dubai Hills",  cx: 185, cy: 230, r: 20 },
  { id: "bbay",       label: "Business Bay", cx: 240, cy: 195, r: 16 },
  { id: "downtown",   label: "Downtown",     cx: 260, cy: 175, r: 18 },
  { id: "deira",      label: "Deira",        cx: 310, cy: 130, r: 16 },
  { id: "festival",   label: "Festival City",cx: 290, cy: 155, r: 13 },
  { id: "jumeirah",   label: "Jumeirah",     cx: 200, cy: 175, r: 14 },
]

// Household is in Dubai Hills; active service is approaching from Marina
const HOME_ZONE = "dhills"
const ACTIVE_PROVIDER_ZONE = "marina"

// ─── Simulated geo event stream ─────────────────────────────────────────────
type GeoEvent = {
  id: string
  kind: "proximity" | "arrival" | "started" | "done" | "zone-tip" | "system"
  title: string
  detail: string
  time: string
  accent: string // tailwind text colour
  icon: typeof Navigation
}

function buildGeoEvents(): GeoEvent[] {
  const now = new Date()
  const fmt = (d: Date) =>
    d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  const ago = (min: number) => {
    const d = new Date(now); d.setMinutes(d.getMinutes() - min); return d
  }
  return [
    {
      id: "geo-1",
      kind: "system",
      title: "Loup Live activated",
      detail: "Location intelligence is on for your household zone in Dubai Hills.",
      time: fmt(ago(62)),
      accent: "text-white/40",
      icon: Zap,
    },
    {
      id: "geo-2",
      kind: "zone-tip",
      title: "Zone insight · Dubai Hills",
      detail: "Home Cleaning demand is 38% higher than usual this week. Book before Wednesday to keep your preferred slot.",
      time: fmt(ago(45)),
      accent: "text-[hsl(var(--platform-mint))]",
      icon: MapPin,
    },
    {
      id: "geo-3",
      kind: "proximity",
      title: "Provider approaching",
      detail: "Marina Shine Cleaning · 3.2 km from your address · ETA ~18 min",
      time: fmt(ago(28)),
      accent: "text-[hsl(var(--primary))]",
      icon: Navigation,
    },
    {
      id: "geo-4",
      kind: "proximity",
      title: "Getting closer",
      detail: "Marina Shine Cleaning · 1.4 km · ETA ~7 min — Layla, you may want to open the gate.",
      time: fmt(ago(21)),
      accent: "text-[hsl(var(--primary))]",
      icon: Navigation,
    },
    {
      id: "geo-5",
      kind: "arrival",
      title: "Provider arrived",
      detail: "Marina Shine Cleaning checked in at your address in Dubai Hills.",
      time: fmt(ago(14)),
      accent: "text-[hsl(var(--platform-mint))]",
      icon: CheckCircle2,
    },
    {
      id: "geo-6",
      kind: "started",
      title: "Service in progress",
      detail: "Signature Deep Clean underway — estimated 2h 30m remaining.",
      time: fmt(ago(13)),
      accent: "text-[hsl(var(--platform-mint))]",
      icon: Activity,
    },
  ]
}

// ─── Dubai Zone Map ──────────────────────────────────────────────────────────
function DubaiZoneMap() {
  const [ping, setPing] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setPing(p => p + 1), 2200)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--platform-mint))] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(var(--platform-mint))]" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
            Loup Live · Dubai
          </span>
        </div>
        <span className="rounded-full border border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.08)] px-2.5 py-0.5 text-[10px] font-semibold text-[hsl(var(--primary))]">
          Service in progress
        </span>
      </div>

      {/* SVG Map */}
      <svg
        viewBox="60 110 310 160"
        className="w-full"
        style={{ height: 180 }}
        aria-label="Dubai zone map showing your household location"
        role="img"
      >
        {/* Subtle coastline hint */}
        <path
          d="M65,140 Q100,115 140,125 Q180,115 220,130 Q260,118 300,128 Q330,120 370,135"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1.5"
        />

        {/* Connecting lines between zones */}
        {DUBAI_ZONES.map((z, i) =>
          DUBAI_ZONES.slice(i + 1).map(z2 => {
            const dx = z.cx - z2.cx, dy = z.cy - z2.cy
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist > 80) return null
            return (
              <line
                key={`${z.id}-${z2.id}`}
                x1={z.cx} y1={z.cy} x2={z2.cx} y2={z2.cy}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="1"
              />
            )
          })
        )}

        {/* Zones */}
        {DUBAI_ZONES.map(zone => {
          const isHome = zone.id === HOME_ZONE
          const isActive = zone.id === ACTIVE_PROVIDER_ZONE
          return (
            <g key={zone.id}>
              {/* Pulse ring for home zone */}
              {isHome && (
                <circle
                  cx={zone.cx} cy={zone.cy}
                  r={zone.r + 10 + (ping % 3) * 2}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="1"
                  opacity={0.15 - (ping % 3) * 0.04}
                />
              )}
              {/* Provider zone glow */}
              {isActive && (
                <circle
                  cx={zone.cx} cy={zone.cy}
                  r={zone.r + 6}
                  fill="hsl(var(--platform-mint))"
                  opacity="0.08"
                />
              )}
              {/* Zone circle */}
              <circle
                cx={zone.cx} cy={zone.cy}
                r={zone.r}
                fill={
                  isHome
                    ? "hsl(var(--primary) / 0.18)"
                    : isActive
                    ? "hsl(var(--platform-mint) / 0.12)"
                    : "rgba(255,255,255,0.04)"
                }
                stroke={
                  isHome
                    ? "hsl(var(--primary) / 0.6)"
                    : isActive
                    ? "hsl(var(--platform-mint) / 0.5)"
                    : "rgba(255,255,255,0.08)"
                }
                strokeWidth={isHome || isActive ? 1.5 : 1}
              />
              {/* Home pin */}
              {isHome && (
                <text
                  x={zone.cx} y={zone.cy + 1.5}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize="9" fill="hsl(var(--primary))"
                  fontWeight="700"
                >
                  ⌂
                </text>
              )}
              {/* Label */}
              <text
                x={zone.cx}
                y={zone.cy + zone.r + 9}
                textAnchor="middle"
                fontSize="6.5"
                fill={
                  isHome
                    ? "hsl(var(--primary))"
                    : isActive
                    ? "hsl(var(--platform-mint))"
                    : "rgba(255,255,255,0.35)"
                }
                fontWeight={isHome || isActive ? "600" : "400"}
              >
                {zone.label}
              </text>
            </g>
          )
        })}

        {/* Provider movement trail */}
        <line
          x1={DUBAI_ZONES.find(z => z.id === ACTIVE_PROVIDER_ZONE)!.cx}
          y1={DUBAI_ZONES.find(z => z.id === ACTIVE_PROVIDER_ZONE)!.cy}
          x2={DUBAI_ZONES.find(z => z.id === HOME_ZONE)!.cx}
          y2={DUBAI_ZONES.find(z => z.id === HOME_ZONE)!.cy}
          stroke="hsl(var(--platform-mint))"
          strokeWidth="1"
          strokeDasharray="4 3"
          opacity="0.35"
        />

        {/* Moving provider dot */}
        <circle cx="162" cy="213" r="4"
          fill="hsl(var(--platform-mint))" opacity="0.9" />
        <circle cx="162" cy="213" r="7"
          fill="none" stroke="hsl(var(--platform-mint))"
          strokeWidth="1" opacity="0.4" />
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 pb-3 pt-1">
        <span className="flex items-center gap-1.5 text-[10px] text-white/40">
          <span className="h-2 w-2 rounded-full border border-[hsl(var(--primary)/0.6)] bg-[hsl(var(--primary)/0.18)]" />
          Your home
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-white/40">
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--platform-mint))]" />
          Marina Shine · en route
        </span>
        <span className="ml-auto text-[10px] text-white/25">Dubai Hills zone</span>
      </div>
    </div>
  )
}

// ─── Unified Geo + Message Feed ──────────────────────────────────────────────
type FeedItem =
  | { kind: "message"; id: number; memberName: string; initials: string; isCurrentUser: boolean; body: string; sentAt: string }
  | (GeoEvent & { kind: GeoEvent["kind"] })

function GeoEventCard({ event }: { event: GeoEvent }) {
  const Icon = event.icon
  const isProximity = event.kind === "proximity"
  const isArrival   = event.kind === "arrival" || event.kind === "started"
  const isDone      = event.kind === "done"
  const isSystem    = event.kind === "system"

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border px-4 py-3 text-sm",
        isProximity && "border-[hsl(var(--primary)/0.2)] bg-[hsl(var(--primary)/0.06)]",
        isArrival   && "border-[hsl(var(--platform-mint)/0.2)] bg-[hsl(var(--platform-mint)/0.06)]",
        isDone      && "border-[hsl(var(--platform-plum)/0.2)] bg-[hsl(var(--platform-plum)/0.06)]",
        isSystem    && "border-white/[0.05] bg-white/[0.02]",
        !isProximity && !isArrival && !isDone && !isSystem && "border-[hsl(var(--platform-mint)/0.15)] bg-[hsl(var(--platform-mint)/0.04)]",
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", event.accent)} />
      <div className="min-w-0 flex-1">
        <p className={cn("text-[11px] font-semibold uppercase tracking-[0.12em]", event.accent)}>
          {event.title}
        </p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-white/60">{event.detail}</p>
      </div>
      <time className="shrink-0 pt-0.5 text-[10px] text-white/25">{event.time}</time>
    </div>
  )
}

function LoupLive() {
  const queryClient = useQueryClient()
  const { data: messages, isLoading } = useListPackMessages({
    query: { refetchInterval: 4000, queryKey: getListPackMessagesQueryKey() },
  })
  const sendMessage = useSendPackMessage()
  const [body, setBody] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const geoEvents = useMemo(() => buildGeoEvents(), [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages?.length])

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

  // Merge real messages + geo events into a single time-sorted feed
  const feed = useMemo((): FeedItem[] => {
    const msgs: FeedItem[] = (messages ?? []).map(m => ({
      kind: "message" as const,
      id: m.id,
      memberName: m.memberName,
      initials: m.initials,
      isCurrentUser: m.isCurrentUser,
      body: m.body,
      sentAt: m.sentAt,
    }))
    const geo: FeedItem[] = geoEvents.map(e => ({ ...e }))
    return [...msgs, ...geo].sort((a, b) => {
      const ta = a.kind === "message" ? new Date(a.sentAt).getTime() : new Date(a.time).getTime()
      const tb = b.kind === "message" ? new Date(b.sentAt).getTime() : new Date(b.time).getTime()
      return ta - tb
    })
  }, [messages, geoEvents])

  return (
    <div className="flex flex-col gap-4">
      {/* Zone map */}
      <DubaiZoneMap />

      {/* Unified feed */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">Pack · Live feed</p>
          <span className="text-[10px] text-white/25">Geo + messages</span>
        </div>

        <div className="flex h-[360px] flex-col overflow-y-auto p-4 gap-3">
          {isLoading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="flex gap-3">
                <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-white/10" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
                </div>
              </div>
            ))
          ) : feed.length === 0 ? (
            <p className="py-10 text-center text-sm text-white/30">
              No activity yet — geo events and messages will appear here.
            </p>
          ) : (
            feed.map(item => {
              if (item.kind === "message") {
                return (
                  <div
                    key={`msg-${item.id}`}
                    className={cn("flex items-end gap-2.5", item.isCurrentUser && "flex-row-reverse")}
                  >
                    <div className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                      item.isCurrentUser
                        ? "bg-[hsl(var(--primary)/0.2)] text-[hsl(var(--primary))]"
                        : "bg-white/10 text-white/70",
                    )}>
                      {item.initials}
                    </div>
                    <div className={cn(
                      "max-w-[72%] rounded-2xl px-4 py-2.5",
                      item.isCurrentUser
                        ? "rounded-br-sm bg-[hsl(var(--primary)/0.15)] border border-[hsl(var(--primary)/0.2)]"
                        : "rounded-bl-sm bg-white/[0.05] border border-white/[0.07]",
                    )}>
                      {!item.isCurrentUser && (
                        <p className="mb-1 text-[10px] font-semibold text-white/40">
                          {item.memberName.split(" ")[0]}
                        </p>
                      )}
                      <p className="text-[13px] leading-relaxed text-white/80">{item.body}</p>
                      <p className="mt-1 text-[10px] text-white/25">
                        {new Date(item.sentAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                )
              }
              return <GeoEventCard key={item.id} event={item} />
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex gap-2 border-t border-white/[0.06] p-3">
          <input
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="Message the pack…"
            className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm text-white/80 placeholder:text-white/25 outline-none focus:border-[hsl(var(--primary)/0.4)] focus:ring-0 transition-colors"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!body.trim() || sendMessage.isPending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary))] text-black transition-opacity disabled:opacity-40"
          >
            {sendMessage.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Benefit Advisor (AI) ────────────────────────────────────────────────────
type AdvisorMessage = { role: "user" | "assistant"; content: string; streaming?: boolean }

const STARTER_PROMPTS = [
  "How do I get the most from my AED 295?",
  "What's the best combo for this month?",
  "How much does Nexa pay per booking?",
  "What services can I book right now?",
]

function BenefitAdvisor() {
  const createConv = useCreateOpenaiConversation()
  const [convId, setConvId] = useState<number | null>(null)
  const [messages, setMessages] = useState<AdvisorMessage[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [open, setOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load persisted messages when we have a convId
  const { data: convData } = useGetOpenaiConversation(convId ?? 0, {
    query: { enabled: !!convId, queryKey: ["openai-conv", convId] as const },
  })

  useEffect(() => {
    if (convData?.messages && messages.length === 0) {
      setMessages(
        convData.messages.map((m: OpenaiMessage) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      )
    }
  }, [convData])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streaming])

  const ensureConversation = useCallback(async (): Promise<number> => {
    if (convId) return convId
    return new Promise((resolve, reject) => {
      createConv.mutate(
        { data: { title: "Benefit optimizer" } },
        {
          onSuccess: (data) => { setConvId(data.id); resolve(data.id) },
          onError: reject,
        },
      )
    })
  }, [convId, createConv])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || streaming) return
    setInput("")
    setMessages(prev => [...prev, { role: "user", content: trimmed }])
    setStreaming(true)

    try {
      const id = await ensureConversation()
      const res = await fetch(`/api/openai/conversations/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      })
      if (!res.ok || !res.body) throw new Error("Stream failed")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantText = ""
      setMessages(prev => [...prev, { role: "assistant", content: "", streaming: true }])

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const raw = decoder.decode(value, { stream: true })
        for (const line of raw.split("\n")) {
          if (!line.startsWith("data: ")) continue
          try {
            const payload = JSON.parse(line.slice(6))
            if (payload.content) {
              assistantText += payload.content
              setMessages(prev => {
                const next = [...prev]
                next[next.length - 1] = { role: "assistant", content: assistantText, streaming: true }
                return next
              })
            }
            if (payload.done) {
              setMessages(prev => {
                const next = [...prev]
                next[next.length - 1] = { role: "assistant", content: assistantText }
                return next
              })
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong — please try again." }])
    } finally {
      setStreaming(false)
    }
  }, [streaming, ensureConversation])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[hsl(var(--platform-plum)/0.25)] bg-[hsl(var(--platform-plum)/0.05)] backdrop-blur-xl">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => {
          setOpen(o => !o)
          if (!open && messages.length === 0) sendMessage("How do I get the most from my AED 295 before 1 September?")
        }}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-white/[0.03]"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--platform-plum)/0.2)] border border-[hsl(var(--platform-plum)/0.3)]">
          <Sparkles className="h-4 w-4 text-[hsl(var(--platform-plum))]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--platform-plum))]">
            Benefit Advisor · AI
          </p>
          <p className="text-[13px] text-white/50 truncate">
            {messages.length === 0
              ? "Ask how to get the most from your AED 295 allowance"
              : messages[messages.length - 1]?.content.slice(0, 72) + "…"}
          </p>
        </div>
        <span className="text-[10px] text-white/25">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <>
          {/* Message thread */}
          <div className="flex h-[340px] flex-col gap-3 overflow-y-auto border-t border-[hsl(var(--platform-plum)/0.12)] p-4">
            {messages.length === 0 && streaming && (
              <div className="flex items-center gap-2 py-6 justify-center text-sm text-white/30">
                <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn("flex gap-2.5", msg.role === "user" && "flex-row-reverse")}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--platform-plum)/0.2)] border border-[hsl(var(--platform-plum)/0.3)]">
                    <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--platform-plum))]" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap",
                    msg.role === "user"
                      ? "rounded-br-sm bg-[hsl(var(--primary)/0.12)] border border-[hsl(var(--primary)/0.2)] text-white/80"
                      : "rounded-bl-sm bg-[hsl(var(--platform-plum)/0.08)] border border-[hsl(var(--platform-plum)/0.15)] text-white/75",
                  )}
                >
                  {msg.content}
                  {msg.streaming && (
                    <span className="ml-1 inline-block h-3 w-0.5 animate-pulse bg-[hsl(var(--platform-plum))] align-middle" />
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Starter prompts */}
          {messages.length <= 2 && (
            <div className="flex flex-wrap gap-2 px-4 pb-3">
              {STARTER_PROMPTS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => sendMessage(p)}
                  disabled={streaming}
                  className="rounded-full border border-[hsl(var(--platform-plum)/0.2)] bg-[hsl(var(--platform-plum)/0.06)] px-3 py-1 text-[11px] text-[hsl(var(--platform-plum))] transition hover:bg-[hsl(var(--platform-plum)/0.12)] disabled:opacity-40"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2 border-t border-[hsl(var(--platform-plum)/0.12)] p-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about your allowance…"
              className="min-w-0 flex-1 rounded-xl border border-[hsl(var(--platform-plum)/0.2)] bg-[hsl(var(--platform-plum)/0.06)] px-3.5 py-2.5 text-sm text-white/80 placeholder:text-white/25 outline-none focus:border-[hsl(var(--platform-plum)/0.5)] transition-colors"
            />
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || streaming}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--platform-plum))] text-white transition-opacity disabled:opacity-40"
            >
              {streaming
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Notifications Toggle ────────────────────────────────────────────────────
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
          toast({ title: "Notifications blocked", description: "Allow notifications for Loup in your browser or phone settings, then try again.", variant: "destructive" })
        }
      }
    } catch {
      toast({ title: "Couldn't update notifications", description: "Please try again.", variant: "destructive" })
    }
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy || !!permissionDenied}
      title={permissionDenied ? "Notifications are blocked in your browser settings" : undefined}
      className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[12px] text-white/60 transition hover:bg-white/[0.07] disabled:opacity-40"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : enabled ? <Bell className="h-4 w-4 text-[hsl(var(--primary))]" /> : <BellOff className="h-4 w-4" />}
      {enabled ? "Alerts on" : "Alerts off"}
    </button>
  )
}

// ─── Request Service Dialog ──────────────────────────────────────────────────
function RequestServiceDialog() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [providerId, setProviderId] = useState<number | null>(null)
  const [serviceId, setServiceId] = useState<number | null>(null)
  const [note, setNote] = useState("")
  const { data: providers } = useListProviders(undefined, { query: { enabled: open, queryKey: ["listProviders"] as const } })
  const { data: provider } = useGetProvider(providerId ?? 0, { query: { enabled: open && !!providerId, queryKey: ["getProvider", providerId] as const } })
  const createRequest = useCreateServiceRequest()
  const reset = () => { setProviderId(null); setServiceId(null); setNote("") }
  const submit = () => {
    if (!serviceId || !note.trim()) return
    createRequest.mutate({ data: { serviceId, note: note.trim() } }, {
      onSuccess: () => {
        setOpen(false); reset()
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
        <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Request a service</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Request a service</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Select value={providerId ? String(providerId) : ""} onValueChange={v => { setProviderId(Number(v)); setServiceId(null) }}>
            <SelectTrigger><SelectValue placeholder="Choose a provider" /></SelectTrigger>
            <SelectContent>{providers?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name} — {p.categoryName}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={serviceId ? String(serviceId) : ""} onValueChange={v => setServiceId(Number(v))} disabled={!provider}>
            <SelectTrigger><SelectValue placeholder={providerId ? "Choose a service" : "Pick a provider first"} /></SelectTrigger>
            <SelectContent>{provider?.services.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name} — {s.price} AED</SelectItem>)}</SelectContent>
          </Select>
          <Textarea placeholder={'Why do you need it? e.g. "My room\'s AC is barely cooling"'} value={note} onChange={e => setNote(e.target.value)} rows={3} />
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={!serviceId || !note.trim() || createRequest.isPending}>
            {createRequest.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Send for approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function Household() {
  const { data: household, isLoading: isLoadingHousehold } = useGetHousehold()
  const { data: activity, isLoading: isLoadingActivity } = useListHouseholdActivity()
  const { data: requests, isLoading: isLoadingRequests } = useListServiceRequests()
  const pending = requests?.filter(r => r.status === "pending") ?? []
  const decided = requests?.filter(r => r.status !== "pending") ?? []

  const getActivityIcon = (kind: string) => {
    switch (kind) {
      case "booking_created":   return <CalendarCheck className="h-4 w-4 text-blue-400" />
      case "booking_completed": return <CalendarCheck className="h-4 w-4 text-emerald-400" />
      case "payment":           return <CreditCard className="h-4 w-4 text-[hsl(var(--primary))]" />
      case "review":            return <MessageSquare className="h-4 w-4 text-amber-400" />
      default:                  return <Activity className="h-4 w-4 text-white/40" />
    }
  }

  return (
    <div className="space-y-10 pb-24">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full border border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.08)] px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--primary))]">
              The Pack
            </span>
          </div>
          <h1 className="flex items-center gap-3 text-4xl font-extrabold tracking-tight text-white">
            <Users className="h-8 w-8 text-[hsl(var(--primary))]" />
            {isLoadingHousehold
              ? <span className="h-10 w-48 animate-pulse rounded-lg bg-white/10 inline-block" />
              : household?.name ?? "Household"}
          </h1>
          <p className="mt-2 text-sm text-white/40">Experience optimizer · Dubai Hills</p>
        </div>
        <NotificationsToggle />
      </header>

      {/* Loup Live — Geo experience optimizer */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Navigation className="h-4 w-4 text-[hsl(var(--primary))]" />
          <h2 className="text-xl font-bold tracking-tight text-white">Loup Live</h2>
          <span className="ml-1 rounded-full bg-[hsl(var(--platform-mint)/0.12)] border border-[hsl(var(--platform-mint)/0.2)] px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--platform-mint))]">
            GEO
          </span>
        </div>
        <LoupLive />
      </section>

      {/* Benefit Advisor — AI */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[hsl(var(--platform-plum))]" />
          <h2 className="text-xl font-bold tracking-tight text-white">Benefit Advisor</h2>
          <span className="ml-1 rounded-full bg-[hsl(var(--platform-plum)/0.12)] border border-[hsl(var(--platform-plum)/0.2)] px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--platform-plum))]">
            AI
          </span>
        </div>
        <BenefitAdvisor />
      </section>

      {/* Service requests */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-white">Requests</h2>
          <div className="flex items-center gap-3">
            {pending.length > 0 && (
              <span className="rounded-full bg-[hsl(var(--primary)/0.12)] border border-[hsl(var(--primary)/0.2)] px-2.5 py-0.5 text-xs font-semibold text-[hsl(var(--primary))]">
                {pending.length} pending
              </span>
            )}
            <RequestServiceDialog />
          </div>
        </div>
        {isLoadingRequests ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map(i => <div key={i} className="h-44 animate-pulse rounded-2xl bg-white/[0.05]" />)}
          </div>
        ) : requests?.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.08] p-10 text-center text-sm text-white/30">
            No requests yet — family members can request a service for approval here.
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {pending.map(request => <ServiceRequestCard key={request.id} request={request} />)}
            </div>
            {decided.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/30">Decided</h3>
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
        <h2 className="text-xl font-bold tracking-tight text-white">Members</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {isLoadingHousehold ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-white/[0.05]" />
            ))
          ) : (
            household?.members.map(member => {
              const spendPercent = member.monthlySpendLimit
                ? Math.min(100, Math.round((member.monthToDateSpend / member.monthlySpendLimit) * 100))
                : 0
              const isNearLimit = spendPercent >= 85
              return (
                <div
                  key={member.id}
                  className={cn(
                    "rounded-2xl border p-5 backdrop-blur-xl",
                    member.isCurrentUser
                      ? "border-[hsl(var(--primary)/0.25)] bg-[hsl(var(--primary)/0.05)]"
                      : "border-white/[0.07] bg-white/[0.03]",
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold border-2",
                        member.role === "head" || member.role === "owner"
                          ? "border-[hsl(var(--primary)/0.5)] bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]"
                          : "border-white/10 bg-white/[0.06] text-white/70",
                      )}>
                        {member.initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">{member.name}</h3>
                          {member.isCurrentUser && (
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/50">You</span>
                          )}
                        </div>
                        <p className="text-sm text-white/40 flex items-center gap-1 mt-0.5">
                          {(member.role === "head" || member.role === "owner") && (
                            <Crown className="h-3 w-3 text-amber-400" />
                          )}
                          {member.relation}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 pt-4 border-t border-white/[0.06]">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/40">Month to date</span>
                      <span className="font-semibold text-white">{member.monthToDateSpend} AED</span>
                    </div>
                    {member.monthlySpendLimit && (
                      <div className="space-y-1.5">
                        <Progress value={spendPercent} className={cn("h-1.5", isNearLimit && "[&>div]:bg-destructive")} />
                        <div className="flex justify-between text-xs text-white/30">
                          <span>{spendPercent}% used</span>
                          <span className="flex items-center gap-1">
                            {isNearLimit && <ShieldAlert className="h-3 w-3 text-destructive" />}
                            Limit: {member.monthlySpendLimit}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* Activity feed */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-white">Recent Activity</h2>
        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl">
          {isLoadingActivity ? (
            <div className="p-6 space-y-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-4">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
                    <div className="h-3 w-1/4 animate-pulse rounded bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          ) : activity?.length === 0 ? (
            <div className="p-10 text-center text-sm text-white/30">No recent activity</div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {activity?.map(item => (
                <div key={item.id} className="flex gap-4 p-4 sm:p-5 transition-colors hover:bg-white/[0.03]">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
                    {getActivityIcon(item.kind)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold text-white/90">{item.memberName}</span>
                      {" "}
                      <span className="text-white/50">{item.description}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-white/30">
                        {new Date(item.occurredAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </span>
                      {item.amount && (
                        <>
                          <span className="text-white/20">·</span>
                          <span className="text-xs font-semibold text-white/70">{item.amount} AED</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
