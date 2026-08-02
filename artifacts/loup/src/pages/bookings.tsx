import { useState } from "react"
import { Link } from "wouter"
import { useListBookings, ListBookingsScope } from "@workspace/api-client-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Sparkles, AirVent, Wrench, Scissors, HeartPulse, Bug, Droplets, Shirt, CalendarClock, ChevronRight } from "lucide-react"

const ICONS: Record<string, any> = {
  Sparkles, AirVent, Wrench, Scissors, HeartPulse, Bug, Droplets, Shirt
}

export default function Bookings() {
  const [scope, setScope] = useState<ListBookingsScope>("all")
  const { data: bookings, isLoading } = useListBookings({ scope })

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="space-y-4">
        <h1 className="text-3xl font-serif tracking-tight">Bookings</h1>
        <Tabs>
          <TabsList className="w-full sm:w-auto overflow-x-auto justify-start scrollbar-none border border-border/50">
            <TabsTrigger 
              value="all" 
              active={scope === "all"} 
              onActive={() => setScope("all")}
            >All</TabsTrigger>
            <TabsTrigger 
              value="active" 
              active={scope === "active"} 
              onActive={() => setScope("active")}
            >Active</TabsTrigger>
            <TabsTrigger 
              value="upcoming" 
              active={scope === "upcoming"} 
              onActive={() => setScope("upcoming")}
            >Upcoming</TabsTrigger>
            <TabsTrigger 
              value="past" 
              active={scope === "past"} 
              onActive={() => setScope("past")}
            >Past</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border">
              <CardContent className="p-5 flex gap-4 items-center">
                <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : bookings?.length === 0 ? (
          <div className="text-center py-16 px-4 border-2 border-dashed border-border rounded-2xl">
            <CalendarClock className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="font-serif text-xl">No bookings found</h3>
            <p className="text-muted-foreground mt-2">You don't have any bookings in this view.</p>
          </div>
        ) : (
          bookings?.map(booking => {
            const Icon = ICONS[booking.categoryIcon] || Sparkles
            const isLive = ["confirmed", "en_route", "arrived", "in_progress"].includes(booking.status)
            
            return (
              <Link key={booking.id} href={`/bookings/${booking.id}`}>
                <Card className={`border-border hover:border-primary/50 transition-all hover:shadow-md cursor-pointer group ${isLive ? 'border-primary/30 bg-primary/5' : ''}`}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${isLive ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary'}`}>
                      <Icon className="h-6 w-6" strokeWidth={1.5} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-medium truncate group-hover:text-primary transition-colors">
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
                      <p className="text-sm text-muted-foreground truncate">{booking.providerName}</p>
                      
                      <div className="flex items-center gap-2 mt-2 text-xs font-medium text-foreground/80">
                        <span>{new Date(booking.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                        <span className="text-border">•</span>
                        <span className="truncate">{booking.addressLabel}</span>
                      </div>
                    </div>
                    
                    <ChevronRight className="h-5 w-5 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                  </CardContent>
                </Card>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}