import React from 'react';
import { Home, Search, Calendar, Users, FileText, Sparkles, AirVent, Wrench, Scissors, HeartPulse, Bug, Droplets, Shirt, ArrowRight, Clock, Receipt, MapPin, ChevronRight, Bell, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileCompanion() {
  const navItems = [
    { label: "Home", icon: Home, active: true },
    { label: "Catalog", icon: Search },
    { label: "Bookings", icon: Calendar },
    { label: "The Pack", icon: Users },
    { label: "Billing", icon: FileText },
  ];

  const categories = [
    { name: "Home Cleaning", price: 99, icon: Sparkles },
    { name: "AC & Cooling", price: 149, icon: AirVent },
    { name: "Handyman", price: 79, icon: Wrench },
    { name: "Beauty at Home", price: 120, icon: Scissors },
    { name: "Health at Home", price: 199, icon: HeartPulse },
    { name: "Pest Control", price: 199, icon: Bug },
    { name: "Laundry", price: 45, icon: Shirt },
    { name: "Pool & Garden", price: 129, icon: Droplets }
  ];

  return (
    <div className="w-[390px] h-[844px] bg-[#FAF8F5] font-sans text-[#1A1A1A] selection:bg-[#C2A265]/20 selection:text-[#1A1A1A] relative overflow-hidden flex flex-col mx-auto shadow-2xl rounded-[40px] border-[8px] border-black my-8 shrink-0">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#C2A265]/10 via-transparent to-transparent pointer-events-none" />

      {/* Main Scrollable Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-28 pt-12 px-5 space-y-6 relative z-10 scrollbar-hide">
        
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-full bg-white border border-[#C2A265]/20 flex items-center justify-center text-[#1A1A1A] font-serif text-lg shadow-sm">
              O
            </div>
            <div>
              <h1 className="text-xl font-serif tracking-tight text-[#1A1A1A]">Good evening, Omar</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Mansour Household • 5 members</p>
            </div>
          </div>
          <button className="h-10 w-10 rounded-full bg-white border border-[#C2A265]/20 flex items-center justify-center text-[#1A1A1A] shadow-sm relative">
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#C2A265] rounded-full border-2 border-white"></span>
            <Bell className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </header>

        {/* Active Session Stacked Card */}
        <div className="border-0 bg-[#1A1A1A] text-white relative overflow-hidden shadow-xl rounded-3xl mt-4 shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#C2A265]/20 blur-[50px] rounded-full pointer-events-none mix-blend-screen -translate-y-1/2 translate-x-1/3" />
          
          <div className="p-6 relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 backdrop-blur-md shadow-sm">
                <div className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C2A265] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#C2A265]"></span>
                </div>
                <span className="text-[10px] font-bold tracking-widest text-[#C2A265] uppercase">Active Now</span>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <div className="h-14 w-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md shrink-0 shadow-inner">
                <HeartPulse className="h-7 w-7 text-[#C2A265]" strokeWidth={1.5} />
              </div>
              <div className="space-y-1">
                <h2 className="font-serif text-2xl font-medium text-white tracking-tight leading-none">Home Physio</h2>
                <p className="text-white/70 text-sm">Nightingale Home Care</p>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-white/10 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm text-white/80">
                <MapPin className="h-4 w-4 text-[#C2A265]" />
                <span>In progress at home</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/80">
                <Clock className="h-4 w-4 text-[#C2A265]" />
                <span>Started ~25 mins ago</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Bill Summary */}
        <div className="border border-[#C2A265]/20 bg-white relative overflow-hidden rounded-3xl shadow-sm p-6 shrink-0 flex items-center justify-between">
           <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1">Current Open Bill</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-serif font-medium tracking-tight text-[#1A1A1A]">614</span>
                <span className="text-xs font-medium text-[#C2A265]">AED</span>
              </div>
           </div>
           <button className="h-12 w-12 rounded-full bg-[#FAF8F5] border border-[#C2A265]/20 flex items-center justify-center text-[#1A1A1A] shadow-sm">
             <ChevronRight className="h-5 w-5 text-[#C2A265]" />
           </button>
        </div>

        {/* Categories Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-serif tracking-tight text-[#1A1A1A]">Summon</h2>
            <a href="#" className="text-xs font-medium text-[#C2A265] flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </a>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {categories.slice(0, 6).map((category, i) => (
              <div 
                key={category.name} 
                className="bg-white rounded-2xl p-4 border border-[#C2A265]/15 flex flex-col h-[120px] shadow-sm"
              >
                <div className="h-10 w-10 rounded-full bg-[#FAF8F5] text-[#1A1A1A] flex items-center justify-center mb-auto">
                  <category.icon className="h-5 w-5 text-[#C2A265]" strokeWidth={1.5} />
                </div>
                <div className="mt-auto">
                  <h3 className="font-medium text-sm text-[#1A1A1A] leading-tight">{category.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="h-[1px] w-3 bg-[#C2A265]/40" />
                    <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">From {category.price}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Floating Action Button */}
      <div className="absolute bottom-28 right-5 z-40">
         <button className="h-14 w-14 rounded-full bg-[#C2A265] text-white flex items-center justify-center shadow-lg shadow-[#C2A265]/30">
            <Plus className="h-6 w-6" strokeWidth={2} />
         </button>
      </div>

      {/* Glass Bottom Nav */}
      <div className="absolute bottom-6 left-5 right-5 z-50">
        <nav className="bg-white/80 backdrop-blur-2xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-3xl flex justify-around items-center px-2 py-3">
          {navItems.map((item) => (
            <a 
              key={item.label} 
              href="#"
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl min-w-[56px] transition-all relative",
                item.active ? "text-[#C2A265]" : "text-[#1A1A1A]/40 hover:text-[#1A1A1A]"
              )}
            >
              {item.active && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#C2A265] rounded-b-full shadow-[0_4px_12px_rgb(194,162,101,0.5)]" />
              )}
              <item.icon className={cn("w-6 h-6", item.active && "fill-[#C2A265]/10")} strokeWidth={item.active ? 2 : 1.5} />
              <span className="text-[9px] font-medium tracking-tight">{item.label}</span>
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
