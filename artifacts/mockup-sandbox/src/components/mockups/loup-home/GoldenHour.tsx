import React from 'react';
import { Sparkles, AirVent, Wrench, Scissors, HeartPulse, Bug, Droplets, Shirt, ArrowRight, Receipt, Users, Home, Search, Calendar, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import "./_goldenhour.css";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = [
  { id: 1, name: "Home Cleaning", startingPrice: 99, icon: Sparkles, slug: "home-cleaning" },
  { id: 2, name: "AC & Cooling", startingPrice: 149, icon: AirVent, slug: "ac-cooling" },
  { id: 3, name: "Handyman", startingPrice: 79, icon: Wrench, slug: "handyman" },
  { id: 4, name: "Beauty at Home", startingPrice: 120, icon: Scissors, slug: "beauty-at-home" },
  { id: 5, name: "Health at Home", startingPrice: 199, icon: HeartPulse, slug: "health-at-home" },
  { id: 6, name: "Pest Control", startingPrice: 199, icon: Bug, slug: "pest-control" },
  { id: 7, name: "Laundry & Pressing", startingPrice: 45, icon: Shirt, slug: "laundry" },
  { id: 8, name: "Pool & Garden", startingPrice: 129, icon: Droplets, slug: "pool-garden" },
];

export function GoldenHour() {
  const navItems = [
    { href: "/", label: "Home", icon: Home, isActive: true },
    { href: "/browse", label: "Catalog", icon: Search },
    { href: "/bookings", label: "Bookings", icon: Calendar },
    { href: "/household", label: "The Pack", icon: Users },
    { href: "/billing", label: "Billing", icon: FileText },
  ];

  return (
    <div className="theme-golden-hour bg-background text-foreground min-h-[100dvh] flex flex-col pb-[80px] md:pb-0 md:pl-[240px] relative overflow-x-hidden">
      <div className="absolute inset-0 bg-sunlight pointer-events-none" />
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-[240px] fixed top-0 left-0 h-screen border-r border-border/60 bg-card/40 backdrop-blur-3xl z-20">
        <div className="p-8">
          <a href="/" className="font-serif text-4xl font-normal tracking-tight text-primary italic">Loup</a>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <a 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium text-sm",
                item.isActive 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 md:p-8 md:pt-12 relative z-10">
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
          
          {/* Greeting Header */}
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-foreground leading-tight">
                Good evening, Omar
              </h1>
              <div className="text-muted-foreground mt-2 font-medium text-sm sm:text-base tracking-wide">
                Mansour Household
              </div>
            </div>
            <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2 border-background shadow-sm bg-card shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary font-serif text-2xl italic">
                O
              </AvatarFallback>
            </Avatar>
          </header>

          {/* Glanceable Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Active Booking */}
            <Card className="border-0 bg-gradient-to-br from-[#d27c4b] to-[#b45d2e] text-primary-foreground relative overflow-hidden group golden-shadow rounded-[2rem]">
              <div className="absolute right-0 top-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -mr-20 -mt-20 mix-blend-overlay pointer-events-none transition-transform duration-1000 group-hover:scale-110" />
              <a href="/bookings/1" className="absolute inset-0 z-10" />
              <CardContent className="p-6 sm:p-7 relative z-10 flex flex-col justify-between h-full min-h-[160px]">
                <div className="flex justify-between items-start mb-6">
                  <Badge variant="outline" className="bg-white/10 text-white border-white/20 backdrop-blur-md font-medium tracking-wide px-3 py-1 text-xs">
                    Active Now
                  </Badge>
                  <div className="text-right flex flex-col items-end text-white">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-serif">4:30</span>
                      <span className="text-sm opacity-90 font-medium">PM</span>
                    </div>
                    <span className="text-xs font-semibold tracking-widest uppercase opacity-80 mt-0.5">Tue 14</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-white">
                  <div className="h-12 w-12 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-md shadow-inner shrink-0 group-hover:scale-110 transition-transform duration-500">
                    <HeartPulse className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-serif text-2xl leading-tight">Home Physio Session</p>
                    <p className="text-sm opacity-90 font-medium mt-1">Nightingale Home Care</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bill Summary */}
            <Card className="border-0 bg-card/80 backdrop-blur-sm group relative golden-shadow-sm hover:shadow-lg transition-all duration-500 rounded-[2rem] hover:-translate-y-1">
              <a href="/billing" className="absolute inset-0 z-10" />
              <CardContent className="p-6 sm:p-7 flex flex-col justify-between h-full min-h-[160px]">
                <div className="flex items-center justify-between mb-6">
                  <div className="h-12 w-12 rounded-full bg-secondary/80 flex items-center justify-center text-primary group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shrink-0">
                    <Receipt className="h-6 w-6" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-transform duration-500 group-hover:translate-x-1" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium mb-1.5 tracking-wide">Current open bill</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl sm:text-5xl font-serif tracking-tight text-foreground">614</span>
                    <span className="text-sm font-semibold tracking-wide text-muted-foreground">AED</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Categories */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-serif text-foreground">Summon a Professional</h2>
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-full px-4">
                <a href="/browse" className="font-medium text-sm">See all <ArrowRight className="ml-2 h-4 w-4" /></a>
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {CATEGORIES.map((category, i) => {
                const Icon = category.icon;
                return (
                  <a key={category.id} href={`/browse?category=${category.slug}`} className="block h-full outline-none group animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${150 + i * 50}ms` }}>
                    <Card className="border-0 bg-card/60 backdrop-blur-sm hover:bg-card transition-all duration-500 golden-shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(160,110,80,0.15)] hover:-translate-y-1.5 h-full rounded-[1.5rem]">
                      <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                        <div className="h-14 w-14 rounded-2xl bg-secondary/80 text-primary flex items-center justify-center group-hover:rotate-6 group-hover:scale-110 transition-all duration-500 shadow-sm">
                          <Icon className="h-6 w-6" strokeWidth={1.5} />
                        </div>
                        <div>
                          <h3 className="font-serif text-xl leading-tight text-foreground">{category.name}</h3>
                          <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/80 mt-2">From {category.startingPrice} AED</p>
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                )
              })}
            </div>
          </section>
          
          {/* Quick Call-to-action / Browse */}
          <Button asChild size="lg" className="w-full sm:hidden bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-2xl h-14 text-base shadow-lg shadow-primary/20">
            <a href="/browse">Browse full catalog</a>
          </Button>

        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex justify-around items-center px-2 py-3 z-50 pb-safe bg-card/80 backdrop-blur-3xl border-t border-border/40">
        {navItems.map((item) => (
          <a 
            key={item.href} 
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1.5 p-2 rounded-2xl min-w-[64px] transition-all",
              item.isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className={cn("w-6 h-6 transition-all duration-300", item.isActive && "fill-primary/20 scale-110")} strokeWidth={item.isActive ? 2.5 : 2} />
            <span className="text-[10px] font-bold tracking-wide uppercase">{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  )
}
