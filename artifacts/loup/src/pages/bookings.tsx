import { useState, useMemo, useEffect, useRef } from "react"
import { Link } from "wouter"
import { useListBookings, useGetHousehold, ListBookingsScope } from "@workspace/api-client-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Sparkles, AirVent, Wrench, Scissors, HeartPulse, Bug, Droplets, Shirt, CalendarClock, Activity, AlertCircle, RefreshCw } from "lucide-react"
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, addMonths, subMonths, isSameMonth, isSameDay, isToday, getDate, getDaysInMonth, setDate } from "date-fns"
import { getMemberColor, getMemberBg } from "@/lib/member-colors"

const ICONS: Record<string, any> = {
  Sparkles, AirVent, Wrench, Scissors, HeartPulse, Bug, Droplets, Shirt
}

export default function Bookings() {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null)
  const [listScope, setListScope] = useState<ListBookingsScope>("upcoming")

  const { data: bookingsAll, isLoading: isLoadingAll, error: errorAll, refetch: refetchAll } = useListBookings({ scope: "all" })
  const { data: household, isLoading: isLoadingHousehold, error: errorHousehold, refetch: refetchHousehold } = useGetHousehold()
  
  // Need a separate query for the rail list to respect the scope correctly while calendar uses "all"
  const { data: bookingsList, isLoading: isLoadingList, error: errorList, refetch: refetchList } = useListBookings(
    { scope: listScope },
    { query: { enabled: true, queryKey: ["bookings", listScope] } }
  )

  const isLiveStatus = (status: string) => ["confirmed", "en_route", "arrived", "in_progress"].includes(status)

  const daysInMonth = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 }),
  }), [currentMonth])

  // Calendar logic uses bookingsAll
  const filteredBookingsAll = useMemo(() => {
    if (!bookingsAll) return []
    if (selectedMemberId) return bookingsAll.filter(b => b.memberId === selectedMemberId)
    return bookingsAll
  }, [bookingsAll, selectedMemberId])

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, typeof bookingsAll>()
    filteredBookingsAll.forEach(booking => {
      const dateKey = format(new Date(booking.scheduledAt), "yyyy-MM-dd")
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey)!.push(booking)
    })
    return map
  }, [filteredBookingsAll])

  const selectedDateBookings = useMemo(() => {
    const key = format(selectedDate, "yyyy-MM-dd")
    return bookingsByDate.get(key) || []
  }, [bookingsByDate, selectedDate])

  // Rail list uses filtered bookingsList
  const filteredListBookings = useMemo(() => {
    if (!bookingsList) return []
    let filtered = bookingsList
    if (selectedMemberId) {
      filtered = filtered.filter(b => b.memberId === selectedMemberId)
    }
    // Sort logic depends on scope
    if (listScope === "past") {
      filtered = [...filtered].sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    } else {
      filtered = [...filtered].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    }
    return filtered
  }, [bookingsList, selectedMemberId, listScope])

  const changeMonth = (diff: number) => {
    setCurrentMonth(prev => {
      const next = diff > 0 ? addMonths(prev, diff) : subMonths(prev, Math.abs(diff));
      // clamp selected date to new month
      const currentSelectedDay = getDate(selectedDate);
      const daysInNext = getDaysInMonth(next);
      const clampedDay = Math.min(currentSelectedDay, daysInNext);
      const newSelectedDate = setDate(next, clampedDay);
      setSelectedDate(newSelectedDate);
      return next;
    });
  }

  const nextMonth = () => changeMonth(1)
  const prevMonth = () => changeMonth(-1)
  const goToToday = () => {
    setCurrentMonth(startOfMonth(new Date()))
    setSelectedDate(new Date())
  }

  const renderBookingCard = (booking: any) => {
    const Icon = ICONS[booking.categoryIcon] || Sparkles
    const isLive = isLiveStatus(booking.status)
    const isPast = booking.status === "completed" || booking.status === "cancelled"
    const member = household?.members.find(m => m.id === booking.memberId)
    const color = getMemberColor(booking.memberId, member?.isCurrentUser, household?.members)
    const bg = getMemberBg(booking.memberId, member?.isCurrentUser, household?.members)
    
    return (
      <Link key={booking.id} href={`/bookings/${booking.id}`} className="block">
        <Card className={`border-border hover:border-primary/50 transition-all hover:shadow-md cursor-pointer group rounded-2xl ${isLive ? 'border-primary/30 bg-primary/5' : ''} ${isPast ? 'opacity-60 bg-secondary/20' : ''}`}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105 ${isLive ? 'bg-primary text-primary-foreground animate-pulse-slow' : 'bg-background text-foreground'}`}>
              <Icon className="h-6 w-6" strokeWidth={1.5} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1">
                <h3 className={`font-medium truncate transition-colors ${isPast && booking.status === 'cancelled' ? 'line-through text-muted-foreground' : 'group-hover:text-primary'}`}>
                  {booking.serviceName}
                </h3>
                <Badge 
                  variant={
                    booking.status === "completed" ? "secondary" : 
                    booking.status === "cancelled" ? "outline" : 
                    isLive ? "default" : "outline"
                  } 
                  className="capitalize text-[10px] py-0 px-2 h-5"
                >
                  {booking.status.replace("_", " ")}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                <div className="text-xs font-bold tracking-wide text-foreground/80 flex items-center gap-1">
                  {format(new Date(booking.scheduledAt), "h:mm a")}
                </div>
                <span className="text-border">•</span>
                <p className="text-xs text-muted-foreground truncate">{booking.providerName}</p>
              </div>

              <div className="flex items-center gap-1.5 mt-2">
                <Avatar className="h-4 w-4">
                  <AvatarFallback className="text-[8px] font-serif italic" style={{ backgroundColor: bg, color: color }}>
                    {member?.initials || "?"}
                  </AvatarFallback>
                </Avatar>
                {/* Fixed contrast for dark text on light backgrounds or using standard foreground if no background chip */}
                <span className="text-[10px] font-medium" style={{ color: 'var(--foreground)' }}>
                  <span className="px-1.5 py-0.5 rounded-md" style={{ backgroundColor: bg, color }}>
                    {member?.name.split(" ")[0]}
                  </span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  const renderErrorState = (onRetry: () => void) => (
    <div className="text-center py-10 px-4 border border-destructive/20 bg-destructive/5 rounded-3xl">
      <AlertCircle className="h-8 w-8 text-destructive/70 mx-auto mb-3" />
      <h3 className="font-serif text-xl mb-2 text-destructive">Connection interrupted</h3>
      <p className="text-sm text-destructive/80 mb-4 max-w-sm mx-auto">We're having trouble retrieving the household schedule. Please give us a moment to reconnect.</p>
      <Button variant="outline" size="sm" onClick={onRetry} className="border-destructive/30 text-destructive hover:bg-destructive/10">
        <RefreshCw className="mr-2 h-4 w-4" /> Try again
      </Button>
    </div>
  )

  const hasCalendarError = Boolean(errorAll || errorHousehold);
  const handleCalendarRetry = () => {
    if (errorAll) refetchAll();
    if (errorHousehold) refetchHousehold();
  };

  const getScopeTitle = () => {
    switch(listScope) {
      case "active": return "Live Now";
      case "past": return "Past Visits";
      case "upcoming": return "Up Next";
      default: return "All Visits";
    }
  }

  const ScopeSelector = () => (
    <Select value={listScope} onValueChange={(val: ListBookingsScope) => setListScope(val)}>
      <SelectTrigger className="w-[140px] h-8 text-xs font-bold uppercase tracking-widest bg-transparent border-border/50">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="upcoming">Up Next</SelectItem>
        <SelectItem value="active">Active Now</SelectItem>
        <SelectItem value="past">Past Visits</SelectItem>
        <SelectItem value="all">All Visits</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header & Controls */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl lg:text-4xl font-serif tracking-tight flex items-center gap-3">
            Calendar
          </h1>
          <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-bold uppercase tracking-widest min-w-[130px] text-center">
              {format(currentMonth, "MMM yyyy")}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" className="h-8 rounded-lg hidden sm:flex font-semibold" onClick={goToToday}>Today</Button>
        </div>
        
        {/* Legend / Filter */}
        {household?.members && (
          <div className="flex flex-wrap items-center gap-2 bg-card/50 p-1.5 rounded-2xl border border-border/50">
            {household.members.map(member => {
              const isSelected = selectedMemberId === member.id
              const color = getMemberColor(member.id, member.isCurrentUser, household.members)
              const bg = getMemberBg(member.id, member.isCurrentUser, household.members)
              
              return (
                <button
                  key={member.id}
                  onClick={() => setSelectedMemberId(isSelected ? null : member.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all ${
                    isSelected ? 'ring-1 ring-border shadow-sm' : 'border-transparent hover:bg-secondary/80'
                  } ${selectedMemberId && !isSelected ? 'opacity-40 grayscale' : ''}`}
                  style={{ backgroundColor: isSelected ? bg : undefined }}
                >
                  <Avatar className="h-5 w-5 border border-background shadow-sm">
                    <AvatarFallback 
                      className="text-[9px] font-serif italic" 
                      style={{ backgroundColor: bg, color: color }}
                    >
                      {member.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[11px] font-bold tracking-wide" style={{ color: isSelected ? color : 'var(--foreground)' }}>
                    {member.name.split(" ")[0]}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </header>

      <div className="flex flex-col lg:flex-row items-start gap-8 xl:gap-12">
        {/* Main Stage: Calendar */}
        <main className="flex-1 w-full min-w-0">
          {hasCalendarError ? renderErrorState(handleCalendarRetry) : (
            <div className="bg-card/40 rounded-[2rem] border border-border/50 p-2 sm:p-4 shadow-sm">
              {/* Days of week */}
              <div className="grid grid-cols-7 gap-1 lg:gap-2 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div key={day} className="text-center text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground py-2">
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day.charAt(0)}</span>
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 lg:gap-2">
                {daysInMonth.map((day) => {
                  const dateKey = format(day, "yyyy-MM-dd")
                  const dayBookings = bookingsByDate.get(dateKey) || []
                  const isSelected = isSameDay(day, selectedDate)
                  const isCurrentMonth = isSameMonth(day, currentMonth)
                  const isTodayDate = isToday(day)

                  return (
                    <div
                      key={dateKey}
                      onClick={() => setSelectedDate(day)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedDate(day);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`${format(day, "MMMM d")}, ${dayBookings.length} bookings`}
                      aria-pressed={isSelected}
                      aria-selected={isSelected}
                      className={`cursor-pointer min-h-[70px] sm:min-h-[90px] lg:min-h-[130px] p-1 lg:p-2 rounded-2xl border transition-all flex flex-col items-center sm:items-start gap-1 
                        ${isCurrentMonth ? "bg-card hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" : "bg-transparent opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"} 
                        ${isSelected ? "border-primary shadow-sm ring-1 ring-primary/20" : "border-border/40 hover:border-primary/30"} 
                        ${isTodayDate && !isSelected ? "border-primary/50 bg-primary/5" : ""}
                      `}
                    >
                      <div className="w-full flex justify-center sm:justify-start">
                        <span className={`text-xs sm:text-sm font-medium w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full shrink-0 ${
                          isTodayDate ? (isSelected ? "bg-primary text-primary-foreground shadow-sm" : "bg-primary/20 text-primary") : 
                          isSelected ? "bg-foreground text-background shadow-sm" : "text-foreground/80"
                        }`}>
                          {format(day, "d")}
                        </span>
                      </div>
                      
                      <div className="flex-1 w-full flex flex-col gap-0.5 sm:gap-1 overflow-hidden mt-1 pointer-events-none sm:pointer-events-auto">
                        {/* Desktop: chips */}
                        <div className="hidden sm:flex flex-col gap-1 w-full px-0.5">
                          {isLoadingAll ? null : dayBookings.slice(0, 3).map(booking => {
                            const member = household?.members.find(m => m.id === booking.memberId)
                            const color = getMemberColor(booking.memberId, member?.isCurrentUser, household?.members)
                            const bg = getMemberBg(booking.memberId, member?.isCurrentUser, household?.members)
                            const isPast = booking.status === "completed" || booking.status === "cancelled"
                            const isLive = isLiveStatus(booking.status)
                            
                            return (
                              <Link 
                                key={booking.id}
                                href={`/bookings/${booking.id}`} 
                                className={`text-[9px] lg:text-[10px] font-medium truncate px-1.5 py-1 rounded-md flex items-center gap-1.5 hover:brightness-95 transition-all w-full border border-transparent ${isPast ? 'opacity-50' : ''} ${isLive ? 'border-primary/30 shadow-sm' : ''}`}
                                style={{ backgroundColor: bg, color: color }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {isLive ? (
                                  <Activity className="w-2.5 h-2.5 shrink-0 animate-pulse" />
                                ) : (
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                )}
                                <span className="truncate">{booking.serviceName}</span>
                              </Link>
                            )
                          })}
                          {dayBookings.length > 3 && (
                            <div className="text-[9px] text-muted-foreground pl-1 font-bold uppercase tracking-widest mt-0.5">+{dayBookings.length - 3} more</div>
                          )}
                        </div>

                        {/* Mobile: dots (container pointer-events-none prevents clicks on dots from bubbling strangely) */}
                        <div className="flex sm:hidden flex-wrap justify-center gap-1 mt-1 px-1">
                          {isLoadingAll ? null : dayBookings.slice(0, 4).map(booking => {
                            const member = household?.members.find(m => m.id === booking.memberId)
                            const color = getMemberColor(booking.memberId, member?.isCurrentUser, household?.members)
                            const isPast = booking.status === "completed" || booking.status === "cancelled"
                            const isLive = isLiveStatus(booking.status)
                            return (
                              <span 
                                key={booking.id} 
                                className={`w-1.5 h-1.5 rounded-full ${isPast ? 'opacity-40' : ''} ${isLive ? 'ring-2 ring-primary/30 animate-pulse' : ''}`}
                                style={{ backgroundColor: color }}
                              />
                            )
                          })}
                          {dayBookings.length > 4 && (
                            <span className="text-[8px] text-muted-foreground leading-none font-bold mt-0.5">+{dayBookings.length - 4}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Mobile Day Details & Rail (shown below calendar on mobile) */}
          <div className="lg:hidden mt-8 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <h3 className="font-serif text-2xl">
                  {isToday(selectedDate) ? "Today" : format(selectedDate, "EEEE, MMMM d")}
                </h3>
                <Badge variant="secondary" className="text-primary">{selectedDateBookings.length}</Badge>
              </div>
              
              <div className="space-y-3">
                {isLoadingAll ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <Card key={i} className="border-border rounded-2xl">
                      <CardContent className="p-4 flex gap-4 items-center">
                        <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-1/2" />
                          <Skeleton className="h-4 w-1/3" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : hasCalendarError ? (
                  renderErrorState(handleCalendarRetry)
                ) : selectedDateBookings.length === 0 ? (
                  <div className="text-center py-10 border-2 border-dashed border-border rounded-3xl bg-card/20">
                    <CalendarClock className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground font-medium">The schedule is clear.</p>
                  </div>
                ) : (
                  selectedDateBookings.map(renderBookingCard)
                )}
              </div>
            </div>

            {/* Mobile Scoped List */}
            <div className="bg-secondary/30 rounded-[2rem] p-5 border border-border/50">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-serif text-2xl text-foreground">{getScopeTitle()}</h3>
                <ScopeSelector />
              </div>
              
              <div className="space-y-3">
                {errorList ? renderErrorState(() => refetchList()) : isLoadingList ? (
                   Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="w-2 h-2 mt-1 rounded-full shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  ))
                ) : filteredListBookings.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm font-medium text-muted-foreground">No bookings found in this view.</p>
                  </div>
                ) : (
                  filteredListBookings.slice(0, 5).map((booking, i) => {
                    const isLive = isLiveStatus(booking.status)
                    const isPast = booking.status === "completed" || booking.status === "cancelled"
                    const member = household?.members.find(m => m.id === booking.memberId)
                    const color = getMemberColor(booking.memberId, member?.isCurrentUser, household?.members)
                    
                    return (
                      <Link key={booking.id} href={`/bookings/${booking.id}`} className={`block group relative ${isPast ? 'opacity-60' : ''}`}>
                        <div className="flex items-start gap-4">
                          <div className="relative flex flex-col items-center">
                            <div className={`mt-1 w-2.5 h-2.5 rounded-full ring-4 ring-background z-10 ${isLive ? 'bg-primary animate-pulse' : 'bg-primary/40'}`} style={{ backgroundColor: !isLive ? color : undefined }} />
                            {i !== Math.min(filteredListBookings.length, 5) - 1 && (
                              <div className="absolute top-3 w-px h-full bg-border -bottom-4" />
                            )}
                          </div>
                          <div className="pb-4 flex-1 min-w-0">
                            <div className="flex justify-between items-baseline gap-2 mb-0.5">
                              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                {format(new Date(booking.scheduledAt), "MMM d, h:mm a")}
                              </div>
                              <span className="text-[9px] font-bold truncate opacity-80" style={{ color }}>{member?.name.split(" ")[0]}</span>
                            </div>
                            <div className={`font-serif text-xl group-hover:text-primary transition-colors truncate text-foreground/90 ${isPast && booking.status === 'cancelled' ? 'line-through' : ''}`}>
                              {booking.serviceName}
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })
                )}
                {filteredListBookings.length > 5 && (
                  <div className="pt-2 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    +{filteredListBookings.length - 5} more
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        
        {/* Desktop Rail */}
        <aside className="hidden lg:flex w-[380px] xl:w-[420px] shrink-0 flex-col gap-8">
          {/* Day Detail Card */}
          <div className="bg-card/60 backdrop-blur-sm rounded-[2rem] p-6 xl:p-8 border border-border/60 golden-shadow-sm sticky top-28 transition-all">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-3xl text-foreground">
                {isToday(selectedDate) ? "Today's Plan" : format(selectedDate, "MMM d")}
              </h3>
              <Badge variant="secondary" className="text-primary">{selectedDateBookings.length} Visits</Badge>
            </div>
            
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 pb-4 scrollbar-none">
              {isLoadingAll ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                ))
              ) : hasCalendarError ? (
                renderErrorState(handleCalendarRetry)
              ) : selectedDateBookings.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <CalendarClock className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-30" />
                  <p className="text-sm font-medium text-muted-foreground">The schedule is clear on this day.</p>
                </div>
              ) : (
                selectedDateBookings.map(renderBookingCard)
              )}
            </div>
          </div>
          
          {/* Scoped preview list */}
          <div className="bg-secondary/30 rounded-[2rem] p-6 xl:p-8 border border-border/50 transition-all">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-2xl text-foreground">{getScopeTitle()}</h3>
              <ScopeSelector />
            </div>
            
            <div className="space-y-5">
              {errorList ? renderErrorState(() => refetchList()) : isLoadingList ? (
                 Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-2 h-2 mt-1 rounded-full shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                ))
              ) : filteredListBookings.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm font-medium text-muted-foreground">No bookings found in this view.</p>
                </div>
              ) : (
                filteredListBookings.slice(0, 5).map((booking, i) => {
                  const isLive = isLiveStatus(booking.status)
                  const isPast = booking.status === "completed" || booking.status === "cancelled"
                  const member = household?.members.find(m => m.id === booking.memberId)
                  const color = getMemberColor(booking.memberId, member?.isCurrentUser, household?.members)
                  
                  return (
                    <Link key={booking.id} href={`/bookings/${booking.id}`} className={`block group relative ${isPast ? 'opacity-60' : ''}`}>
                      <div className="flex items-start gap-4">
                        <div className="relative flex flex-col items-center">
                          <div className={`mt-1 w-2.5 h-2.5 rounded-full ring-4 ring-background z-10 ${isLive ? 'bg-primary animate-pulse' : 'bg-primary/40'}`} style={{ backgroundColor: !isLive ? color : undefined }} />
                          {i !== Math.min(filteredListBookings.length, 5) - 1 && (
                            <div className="absolute top-3 w-px h-full bg-border -bottom-8" />
                          )}
                        </div>
                        <div className="pb-4 flex-1 min-w-0">
                          <div className="flex justify-between items-baseline gap-2 mb-0.5">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              {format(new Date(booking.scheduledAt), "MMM d, h:mm a")}
                            </div>
                            <span className="text-[9px] font-bold truncate opacity-80" style={{ color }}>{member?.name.split(" ")[0]}</span>
                          </div>
                          <div className={`font-serif text-xl group-hover:text-primary transition-colors truncate text-foreground/90 ${isPast && booking.status === 'cancelled' ? 'line-through' : ''}`}>
                            {booking.serviceName}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })
              )}
              {filteredListBookings.length > 5 && (
                <div className="pt-2 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  +{filteredListBookings.length - 5} more
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}