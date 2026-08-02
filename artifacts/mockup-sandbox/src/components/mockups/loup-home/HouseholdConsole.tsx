import React from "react";
import { 
  Sparkles, 
  AirVent, 
  Wrench, 
  Scissors, 
  HeartPulse, 
  Bug, 
  Droplets, 
  Shirt, 
  ArrowRight,
  Receipt,
  Calendar,
  Users,
  Activity
} from "lucide-react";
import "./_group.css";

const categories = [
  { name: "Home Cleaning", price: 99, icon: Sparkles },
  { name: "AC & Cooling", price: 149, icon: AirVent },
  { name: "Handyman", price: 79, icon: Wrench },
  { name: "Beauty at Home", price: 120, icon: Scissors },
  { name: "Health at Home", price: 199, icon: HeartPulse },
  { name: "Pest Control", price: 199, icon: Bug },
  { name: "Laundry & Pressing", price: 45, icon: Shirt },
  { name: "Pool & Garden", price: 129, icon: Droplets },
];

const members = [
  { name: "Omar", initial: "O" },
  { name: "Layla", initial: "L" },
  { name: "Zayd", initial: "Z" },
  { name: "Mariam", initial: "M" },
  { name: "Nadia", initial: "N" },
];

const navItems = ["Home", "Catalog", "Bookings", "The Pack", "Billing"];

export function HouseholdConsole() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary">
      {/* Top Nav Bar */}
      <header className="h-20 border-b border-border/50 px-8 flex items-center justify-between bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-12">
          <div className="font-serif text-3xl text-primary tracking-tight">Loup</div>
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className={`text-sm font-medium transition-colors ${
                  item === "Home" 
                    ? "text-primary border-b-2 border-primary py-7" 
                    : "text-muted-foreground hover:text-foreground py-7 border-b-2 border-transparent"
                }`}
              >
                {item}
              </a>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-primary">Omar</div>
            <div className="text-xs text-muted-foreground">Mansour Household</div>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-serif">
            O
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="max-w-[1600px] mx-auto p-8 flex flex-col lg:flex-row gap-12 lg:gap-16 items-start animate-in fade-in duration-700 zoom-in-95">
        
        {/* Main Stage */}
        <main className="flex-1 w-full space-y-12">
          
          {/* Live Status Band */}
          <section>
            <div className="bg-primary text-primary-foreground rounded-3xl p-8 sm:p-10 relative overflow-hidden card-shadow">
              {/* Decorative elements */}
              <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <div className="absolute left-1/4 bottom-0 w-48 h-48 bg-secondary/5 rounded-full blur-2xl -mb-10 pointer-events-none" />
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md shrink-0 border border-white/20">
                    <HeartPulse className="h-8 w-8 animate-pulse text-secondary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2.5 py-1 rounded-full bg-white/10 text-[10px] uppercase tracking-wider font-semibold text-secondary backdrop-blur-sm border border-white/10 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" />
                        Active Now
                      </span>
                      <span className="text-sm opacity-80 flex items-center gap-1"><Activity className="w-3 h-3"/> In progress at home</span>
                    </div>
                    <h2 className="font-serif text-3xl sm:text-4xl leading-tight mb-1">Home Physio Session</h2>
                    <p className="text-primary-foreground/80 font-medium">Nightingale Home Care</p>
                  </div>
                </div>
                
                <div className="bg-black/20 rounded-2xl p-5 backdrop-blur-sm border border-white/10 text-right shrink-0">
                  <div className="text-sm opacity-80 mb-1">Started</div>
                  <div className="text-2xl font-serif">~25 mins ago</div>
                  <button className="mt-4 text-xs font-medium text-secondary hover:text-white transition-colors flex items-center justify-end gap-1 w-full">
                    View Details <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Directory */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-serif text-primary tracking-tight">Summon a Professional</h2>
              <a href="#catalog" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                Full Catalog <ArrowRight className="w-4 h-4" />
              </a>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 lg:gap-x-16 gap-y-2">
              {categories.map((cat, idx) => (
                <a 
                  key={cat.name}
                  href={`#${cat.name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                  className="group flex items-center justify-between py-4 border-b border-border/60 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-secondary/50 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <cat.icon className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <span className="font-medium text-foreground group-hover:text-primary transition-colors text-lg">{cat.name}</span>
                  </div>
                  <div className="text-right flex flex-col">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">From</span>
                    <span className="font-serif text-primary">{cat.price} AED</span>
                  </div>
                </a>
              ))}
            </div>
          </section>

        </main>

        {/* Ledger Rail */}
        <aside className="w-full lg:w-[380px] xl:w-[420px] shrink-0 flex flex-col gap-8">
          
          {/* Open Bill */}
          <div className="bg-secondary/40 rounded-3xl p-8 border border-border/50 relative group">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-primary font-medium">
                <Receipt className="w-5 h-5" />
                <h3>Open Bill</h3>
              </div>
              <span className="text-xs font-semibold bg-background px-2.5 py-1 rounded-full text-muted-foreground">August</span>
            </div>
            
            <div className="mb-6">
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-5xl font-serif text-primary tracking-tight">614</span>
                <span className="text-sm font-medium text-primary/60 uppercase tracking-widest">AED</span>
              </div>
              <p className="text-sm text-muted-foreground">3 items so far this statement</p>
            </div>
            
            <button className="w-full py-3 px-4 bg-background rounded-xl text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors border border-border/50 group-hover:border-primary/20">
              View Statement
            </button>
          </div>

          {/* Upcoming */}
          <div className="bg-background rounded-3xl p-8 border border-border/60 card-shadow">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-primary font-medium">
                <Calendar className="w-5 h-5" />
                <h3>This Week</h3>
              </div>
              <span className="text-xs font-medium text-muted-foreground">2 Scheduled</span>
            </div>
            
            <div className="space-y-6">
              <div className="relative pl-6 before:absolute before:left-[3px] before:top-2 before:bottom-[-24px] before:w-[2px] before:bg-border last:before:hidden">
                <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-primary ring-4 ring-background" />
                <div className="text-xs font-medium text-muted-foreground mb-1">Tomorrow, 9:00 AM</div>
                <div className="font-medium text-foreground">Deep Home Cleaning</div>
                <div className="text-sm text-muted-foreground mt-0.5">Spotless Crew</div>
              </div>
              
              <div className="relative pl-6 before:absolute before:left-[3px] before:top-2 before:bottom-[-24px] before:w-[2px] before:bg-border last:before:hidden">
                <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-primary/40 ring-4 ring-background" />
                <div className="text-xs font-medium text-muted-foreground mb-1">Thursday, 2:00 PM</div>
                <div className="font-medium text-foreground">Pool Service</div>
                <div className="text-sm text-muted-foreground mt-0.5">Oasis Pools</div>
              </div>
            </div>
          </div>

          {/* The Pack */}
          <div className="bg-background rounded-3xl p-8 border border-border/60 card-shadow">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-primary font-medium">
                <Users className="w-5 h-5" />
                <h3>The Pack</h3>
              </div>
              <a href="#pack" className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors">Manage</a>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex -space-x-3">
                {members.map((member, i) => (
                  <div 
                    key={member.name} 
                    className="w-10 h-10 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-secondary-foreground font-serif text-sm relative group cursor-pointer hover:-translate-y-1 transition-transform"
                    style={{ zIndex: members.length - i }}
                    title={member.name}
                  >
                    {member.initial}
                  </div>
                ))}
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                5 Members
              </div>
            </div>
          </div>

        </aside>

      </div>
    </div>
  );
}
