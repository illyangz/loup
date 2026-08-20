import { useParams, Link } from "wouter"
import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { useGetProvider, useListProviderReviews } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Star, CheckCircle2, Clock, Award, Shield, ArrowLeft, ChevronRight } from "lucide-react"

const ratingChartConfig: ChartConfig = { count: { label: "Reviews", color: "hsl(var(--primary))" } }

export default function ProviderProfile() {
  const { id } = useParams<{ id: string }>()
  const providerId = Number(id)
  
  const { data: provider, isLoading } = useGetProvider(providerId, {
    query: { enabled: !!providerId, queryKey: ['getProvider', providerId] as const }
  })
  
  const { data: reviews, isLoading: isLoadingReviews } = useListProviderReviews(providerId, {
    query: { enabled: !!providerId, queryKey: ['listProviderReviews', providerId] as const }
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-4">
          <Skeleton className="h-24 w-24 rounded-lg" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
      </div>
    )
  }

  if (!provider) return <div>Provider not found</div>

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full bg-secondary">
          <Link href="/browse"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <Badge variant="secondary" className="font-normal">{provider.categoryName}</Badge>
      </div>

      <div className="space-y-6">
        <div className="flex gap-6 items-start">
          <div className="h-24 w-24 rounded-lg bg-primary flex items-center justify-center text-4xl font-serif text-primary-foreground shadow-md shrink-0">
            {provider.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl font-serif tracking-tight flex items-center gap-2">
              {provider.name}
              {provider.verified && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
            </h1>
            <p className="text-lg text-muted-foreground mt-1">{provider.tagline}</p>
            
            <div className="flex flex-wrap gap-4 mt-4 text-sm font-medium">
              <div className="flex items-center gap-1.5">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                {provider.rating.toFixed(1)} ({provider.reviewCount} reviews)
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Award className="h-5 w-5" />
                {provider.jobsCompleted}+ jobs
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-5 w-5" />
                {provider.yearsOnPlatform} yrs on Loup
              </div>
            </div>
          </div>
        </div>

        <p className="text-muted-foreground leading-relaxed">{provider.bio}</p>

        {provider.badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {provider.badges.map(badge => (
              <Badge key={badge} variant="outline" className="bg-background">
                <Shield className="h-3 w-3 mr-1 text-primary" />
                {badge}
              </Badge>
            ))}
          </div>
        )}

        {!isLoadingReviews && reviews && reviews.length > 0 && (
          <Card className="border-border/50">
            <CardContent className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">Rating breakdown</p>
              <ChartContainer config={ratingChartConfig} className="h-[140px] w-full">
                <BarChart
                  data={[5, 4, 3, 2, 1].map(stars => ({ stars: `${stars}★`, count: reviews.filter(r => Math.round(r.rating) === stars).length }))}
                  layout="vertical"
                  margin={{ left: 0, right: 12, top: 0, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="stars" width={28} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(value) => [`${value} reviews`, ""]} />} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={4} barSize={12} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Services */}
      <section className="space-y-4">
        <h2 className="text-2xl font-serif tracking-tight">Services</h2>
        <div className="grid gap-3">
          {provider.services.map(service => (
            <Link key={service.id} href={`/book/${provider.id}?serviceId=${service.id}`}>
              <Card className="border-border/50 hover:border-primary/50 transition-all hover:shadow-md cursor-pointer group">
                <CardContent className="p-5 flex justify-between items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-lg flex items-center gap-2">
                      {service.name}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{service.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-sm font-medium opacity-80">
                      <span>{service.price} AED</span>
                      <span className="text-muted-foreground/40">•</span>
                      <span className="text-muted-foreground">{service.durationMinutes} mins</span>
                    </div>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section className="space-y-4">
        <h2 className="text-2xl font-serif tracking-tight">Recent Reviews</h2>
        {isLoadingReviews ? (
          <Skeleton className="h-32 w-full" />
        ) : reviews?.length === 0 ? (
          <p className="text-muted-foreground">No reviews yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {reviews?.map(review => (
              <Card key={review.id} className="bg-secondary/30 border-0 shadow-none">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{review.authorName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium leading-none">{review.authorName}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-medium ml-1">{review.rating}</span>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/80">"{review.comment}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}