import { Link } from "wouter"
import { useGetHomeSummary, useListCategories } from "@workspace/api-client-react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Sparkles, AirVent, Wrench, Scissors, HeartPulse, Bug, Droplets, Shirt, ArrowRight, Clock, Receipt, User, Loader2 } from "lucide-react"

const ICONS: Record<string, any> = {
  Sparkles, AirVent, Wrench, Scissors, HeartPulse, Bug, Droplets, Shirt
}

export default function Home() {
  const { data: summary, isLoading: isLoadingSummary } = useGetHomeSummary()
  const { data: categories, isLoading: isLoadingCategories } = useListCategories()

  const activeOrNext = summary?.activeBooking || summary?.nextBooking

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 5) return "Good evening"
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }
  const firstName = (name?: string) => (name ? name.split(" ")[0] : "")

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Greeting Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif tracking-tight">
            {isLoadingSummary ? <Skeleton className="h-9 w-48" /> : `${greeting()}, ${firstName(summary?.memberName)}`}
          </h1>
          <div className="text-muted-foreground mt-1">
            {isLoadingSummary ? <Skeleton className="h-5 w-32" /> : summary?.householdName}
          </div>
        </div>
        <Avatar className="h-12 w-12 border-2 border-primary/10">
          <AvatarFallback className="bg-primary/5 text-primary text-lg">
            {summary?.memberName?.[0] || <User className="h-5 w-5" />}
          </AvatarFallback>
        </Avatar>
      </header>

      {/* Glanceable Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Next/Active Booking */}
        {isLoadingSummary ? (
          <Card className="border-0 bg-primary/5 shadow-none"><CardContent className="p-6 h-32 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary/30"/></CardContent></Card>
        ) : activeOrNext ? (
          <Card className="border-0 bg-primary text-primary-foreground relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10" />
            <Link href={`/bookings/${activeOrNext.id}`} className="absolute inset-0 z-10" />
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <Badge variant="outline" className="bg-white/10 text-primary-foreground border-white/20">
                  {summary?.activeBooking ? "Active Now" : "Up Next"}
                </Badge>
                <div className="text-right">
                  <p className="text-sm font-medium opacity-80">
                    {new Date(activeOrNext.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </p>
                  <p className="text-xs opacity-60">
                    {new Date(activeOrNext.scheduledAt).toLocaleDateString([], { weekday: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                  {(() => {
                    const Icon = ICONS[activeOrNext.categoryIcon] || Sparkles
                    return <Icon className="h-5 w-5" />
                  })()}
                </div>
                <div>
                  <p className="font-medium text-lg leading-tight">{activeOrNext.serviceName}</p>
                  <p className="text-sm opacity-80">{activeOrNext.providerName}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border border-dashed bg-transparent shadow-none flex flex-col justify-center items-center text-center p-6 min-h-[140px]">
            <Clock className="h-8 w-8 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No upcoming bookings</p>
          </Card>
        )}

        {/* Bill Summary */}
        <Card className="border-0 bg-secondary group relative">
          <Link href="/billing" className="absolute inset-0 z-10" />
          <CardContent className="p-6 flex flex-col justify-between h-full min-h-[140px]">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center text-primary">
                <Receipt className="h-5 w-5" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
            </div>
            <div>
              <p className="text-sm text-secondary-foreground/70 font-medium mb-1">Current open bill</p>
              {isLoadingSummary ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-serif font-medium tracking-tight text-secondary-foreground">{summary?.openBillTotal}</span>
                  <span className="text-sm font-medium text-secondary-foreground/60">AED</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-serif">Summon a Professional</h2>
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/browse">See all <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
        
        {isLoadingCategories ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categories?.slice(0, 8).map(category => {
              const Icon = ICONS[category.icon] || Sparkles
              return (
                <Link key={category.id} href={`/browse?category=${category.slug}`}>
                  <Card className="border-border hover:border-primary/30 transition-all hover:shadow-md cursor-pointer group h-full">
                    <CardContent className="p-5 flex flex-col items-center text-center space-y-3">
                      <div className="h-12 w-12 rounded-full bg-secondary text-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Icon className="h-6 w-6" strokeWidth={1.5} />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">{category.name}</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">From {category.startingPrice} AED</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </section>
      
      {/* Quick Call-to-action / Browse */}
      <Button asChild size="lg" className="w-full sm:hidden">
        <Link href="/browse">Browse full catalog</Link>
      </Button>

    </div>
  )
}