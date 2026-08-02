import { useState, useMemo } from "react"
import { Link, useLocation } from "wouter"
import { useListCategories, useListProviders } from "@workspace/api-client-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, MapPin, Star, Clock, CheckCircle2, SlidersHorizontal } from "lucide-react"

export default function Browse() {
  const [searchParams] = useLocation()
  const initialCategory = new URLSearchParams(window.location.search).get("category") || ""
  
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory)
  const [availableNow, setAvailableNow] = useState(false)

  const { data: categories, isLoading: isLoadingCategories } = useListCategories()
  
  const { data: providers, isLoading: isLoadingProviders } = useListProviders({
    category: selectedCategory || undefined,
    search: searchTerm || undefined,
    availableNow: availableNow ? true : undefined
  })

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="space-y-4">
        <h1 className="text-3xl font-serif tracking-tight">Catalog</h1>
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Search services or providers..." 
              className="pl-11 h-14 bg-card shadow-sm border-border/50 text-base"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Button 
            variant={availableNow ? "default" : "outline"} 
            className="h-14 w-14 p-0 shrink-0 bg-card border-border/50 shadow-sm"
            onClick={() => setAvailableNow(!availableNow)}
            aria-label="Available Now"
          >
            <Clock className={`h-5 w-5 ${availableNow ? "text-primary-foreground" : "text-muted-foreground"}`} />
          </Button>
        </div>
      </header>

      {/* Categories Filter (Scrollable) */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
        <Button 
          variant={selectedCategory === "" ? "default" : "secondary"}
          className="rounded-full shrink-0"
          onClick={() => setSelectedCategory("")}
        >
          All Categories
        </Button>
        {isLoadingCategories ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-24 rounded-full shrink-0" />
          ))
        ) : (
          categories?.map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.slug ? "default" : "secondary"}
              className="rounded-full shrink-0 bg-card border border-border/50"
              onClick={() => setSelectedCategory(cat.slug)}
            >
              {cat.name}
            </Button>
          ))
        )}
      </div>

      {/* Provider List */}
      <div className="space-y-4">
        {isLoadingProviders ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-border">
              <CardContent className="p-5 flex gap-4">
                <Skeleton className="h-20 w-20 rounded-xl shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : providers?.length === 0 ? (
          <div className="text-center py-12 px-4 border-2 border-dashed border-border rounded-2xl">
            <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="font-medium">No providers found</h3>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search term</p>
            {(selectedCategory || searchTerm || availableNow) && (
              <Button 
                variant="link" 
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("");
                  setAvailableNow(false);
                }}
                className="mt-2"
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          providers?.map(provider => (
            <Link key={provider.id} href={`/providers/${provider.id}`}>
              <Card className="border-border/50 hover:border-primary/30 transition-all hover:shadow-md cursor-pointer overflow-hidden group">
                <CardContent className="p-0">
                  <div className="p-5 flex gap-4">
                    <div className="h-20 w-20 rounded-xl bg-secondary flex-shrink-0 flex items-center justify-center text-2xl font-serif text-primary border border-border/50">
                      {provider.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-serif text-lg leading-tight truncate group-hover:text-primary transition-colors flex items-center gap-1.5">
                            {provider.name}
                            {provider.verified && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-0.5">{provider.categoryName}</p>
                        </div>
                        {provider.availableNow && (
                          <Badge variant="success" className="shrink-0 text-[10px] px-2 py-0.5 hidden sm:inline-flex">Available Now</Badge>
                        )}
                      </div>
                      
                      <p className="text-sm mt-2 line-clamp-1 opacity-80">{provider.tagline}</p>
                      
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1 text-foreground">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span className="font-medium">{provider.rating.toFixed(1)}</span>
                          <span className="text-muted-foreground">({provider.reviewCount})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>~{provider.responseMinutes}m</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-secondary/30 px-5 py-3 border-t border-border/50 flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Starting from</span>
                    <span className="font-medium">{provider.startingPrice} AED</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}