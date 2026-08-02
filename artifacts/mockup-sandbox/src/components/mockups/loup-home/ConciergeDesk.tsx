import React from 'react';
import { Home, Search, Calendar, Users, FileText, Sparkles, AirVent, Wrench, Scissors, HeartPulse, Bug, Droplets, Shirt, ArrowRight, Clock, Receipt, MapPin, ChevronRight, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import "./_group.css";

export function ConciergeDesk() {
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
    { name: "Laundry & Pressing", price: 45, icon: Shirt },
    { name: "Pool & Garden", price: 129, icon: Droplets }
  ];

  return (
    <div className="min-h-[100dvh] flex bg-background font-sans text-foreground selection:bg-[#C2A265]/20 selection:text-primary pb-20 lg:pb-0">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-[280px] border-r border-[#C2A265]/10 bg-card flex-col justify-between z-20">
        <div>
          <div className="p-10 pb-8">
            <a href="#" className="font-serif text-3xl font-medium tracking-tight text-primary flex items-center gap-2.5 group">
              <span className="w-8 h-8 bg-primary text-secondary flex items-center justify-center rounded-sm text-lg shadow-sm group-hover:bg-[#C2A265] transition-colors duration-300">L</span>
              Loup
            </a>
          </div>
          <nav className="px-5 space-y-1.5">
            {navItems.map(item => (
              <a key={item.label} href="#" className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-sm relative group",
                item.active ? "text-primary bg-primary/[0.03]" : "text-muted-foreground hover:text-primary hover:bg-secondary/30"
              )}>
                {item.active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#C2A265] rounded-r-full" />
                )}
                <item.icon className={cn("w-5 h-5", item.active ? "text-[#C2A265]" : "opacity-60 group-hover:opacity-100")} strokeWidth={item.active ? 2.5 : 2} />
                {item.label}
              </a>
            ))}
          </nav>
        </div>
        
        <div className="p-6">
          <div className="p-4 rounded-xl bg-secondary/40 border border-[#C2A265]/10 flex items-center gap-3 hover:bg-secondary/60 transition-colors cursor-pointer group">
            <div className="h-10 w-10 rounded-full bg-card border border-[#C2A265]/20 flex items-center justify-center text-primary font-serif text-lg shadow-sm group-hover:border-[#C2A265]/50 group-hover:text-[#C2A265] transition-colors">
              O
            </div>
            <div className="flex-1 overflow-hidden">
               <p className="font-medium text-sm text-primary truncate">Omar</p>
               <p className="text-[11px] text-muted-foreground truncate mt-0.5">Mansour Household • 5 members</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-[280px] relative w-full overflow-x-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#C2A265]/5 via-transparent to-transparent pointer-events-none" />
        
        <div className="p-6 md:p-12 lg:p-16 max-w-6xl mx-auto space-y-10 lg:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 fade-in-0 fill-mode-both relative z-10">
          
          {/* Greeting Header */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-4xl lg:text-5xl font-serif tracking-tight text-primary">Good evening, Omar.</h1>
              <p className="text-muted-foreground text-lg">Your household is running smoothly.</p>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <button className="h-10 w-10 rounded-full bg-card border border-[#C2A265]/20 flex items-center justify-center text-primary hover:bg-[#C2A265]/10 hover:text-[#C2A265] transition-colors shadow-sm">
                <Bell className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Glanceable Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Active Booking */}
            <div className="lg:col-span-7">
              <div className="border-0 bg-primary text-primary-foreground relative overflow-hidden shadow-xl rounded-[2rem] h-full min-h-[260px] group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#C2A265]/15 blur-[80px] rounded-full pointer-events-none mix-blend-screen -translate-y-1/2 translate-x-1/3" />
                <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}></div>
                
                <div className="p-8 lg:p-10 flex flex-col justify-between h-full relative z-10">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 backdrop-blur-md shadow-sm">
                      <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C2A265] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C2A265]"></span>
                      </div>
                      <span className="text-[11px] font-bold tracking-widest text-[#C2A265] uppercase">Active Now</span>
                    </div>
                  </div>

                  <div className="mt-10 flex gap-5 md:gap-6 items-center">
                    <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md shrink-0 shadow-inner group-hover:scale-105 group-hover:bg-white/10 transition-all duration-500">
                      <HeartPulse className="h-8 w-8 md:h-10 md:w-10 text-[#C2A265]" strokeWidth={1.5} />
                    </div>
                    <div className="space-y-1.5">
                      <h2 className="font-serif text-3xl md:text-4xl font-medium text-white tracking-tight">Home Physio Session</h2>
                      <p className="text-primary-foreground/70 text-base md:text-lg">Nightingale Home Care</p>
                    </div>
                  </div>

                  <div className="mt-10 pt-6 border-t border-white/10 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-2.5 text-sm md:text-base text-primary-foreground/70">
                      <MapPin className="h-4 w-4" />
                      <span>In progress at home</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm md:text-base text-[#C2A265]">
                      <Clock className="h-4 w-4" />
                      <span>Started ~25 mins ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bill Summary */}
            <div className="lg:col-span-5">
              <div className="border border-[#C2A265]/20 bg-secondary/40 relative overflow-hidden rounded-[2rem] h-full min-h-[260px] shadow-sm hover:shadow-md transition-shadow group">
                <div className="absolute inset-0 bg-gradient-to-br from-card/80 to-transparent pointer-events-none" />
                
                <div className="p-8 lg:p-10 flex flex-col justify-between h-full relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-card border border-[#C2A265]/20 flex items-center justify-center shadow-sm">
                        <Receipt className="h-5 w-5 text-[#C2A265]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-primary">August Statement</p>
                        <p className="text-xs text-muted-foreground mt-0.5">3 items so far</p>
                      </div>
                    </div>
                    <a href="#" className="h-10 w-10 rounded-full bg-card/60 hover:bg-card border border-[#C2A265]/20 flex items-center justify-center text-primary transition-colors shadow-sm">
                      <ChevronRight className="h-5 w-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:text-[#C2A265] transition-all" />
                    </a>
                  </div>
                  
                  <div className="mt-8">
                    <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground mb-3">Current Open Bill</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl lg:text-6xl font-serif font-medium tracking-tight text-primary">614</span>
                      <span className="text-base font-medium text-[#C2A265]">AED</span>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-[#C2A265]/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-sm text-primary/80">
                        <Calendar className="h-4 w-4 text-[#C2A265]" />
                        <span>2 upcoming bookings this week</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Categories */}
          <section className="space-y-6 pt-4">
            <div className="flex items-center justify-between border-b border-[#C2A265]/10 pb-5">
              <h2 className="text-2xl lg:text-3xl font-serif tracking-tight text-primary">Summon a Professional</h2>
              <a href="#" className="text-sm font-medium text-[#C2A265] hover:text-primary transition-colors flex items-center gap-1.5 group">
                Browse directory <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-5">
              {categories.map((category, i) => (
                <div 
                  key={category.name} 
                  className="group relative bg-card rounded-[1.25rem] p-6 border border-[#C2A265]/15 hover:border-[#C2A265]/50 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(194,162,101,0.08)] hover:-translate-y-0.5 cursor-pointer flex flex-col h-[150px]"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex justify-between items-start">
                    <div className="h-11 w-11 rounded-full bg-secondary/50 text-primary group-hover:bg-[#C2A265]/10 group-hover:text-[#C2A265] transition-colors flex items-center justify-center">
                      <category.icon className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <ArrowRight className="h-4 w-4 text-[#C2A265] opacity-0 -translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  </div>
                  <div className="mt-auto">
                    <h3 className="font-medium text-[15px] text-primary group-hover:text-primary transition-colors">{category.name}</h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="h-[1px] w-4 bg-[#C2A265]/40 group-hover:w-6 group-hover:bg-[#C2A265] transition-all duration-300" />
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">From {category.price} AED</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>
      
      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border flex justify-around items-center px-2 py-4 z-50">
        {navItems.map((item) => (
          <a 
            key={item.label} 
            href="#"
            className={cn(
              "flex flex-col items-center gap-1.5 p-2 rounded-xl min-w-[64px] transition-all",
              item.active ? "text-[#C2A265]" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className={cn("w-6 h-6", item.active && "fill-[#C2A265]/20")} strokeWidth={item.active ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
