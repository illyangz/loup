import { useState } from "react"
import { Link } from "wouter"
import { useListCategories, useListProviders } from "@workspace/api-client-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Star, Clock, CheckCircle2 } from "lucide-react"

export default function Browse() {
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
              className="pl-11 h-14 bg-card/60 border-border/50 text-base backdrop-blur-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            className={`h-14 w-14 shrink-0 rounded-xl border transition-all flex items-center justify-center ${
              availableNow
                ? "bg-primary border-primary text-primary-foreground"
                : "glass-card border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30"
            }`}
            onClick={() => setAvailableNow(!availableNow)}
            aria-label="Available Now"
          >
            <Clock className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Categories Filter (Scrollable) */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
        <button
          className={`rounded-full shrink-0 px-4 py-2 text-sm font-medium transition-all border ${
            selectedCategory === ""
              ? "bg-primary border-primary text-primary-foreground"
              : "glass-card text-muted-foreground hover:text-foreground hover:border-primary/30"
          }`}
          onClick={() => setSelectedCategory("")}
        >
          All Categories
        </button>
        {isLoadingCategories ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-full shrink-0" />
          ))
        ) : (
          categories?.map(cat => (
            <button
              key={cat.id}
              className={`rounded-full shrink-0 px-4 py-2 text-sm font-medium transition-all border ${
                selectedCategory === cat.slug
                  ? "bg-primary border-primary text-primary-foreground"
                  : "glass-card text-muted-foreground hover:text-foreground hover:border-primary/30"
              }`}
              onClick={() => setSelectedCategory(cat.slug)}
            >
              {cat.name}
            </button>
          ))
        )}
      </div>

      {/* Provider List */}
      <div className="space-y-4">
        {isLoadingProviders ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl">
              <div className="p-5 flex gap-4">
                <Skeleton className="h-20 w-20 rounded-xl shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </div>
            </div>
          ))
        ) : providers?.length === 0 ? (
          <div className="glass-card text-center py-12 px-4 rounded-2xl border-dashed">
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
                className="mt-2 text-primary"
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          providers?.map(provider => (
            <Link key={provider.id} href={`/providers/${provider.id}`} className="block group">
              <div className="glass-card rounded-2xl overflow-hidden cursor-pointer">
                <div className="p-5 flex gap-4">
                  <div className="h-20 w-20 rounded-xl bg-primary/10 border border-primary/15 flex-shrink-0 flex items-center justify-center text-2xl font-serif text-primary">
                    {provider.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-serif text-lg leading-tight truncate group-hover:text-primary transition-colors flex items-center gap-1.5">
                          {provider.name}
                          {provider.verified && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">{provider.categoryName}</p>
                      </div>
                      {provider.availableNow && (
                        <Badge className="shrink-0 text-[10px] px-2 py-0.5 hidden sm:inline-flex bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20">
                          Available Now
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm mt-2 line-clamp-1 text-muted-foreground">{provider.tagline}</p>

                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-primary text-primary" />
                        <span className="font-medium text-foreground">{provider.rating.toFixed(1)}</span>
                        <span className="text-muted-foreground">({provider.reviewCount})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>~{provider.responseMinutes}m</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-3 border-t border-border/50 flex justify-between items-center text-sm bg-white/[0.02]">
                  <span className="text-muted-foreground">Starting from</span>
                  <span className="font-medium text-primary">{provider.startingPrice} AED</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
