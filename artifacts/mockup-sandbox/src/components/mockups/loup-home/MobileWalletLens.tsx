import React, { useState } from 'react';
import { Gamepad2, GraduationCap, Shirt, Sparkles, ShieldCheck, Coins, Users, Home, Search, Calendar, ChevronDown, ArrowUpRight, ArrowDownLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import "./MobileWalletLens.css";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const TEEN_CATEGORIES = [
  { id: 1, name: "Sneaker Care", startingPrice: 35, icon: Shirt, slug: "sneaker-care" },
  { id: 2, name: "Room Deep Clean", startingPrice: 85, icon: Sparkles, slug: "room-clean" },
  { id: 3, name: "Gaming Setup Help", startingPrice: 120, icon: Gamepad2, slug: "gaming-help" },
  { id: 4, name: "Study Tutors", startingPrice: 150, icon: GraduationCap, slug: "tutors" },
];

const TRANSACTIONS = [
  { id: 1, title: "Sneaker Deep Clean", type: "expense", amount: 105, date: "Today, 10:00 AM", status: "pending" },
  { id: 2, title: "Monthly Allowance", type: "income", amount: 500, date: "Sep 1, 09:00 AM", status: "completed" },
  { id: 3, title: "Study Tutor", type: "expense", amount: 150, date: "Aug 28, 04:30 PM", status: "completed" },
];

const NAV_ITEMS = [
  { id: 'home', label: "Home", icon: Home, isActive: true },
  { id: 'browse', label: "Catalog", icon: Search },
  { id: 'bookings', label: "Bookings", icon: Calendar },
  { id: 'pack', label: "The Pack", icon: Users },
];

export function MobileWalletLens() {
  const [isWalletExpanded, setIsWalletExpanded] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-8 font-sans">
      <div className="theme-wallet w-full sm:w-[390px] h-[100dvh] sm:h-[844px] bg-background relative overflow-hidden sm:rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.15)] sm:ring-[12px] ring-slate-900 flex flex-col">
        {/* Background ambient lighting */}
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#d27c4b]/10 to-transparent pointer-events-none" />

        <div className="flex-1 overflow-y-auto hide-scrollbar pb-32 px-5 pt-12 sm:pt-16 relative z-10 space-y-6">
          
          {/* Header */}
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-serif tracking-tight text-foreground leading-tight">
                Hey, Zayd
              </h1>
              <div className="text-muted-foreground mt-1 font-medium text-xs tracking-wide flex items-center gap-1.5">
                Mansour Household <span className="w-1 h-1 rounded-full bg-primary/40"></span> Junior
              </div>
            </div>
            <Avatar className="h-12 w-12 border-2 border-background shadow-sm bg-card shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary font-serif text-xl italic">
                Z
              </AvatarFallback>
            </Avatar>
          </header>

          {/* Interactive Wallet Card */}
          <Card 
            className={cn(
              "border border-white/50 bg-card/80 backdrop-blur-xl transition-all duration-500 cursor-pointer group relative overflow-hidden shadow-sm",
              isWalletExpanded ? "rounded-[2rem] bg-card shadow-lg shadow-primary/5" : "rounded-[2rem] hover:shadow-md hover:bg-card"
            )}
            onClick={() => setIsWalletExpanded(!isWalletExpanded)}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <CardContent className="p-5 sm:p-6 relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-[1.2rem] bg-secondary flex items-center justify-center text-primary shadow-inner group-hover:scale-105 transition-transform">
                    <Coins className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-bold mb-0.5 tracking-wider uppercase">Loup Wallet</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-serif tracking-tight text-foreground leading-none">185</span>
                      <span className="text-xs font-semibold text-muted-foreground">AED</span>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full">
                  Monthly Limit
                </Badge>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between text-[11px] font-semibold text-muted-foreground tracking-wide">
                  <span>Available</span>
                  <span>500 AED Total</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-primary rounded-full transition-all duration-1000 ease-out" style={{ width: '37%' }} />
                </div>
              </div>

              {/* Expandable Transactions */}
              <div className={cn(
                "grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.1)]",
                isWalletExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}>
                <div className="overflow-hidden">
                  <div className={cn(
                    "pt-6 mt-6 border-t border-border/50 transition-opacity duration-500",
                    isWalletExpanded ? "opacity-100 delay-150" : "opacity-0"
                  )}>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recent Activity</h4>
                      <span className="text-[10px] text-primary font-bold uppercase tracking-wider hover:underline">View All</span>
                    </div>
                    <div className="space-y-4">
                      {TRANSACTIONS.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "h-10 w-10 rounded-[1rem] flex items-center justify-center shrink-0 shadow-sm",
                              tx.type === "income" ? "bg-[#d27c4b]/10 text-[#d27c4b]" : "bg-white border border-border/50 text-muted-foreground"
                            )}>
                              {tx.type === "income" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-foreground">{tx.title}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">{tx.date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={cn(
                              "text-xs font-bold",
                              tx.type === "income" ? "text-[#d27c4b]" : "text-foreground"
                            )}>
                              {tx.type === "income" ? "+" : "-"}{tx.amount} AED
                            </p>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-1">{tx.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center mt-5 -mb-3">
                <div className="h-1 w-8 rounded-full bg-border group-hover:bg-primary/20 transition-colors" />
              </div>
            </CardContent>
          </Card>

          {/* Next Booking Stacked Card */}
          <div className="space-y-3 pt-2">
            <h3 className="font-serif text-xl text-foreground px-1">Up Next</h3>
            <Card className="border-0 bg-gradient-to-br from-[#d27c4b] to-[#b45d2e] text-primary-foreground relative overflow-hidden rounded-[2rem] shadow-xl shadow-[#d27c4b]/20 group cursor-pointer hover:-translate-y-1 transition-all duration-300">
              <div className="absolute right-0 top-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -mr-20 -mt-20 mix-blend-overlay pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
              <CardContent className="p-5 sm:p-6 relative z-10 flex flex-col justify-between h-[150px]">
                <div className="flex justify-between items-start mb-4">
                  <Badge variant="outline" className="bg-white/10 text-white border-white/20 backdrop-blur-md px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 rounded-full">
                    <ShieldCheck className="h-3 w-3" />
                    Dad Approved
                  </Badge>
                  <div className="text-right flex flex-col items-end text-white">
                    <span className="text-xl font-serif">Tomorrow</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 mt-0.5">10:00 AM</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-white">
                  <div className="h-12 w-12 rounded-[1.2rem] bg-white/15 flex items-center justify-center backdrop-blur-md shadow-inner shrink-0 group-hover:scale-105 group-hover:rotate-3 transition-transform duration-500">
                    <Shirt className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-serif text-xl leading-tight">Sneaker Deep Clean</p>
                    <p className="text-xs opacity-90 font-medium mt-1">3 Pairs • 105 AED</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Services Vertical Stack */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-between px-1 mb-2">
              <h3 className="font-serif text-xl text-foreground">Services</h3>
              <span className="text-[10px] text-primary font-bold uppercase tracking-wider cursor-pointer hover:underline">See All</span>
            </div>
            <div className="space-y-3">
              {TEEN_CATEGORIES.map((cat) => (
                <Card key={cat.id} className="border border-white/50 bg-card/60 backdrop-blur-xl hover:bg-card transition-all duration-300 rounded-[1.5rem] hover:-translate-y-0.5 hover:shadow-md cursor-pointer group shadow-sm">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-[1rem] bg-secondary/80 text-primary flex items-center justify-center group-hover:scale-105 transition-transform shadow-inner">
                      <cat.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-serif text-lg leading-none text-foreground">{cat.name}</h4>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1.5">From {cat.startingPrice} AED</p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-background border border-border/50 flex items-center justify-center group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground transition-colors shadow-sm shrink-0">
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          {/* Spacer for glass tab bar */}
          <div className="h-12" />
        </div>

        {/* Glass Bottom Tab Bar */}
        <nav className="absolute bottom-0 left-0 right-0 glass-tab-bar pb-6 pt-4 px-6 flex justify-around items-center z-50">
          {NAV_ITEMS.map((item) => (
            <button 
              key={item.id} 
              className={cn(
                "flex flex-col items-center gap-1.5 min-w-[64px] transition-all relative",
                item.isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative z-10">
                <item.icon className={cn("w-6 h-6 transition-all duration-300", item.isActive && "fill-primary/10 scale-110")} strokeWidth={item.isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                "text-[9px] font-bold tracking-wider uppercase transition-all duration-300",
                item.isActive ? "text-primary translate-y-0 opacity-100" : "translate-y-1 opacity-0 absolute -bottom-4"
              )}>
                {item.label}
              </span>
              {item.isActive && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-12 bg-primary/10 rounded-full blur-md pointer-events-none" />
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
