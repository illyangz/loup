import { Link } from "wouter"
import { useGetHomeSummary, useListCategories, useListBookings } from "@workspace/api-client-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Sparkles, AirVent, Wrench, Scissors, HeartPulse, Bug, Droplets, Shirt, ArrowRight, Clock, Receipt, User, Loader2, Calendar, Users, Activity, MessageSquare } from "lucide-react"
import { ServiceRequestCard } from "@/components/service-request-card"
import { Badge } from "@/components/ui/badge"

const ICONS: Record<string, any> = {
  Sparkles, AirVent, Wrench, Scissors, HeartPulse, Bug, Droplets, Shirt
}

export default function Home() {
  const { data: summary, isLoading: isLoadingSummary } = useGetHomeSummary()
  const { data: categories, isLoading: isLoadingCategories } = useListCategories()
  const { data: upcomingBookings } = useListBookings({ scope: "upcoming" })

  const activeOrNext = summary?.activeBooking || summary?.nextBooking
  const isActive = Boolean(summary?.activeBooking)
  const weekAhead = (upcomingBookings ?? []).slice(0, 3)

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 5) return "Good evening"
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }
  const firstName = (name?: string) => (name ? name.split(" ")[0] : "")

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Greeting Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-serif tracking-tight">
            {isLoadingSummary ? <Skeleton className="h-9 w-48" /> : `${greeting()}, ${firstName(summary?.memberName)}`}
          </h1>
          <div className="text-muted-foreground mt-1 font-medium">
            {isLoadingSummary ? <Skeleton className="h-5 w-32" /> : summary?.householdName}
          </div>
        </div>
        <Avatar className="h-12 w-12 rounded-2xl border border-border glass-card shadow-sm">
          <AvatarFallback className="rounded-2xl bg-transparent text-primary font-serif text-xl italic">
            {summary?.memberName?.[0] || <User className="h-5 w-5" />}
          </AvatarFallback>
        </Avatar>
      </header>

      {/* Console layout: main stage + ledger rail on desktop */}
      <div className="flex flex-col lg:flex-row items-start gap-8 xl:gap-12">
        <main className="flex-1 w-full min-w-0 space-y-8 lg:space-y-12">

          {/* Live Status Band */}
          {isLoadingSummary ? (
            <div className="glass-card rounded-[2rem] p-6 h-36 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
            </div>
          ) : activeOrNext ? (
            <Link href={`/bookings/${activeOrNext.id}`} className="block group">
              <div className="glass-card-glow rounded-[2rem] p-6 sm:p-8 lg:p-10 relative overflow-hidden cursor-pointer">
                {/* Ambient glow orbs */}
                <div className="absolute right-0 top-0 w-72 h-72 rounded-full pointer-events-none"
                  style={{ background: "radial-gradient(circle, hsl(38 100% 58% / 0.15) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
                <div className="absolute left-1/4 bottom-0 w-48 h-48 rounded-full pointer-events-none"
                  style={{ background: "radial-gradient(circle, hsl(260 90% 68% / 0.10) 0%, transparent 70%)", transform: "translateY(30%)" }} />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center backdrop-blur-md shrink-0 group-hover:scale-110 transition-transform duration-500">
                      {(() => {
                        const Icon = ICONS[activeOrNext.categoryIcon] || Sparkles
                        return <Icon className={`h-6 w-6 sm:h-8 sm:w-8 text-primary ${isActive ? "animate-pulse" : ""}`} />
                      })()}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] uppercase tracking-widest font-bold text-primary flex items-center gap-1.5">
                          {isActive && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
                          {isActive ? "Active Now" : "Up Next"}
                        </span>
                        {isActive && (
                          <span className="text-sm text-muted-foreground hidden sm:flex items-center gap-1.5 font-medium">
                            <Activity className="w-4 h-4 text-primary" /> In progress at home
                          </span>
                        )}
                      </div>
                      <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl leading-tight mb-1">{activeOrNext.serviceName}</h2>
                      <p className="text-muted-foreground font-medium tracking-wide">{activeOrNext.providerName}</p>
                    </div>
                  </div>

                  <div className="glass-card rounded-2xl p-4 sm:p-5 text-left md:text-right shrink-0 group-hover:border-primary/20 transition-colors">
                    <div className="text-sm text-muted-foreground mb-1 font-medium tracking-wide">
                      {new Date(activeOrNext.scheduledAt).toLocaleDateString([], { weekday: 'short', day: 'numeric' })}
                    </div>
                    <div className="text-2xl sm:text-3xl font-serif text-foreground">
                      {new Date(activeOrNext.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </div>
                    <span className="mt-3 sm:mt-4 text-xs font-bold uppercase tracking-widest text-primary group-hover:text-primary/80 transition-colors flex items-center md:justify-end gap-1 w-full">
                      View Details <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div className="glass-card rounded-[2rem] flex flex-col justify-center items-center text-center p-8 min-h-[140px] border-dashed">
              <Clock className="h-8 w-8 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground font-medium">No upcoming bookings</p>
            </div>
          )}

          {/* Requests from the pack */}
          {(summary?.pendingRequests?.length ?? 0) > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl lg:text-3xl font-serif flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Requests
                </h2>
                <Badge variant="secondary" className="text-primary">{summary!.pendingRequests.length} pending</Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {summary!.pendingRequests.map(request => (
                  <ServiceRequestCard key={request.id} request={request} />
                ))}
              </div>
            </section>
          )}

          {/* Bill Summary — mobile only (lives in ledger rail on desktop) */}
          <div className="lg:hidden glass-card rounded-[1.5rem] group relative">
            <Link href="/billing" className="absolute inset-0 z-10" />
            <div className="p-6 flex flex-col justify-between h-full min-h-[140px]">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Receipt className="h-5 w-5" />
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Current open bill</p>
                {isLoadingSummary ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-serif tracking-tight">{summary?.openBillTotal}</span>
                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">AED</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* The Pack thread preview — mobile only (lives in ledger rail on desktop) */}
          {!isLoadingSummary && (
            <section className="space-y-4 lg:hidden">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-serif flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" /> The Pack
                </h2>
                {(summary?.packUnreadCount ?? 0) > 0 && (
                  <Badge className="bg-primary text-primary-foreground">{summary!.packUnreadCount} new</Badge>
                )}
              </div>
              <div className="glass-card rounded-[1.5rem] group relative">
                <Link href="/household" className="absolute inset-0 z-10" aria-label="Open the pack thread" />
                <div className="p-5 space-y-4">
                  {summary?.recentPackMessages?.length ? (
                    summary.recentPackMessages.map(msg => (
                      <div key={msg.id} className="flex items-start gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">{msg.initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-sm font-medium">{msg.isCurrentUser ? "You" : msg.memberName.split(" ")[0]}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest shrink-0">
                              {new Date(msg.sentAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{msg.body}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">No messages yet — say hi to the pack</p>
                  )}
                  <div className="flex items-center justify-end text-xs font-medium text-primary">
                    Open the thread <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Service Directory */}
          <section className="space-y-4 lg:space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl lg:text-3xl font-serif">Summon a Professional</h2>
              <Link href="/browse" className="hidden sm:flex text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors items-center gap-1">
                Full Catalog <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {isLoadingCategories ? (
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 lg:gap-1">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 lg:h-16 rounded-2xl" />)}
              </div>
            ) : (
              <>
                {/* Mobile: glass card grid */}
                <div className="grid grid-cols-2 gap-3 lg:hidden">
                  {categories?.slice(0, 8).map(category => {
                    const Icon = ICONS[category.icon] || Sparkles
                    return (
                      <Link key={category.id} href={`/browse?category=${category.slug}`}>
                        <div className="glass-card rounded-[1.5rem] cursor-pointer group h-full">
                          <div className="p-5 flex flex-col items-center text-center space-y-3">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/15 text-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                              <Icon className="h-6 w-6" strokeWidth={1.5} />
                            </div>
                            <div>
                              <h3 className="font-medium text-sm">{category.name}</h3>
                              <p className="text-[10px] text-muted-foreground mt-0.5">From {category.startingPrice} AED</p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>

                {/* Desktop: dense two-column directory */}
                <div className="hidden lg:grid grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-1">
                  {categories?.slice(0, 8).map(category => {
                    const Icon = ICONS[category.icon] || Sparkles
                    return (
                      <Link
                        key={category.id}
                        href={`/browse?category=${category.slug}`}
                        className="group flex items-center justify-between py-4 border-b border-border/40 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-center gap-5">
                          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/15 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-sm group-hover:rotate-6">
                            <Icon className="h-6 w-6" strokeWidth={1.5} />
                          </div>
                          <span className="font-serif text-2xl text-foreground group-hover:text-primary transition-colors">{category.name}</span>
                        </div>
                        <div className="text-right flex flex-col">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">From</span>
                          <span className="font-serif text-xl text-primary">{category.startingPrice} AED</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </>
            )}
          </section>

          {/* Quick Call-to-action / Browse (mobile) */}
          <Button asChild size="lg" className="w-full sm:hidden rounded-2xl">
            <Link href="/browse">Browse full catalog</Link>
          </Button>
        </main>

        {/* Ledger Rail — desktop only */}
        <aside className="hidden lg:flex w-[360px] xl:w-[420px] shrink-0 flex-col gap-8">

          {/* The Plan */}
          <div className="glass-card rounded-[2rem] p-8 golden-shadow-sm hover:-translate-y-1 transition-transform duration-500">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2 text-primary">
                <Calendar className="w-5 h-5" />
                <h3 className="text-2xl font-serif text-foreground">The Plan</h3>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {weekAhead.length} Scheduled
              </span>
            </div>

            {weekAhead.length === 0 ? (
              <p className="text-sm font-medium text-muted-foreground">Nothing scheduled — the week is yours.</p>
            ) : (
              <div className="space-y-7">
                {weekAhead.map((booking, i) => (
                  <Link key={booking.id} href={`/bookings/${booking.id}`} className="block relative pl-6 before:absolute before:left-[5px] before:top-2 before:bottom-[-28px] before:w-[2px] before:bg-border last:before:hidden group">
                    <div className={`absolute left-0 top-1.5 w-3 h-3 rounded-full ring-4 ring-background ${i === 0 ? "bg-primary" : "bg-primary/40"}`} />
                    <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${i === 0 ? "text-primary" : "text-muted-foreground"}`}>
                      {new Date(booking.scheduledAt).toLocaleDateString([], { weekday: 'long' })}, {new Date(booking.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </div>
                    <div className="font-serif text-2xl text-foreground mb-0.5 group-hover:text-primary transition-colors">{booking.serviceName}</div>
                    <div className="text-sm font-medium text-muted-foreground">{booking.providerName}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Open Bill */}
          <div className="glass-card rounded-[2rem] p-8 relative group golden-shadow-sm hover:-translate-y-1 transition-transform duration-500">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2 text-primary">
                <Receipt className="w-5 h-5" />
                <h3 className="text-2xl font-serif text-foreground">Open Bill</h3>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest bg-background/60 px-3 py-1 rounded-full text-muted-foreground border border-border/60">
                {new Date().toLocaleDateString([], { month: 'long' })}
              </span>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-1.5 mb-1.5">
                <span className="text-6xl font-serif text-foreground tracking-tight platform-stat-glow" style={{ color: 'hsl(38 100% 58%)' }}>{summary?.openBillTotal ?? 0}</span>
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">AED</span>
              </div>
              <p className="text-sm font-medium text-muted-foreground">Month to date: {summary?.monthToDateSpend ?? 0} AED</p>
            </div>

            <Button asChild variant="outline" className="w-full py-6 rounded-2xl text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 border-primary/20 group-hover:border-primary/40">
              <Link href="/billing">View Statement</Link>
            </Button>
          </div>

          {/* The Pack */}
          <div className="glass-card rounded-[2rem] p-8 golden-shadow-sm hover:-translate-y-1 transition-transform duration-500 relative group">
            <Link href="/household" className="absolute inset-0 z-10 rounded-[2rem]" />
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-primary">
                <MessageSquare className="w-5 h-5" />
                <h3 className="text-2xl font-serif text-foreground">The Pack</h3>
              </div>
              {(summary?.packUnreadCount ?? 0) > 0 ? (
                <span className="text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">{summary!.packUnreadCount} New</span>
              ) : (
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              )}
            </div>
            {summary?.recentPackMessages?.length ? (
              <div className="space-y-4 mb-4">
                {summary.recentPackMessages.map(msg => (
                  <div key={msg.id} className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-serif italic">{msg.initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold">{msg.isCurrentUser ? "You" : msg.memberName.split(" ")[0]}</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">
                          {new Date(msg.sentAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground truncate">{msg.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            <p className="text-sm font-medium text-muted-foreground">
              {summary?.memberCount ?? "—"} members in {summary?.householdName ?? "your household"}
            </p>
          </div>

        </aside>
      </div>
    </div>
  )
}
