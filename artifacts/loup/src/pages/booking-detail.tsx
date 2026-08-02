import { useState, useRef, useEffect } from "react"
import { useParams, Link } from "wouter"
import { useGetBooking, useListBookingMessages, useAdvanceBooking, useUpdateBooking, useSendBookingMessage, useCreateReview, getGetBookingQueryKey, getListBookingMessagesQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { ArrowLeft, Clock, MapPin, MessageSquare, FastForward, CheckCircle2, Navigation, Send, X, Star, Calendar } from "lucide-react"

export default function BookingDetail() {
  const { id: idStr } = useParams<{ id: string }>()
  const bookingId = Number(idStr)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: booking, isLoading } = useGetBooking(bookingId, { 
    query: { enabled: !!bookingId, queryKey: ['getBooking', bookingId] as const, refetchInterval: 5000 } 
  })
  
  const { data: messages, isLoading: isLoadingMessages } = useListBookingMessages(bookingId, {
    query: { enabled: !!bookingId, queryKey: ['listBookingMessages', bookingId] as const, refetchInterval: 4000 }
  })

  const advanceBooking = useAdvanceBooking()
  const updateBooking = useUpdateBooking()
  const sendMessage = useSendBookingMessage()
  const createReview = useCreateReview()

  const [messageBody, setMessageBody] = useState("")
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false)
  const [newScheduledAt, setNewScheduledAt] = useState("")
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState("")

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (booking?.scheduledAt && isRescheduleOpen && !newScheduledAt) {
      // Set to current date to start, format for datetime-local
      const date = new Date(booking.scheduledAt)
      const tzoffset = date.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0,-8);
      setNewScheduledAt(localISOTime)
    }
  }, [booking?.scheduledAt, isRescheduleOpen, newScheduledAt])

  if (isLoading || !booking) {
    return <div className="p-8 space-y-4"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-32 w-full" /></div>
  }

  const isLive = ["confirmed", "en_route", "arrived", "in_progress"].includes(booking.status)
  const isCancellable = booking.status === "pending" || booking.status === "confirmed"

  const handleAdvance = () => {
    advanceBooking.mutate({ id: bookingId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) })
        toast({ title: "Booking advanced", description: "The provider's status has been updated." })
      }
    })
  }

  const handleCancel = () => {
    if (!confirm("Are you sure you want to cancel this booking?")) return
    updateBooking.mutate({ id: bookingId, data: { status: "cancelled" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) })
        toast({ title: "Booking cancelled" })
      }
    })
  }
  
  const handleReschedule = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newScheduledAt) return
    const date = new Date(newScheduledAt)
    updateBooking.mutate({ id: bookingId, data: { scheduledAt: date.toISOString() } }, {
      onSuccess: () => {
        setIsRescheduleOpen(false)
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) })
        toast({ title: "Booking rescheduled" })
      }
    })
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageBody.trim()) return
    
    sendMessage.mutate({ id: bookingId, data: { body: messageBody } }, {
      onSuccess: () => {
        setMessageBody("")
        queryClient.invalidateQueries({ queryKey: getListBookingMessagesQueryKey(bookingId) })
      }
    })
  }

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault()
    createReview.mutate({ data: { bookingId, rating: reviewRating, comment: reviewComment } }, {
      onSuccess: () => {
        setIsReviewOpen(false)
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) })
        toast({ title: "Review submitted", description: "Thank you for your feedback!" })
      }
    })
  }

  return (
    <div className="space-y-8 animate-in fade-in pb-24">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full bg-secondary">
            <Link href="/bookings"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-serif tracking-tight">{booking.serviceName}</h1>
            <p className="text-muted-foreground text-sm">with {booking.providerName}</p>
          </div>
        </div>
        <Badge variant={isLive ? "default" : "secondary"} className="capitalize">
          {booking.status.replace("_", " ")}
        </Badge>
      </header>

      {/* Demo Controls */}
      {isLive && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <p className="text-sm font-medium text-primary">Demo: Simulate provider progress</p>
            <Button size="sm" onClick={handleAdvance} disabled={advanceBooking.isPending}>
              <FastForward className="h-4 w-4 mr-2" /> Advance Status
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ETA & Live Status */}
      {isLive && booking.etaMinutes !== null && (
        <Card className="bg-primary text-primary-foreground border-0">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <Navigation className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium opacity-80">Estimated Arrival</p>
                <p className="text-2xl font-serif">{booking.etaMinutes} mins</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Details */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex gap-4">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Scheduled for</p>
              <p className="text-sm text-muted-foreground">
                {new Date(booking.scheduledAt).toLocaleString([], { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Location</p>
              <p className="text-sm text-muted-foreground">{booking.addressLabel}</p>
            </div>
          </div>
          {booking.instructions && (
            <div className="flex gap-4">
              <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Instructions</p>
                <p className="text-sm text-muted-foreground">{booking.instructions}</p>
              </div>
            </div>
          )}
          <div className="pt-4 border-t border-border flex justify-between items-center">
            <span className="font-medium text-muted-foreground">Estimated Price</span>
            <span className="text-xl font-serif">{booking.priceEstimate} AED</span>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="space-y-4 px-2">
        <h3 className="font-serif text-xl">Timeline</h3>
        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {booking.events.map((event, i) => (
            <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-secondary text-primary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border bg-card shadow-sm">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium capitalize">{event.status.replace("_", " ")}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.occurredAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
                {event.note && <p className="text-sm text-muted-foreground">{event.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat (if live) */}
      {(isLive || messages && messages.length > 0) && (
        <Card className="flex flex-col h-[400px]">
          <div className="p-4 border-b border-border font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Provider Chat
          </div>
          <CardContent className="p-4 flex-1 overflow-y-auto space-y-4 bg-muted/30">
            {messages?.map(msg => (
              <div key={msg.id} className={`flex gap-3 max-w-[80%] ${msg.sender === 'member' ? 'ml-auto flex-row-reverse' : ''}`}>
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback>{msg.senderName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className={`p-3 rounded-2xl text-sm ${msg.sender === 'member' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-card border border-border rounded-tl-none'}`}>
                  {msg.body}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </CardContent>
          {isLive && (
            <div className="p-4 bg-card border-t border-border">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input 
                  value={messageBody} 
                  onChange={e => setMessageBody(e.target.value)} 
                  placeholder="Message the provider..." 
                  className="flex-1 rounded-full"
                />
                <Button type="submit" size="icon" className="rounded-full shrink-0" disabled={!messageBody.trim() || sendMessage.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          )}
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        {isCancellable && (
          <>
            <Button variant="secondary" onClick={() => setIsRescheduleOpen(true)} className="flex-1">
              Reschedule
            </Button>
            <Button variant="outline" onClick={handleCancel} className="flex-1 text-destructive hover:bg-destructive/10 border-destructive/20">
              Cancel
            </Button>
          </>
        )}
        
        {booking.status === "completed" && !booking.hasReview && (
          <Button className="w-full" onClick={() => setIsReviewOpen(true)}>
            Leave a Review
          </Button>
        )}
      </div>

      {/* Review Dialog */}
      {isReviewOpen && (
        <DialogPrimitive.Root open={isReviewOpen} onOpenChange={setIsReviewOpen}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-2xl">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-serif">Rate this service</h2>
                <DialogPrimitive.Close asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><X className="h-4 w-4"/></Button>
                </DialogPrimitive.Close>
              </div>
              <form onSubmit={handleSubmitReview} className="space-y-6">
                <div className="flex justify-center gap-2">
                  {[1,2,3,4,5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-2 hover:scale-110 transition-transform"
                    >
                      <Star className={`h-8 w-8 ${star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                    </button>
                  ))}
                </div>
                <textarea
                  className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="How was your experience?"
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  required
                />
                <Button type="submit" className="w-full" disabled={createReview.isPending}>
                  Submit Review
                </Button>
              </form>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}
      
      {/* Reschedule Dialog */}
      {isRescheduleOpen && (
        <DialogPrimitive.Root open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-serif">Reschedule Booking</h2>
                  <p className="text-sm text-muted-foreground mt-1">Pick a new date and time.</p>
                </div>
                <DialogPrimitive.Close asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><X className="h-4 w-4"/></Button>
                </DialogPrimitive.Close>
              </div>
              <form onSubmit={handleReschedule} className="space-y-6 mt-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" /> New Date & Time
                  </label>
                  <Input 
                    type="datetime-local" 
                    className="h-14"
                    value={newScheduledAt}
                    onChange={(e) => setNewScheduledAt(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full h-12" disabled={!newScheduledAt || updateBooking.isPending}>
                  Confirm Reschedule
                </Button>
              </form>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}
    </div>
  )
}