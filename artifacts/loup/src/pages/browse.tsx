import { useState } from "react"
import { Link } from "wouter"
import { useListCategories, useListProviders } from "@workspace/api-client-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Star, Clock, CheckCircle2, Building2, SlidersHorizontal, X } from "lucide-react"

function aed(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(v)
}

export default function Browse() {
  const initialCategory = new URLSearchParams(window.location.search).get("category") || ""

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory)
  const [availableNow, setAvailableNow] = useState(false)
  const [maxPrice, setMaxPrice] = useState<number>(500)
  const [showFilters, setShowFilters] = useState(false)

  const { data: categories, isLoading: isLoadingCategories } = useListCategories()
  const { data: providers, isLoading: isLoadingProviders } = useListProviders({
    category: selectedCategory || undefined,
    search: searchTerm || undefined,
    availableNow: availableNow ? true : undefined,
  })

  // Client-side price filter (backend doesn't have maxPrice param yet)
  const filteredProviders = providers?.filter(p => p.startingPrice <= maxPrice)

  const hasFilters = availableNow || maxPrice < 500

  const clearFilters = () => {
    setAvailableNow(false)
    setMaxPrice(500)
    setSearchTerm("")
    setSelectedCategory("")
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-serif tracking-tight">Catalog</h1>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="text-xs text-white/50 hover:text-white gap-1.5" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" /> Clear filters
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search services or providers…"
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
          <button
            className={`h-14 w-14 shrink-0 rounded-xl border transition-all flex items-center justify-center relative ${
              showFilters
                ? "bg-primary border-primary text-primary-foreground"
                : "glass-card border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30"
            }`}
            onClick={() => setShowFilters(!showFilters)}
            aria-label="Toggle filters"
          >
            <SlidersHorizontal className="h-5 w-5" />
            {maxPrice < 500 && !showFilters && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[8px] font-bold text-primary-foreground flex items-center justify-center">1</span>
            )}
          </button>
        </div>

        {/* Expandable filters panel */}
        {showFilters && (
          <div className="glass-card rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-white/70">Max price</label>
                <span className="text-sm font-semibold text-primary">{aed(maxPrice)}</span>
              </div>
              <input
                type="range"
                min={50}
                max={500}
                step={25}
                value={maxPrice}
                onChange={e => setMaxPrice(Number(e.target.value))}
                className="w-full accent-[hsl(var(--primary))] h-2 rounded-full"
              />
              <div className="flex justify-between text-xs text-white/30">
                <span>AED 50</span>
                <span>AED 500+</span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Institutional pricing banner */}
      <div className="flex items-center gap-2.5 rounded-2xl border border-primary/20 bg-primary/[0.06] px-4 py-3 text-sm text-white/70">
        <Building2 className="h-4 w-4 text-primary shrink-0" />
        <span>Prices shown include your <span className="font-semibold text-white">Meridian institutional discount</span>. Public prices are marked separately.</span>
      </div>

      {/* Category pills */}
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

      {/* Provider list */}
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
        ) : filteredProviders?.length === 0 ? (
          <div className="glass-card text-center py-12 px-4 rounded-2xl border-dashed">
            <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="font-medium">No providers found</h3>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search term</p>
            {(selectedCategory || searchTerm || availableNow || maxPrice < 500) && (
              <Button variant="link" onClick={clearFilters} className="mt-2 text-primary">
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          filteredProviders?.map(provider => {
            const institutionalPrice = Math.round(provider.startingPrice * 0.9)
            const saving = provider.startingPrice - institutionalPrice

            return (
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

                  {/* Price footer with institutional pricing */}
                  <div className="px-5 py-3 border-t border-border/50 flex justify-between items-center text-sm bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs line-through">{aed(provider.startingPrice)}</span>
                      <span className="text-xs text-white/40">public</span>
                      <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                        <Building2 className="h-3 w-3" />−{aed(saving)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-white/50">from</span>
                      <span className="font-semibold text-primary">{aed(institutionalPrice)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
