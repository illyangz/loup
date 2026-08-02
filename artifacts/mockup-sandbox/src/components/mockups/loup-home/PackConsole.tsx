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
  Activity,
  MessageSquare,
  Check,
  Send
} from "lucide-react";
import "./_goldenhour.css";

const categories = [
  { name: "Home Cleaning", price: 99, icon: Sparkles, slug: "home-cleaning" },
  { name: "AC & Cooling", price: 149, icon: AirVent, slug: "ac-cooling" },
  { name: "Handyman", price: 79, icon: Wrench, slug: "handyman" },
  { name: "Beauty at Home", price: 120, icon: Scissors, slug: "beauty-at-home" },
  { name: "Health at Home", price: 199, icon: HeartPulse, slug: "health-at-home" },
  { name: "Pest Control", price: 199, icon: Bug, slug: "pest-control" },
  { name: "Laundry & Pressing", price: 45, icon: Shirt, slug: "laundry-pressing" },
  { name: "Pool & Garden", price: 129, icon: Droplets, slug: "pool-garden" },
];

const navItems = ["Home", "Catalog", "Bookings", "The Pack", "Billing"];

export function PackConsole() {
  return (
    <div className="theme-golden-hour min-h-[100dvh] bg-background text-foreground relative overflow-x-hidden selection:bg-primary/20 selection:text-primary pb-12">
      <div className="absolute inset-0 bg-sunlight pointer-events-none" />
      
      {/* Top Nav Bar */}
      <header className="h-20 border-b border-border/50 px-6 sm:px-8 flex items-center justify-between bg-card/60 backdrop-blur-3xl sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-12">
          <div className="font-serif text-4xl font-normal tracking-tight text-primary italic">Loup</div>
          <nav className="hidden lg:flex items-center gap-8">
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
            <div className="text-sm font-semibold text-foreground">Omar</div>
            <div className="text-xs font-medium text-muted-foreground">Mansour Household</div>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-center text-primary font-serif text-xl italic shrink-0 hover:scale-105 transition-transform cursor-pointer">
            O
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="max-w-[1600px] mx-auto p-6 sm:p-8 flex flex-col xl:flex-row gap-10 lg:gap-14 items-start animate-in fade-in duration-1000 ease-out relative z-10">
        
        {/* Main Stage */}
        <main className="flex-1 w-full space-y-12">
          
          {/* Live Status Band */}
          <section>
            <div className="bg-gradient-to-br from-[#d27c4b] to-[#b45d2e] text-primary-foreground rounded-[2rem] p-8 sm:p-10 relative overflow-hidden golden-shadow group cursor-pointer">
              <div className="absolute right-0 top-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -mr-20 -mt-20 mix-blend-overlay pointer-events-none transition-transform duration-1000 group-hover:scale-110" />
              <div className="absolute left-1/4 bottom-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -mb-10 pointer-events-none mix-blend-overlay" />
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="h-16 w-16 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-md shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-500">
                    <HeartPulse className="h-8 w-8 text-white animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2 text-white">
                      <span className="px-3 py-1 rounded-full bg-white/10 text-[10px] uppercase tracking-widest font-bold backdrop-blur-sm border border-white/20 flex items-center gap-1.5 shadow-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                        Active Now
                      </span>
                      <span className="text-sm opacity-90 flex items-center gap-1.5 font-medium"><Activity className="w-4 h-4"/> In progress at home</span>
                    </div>
                    <h2 className="font-serif text-3xl sm:text-4xl leading-tight mb-1 text-white">Home Physio Session</h2>
                    <p className="text-white/90 font-medium tracking-wide">Nightingale Home Care</p>
                  </div>
                </div>
                
                <div className="bg-black/10 rounded-2xl p-5 backdrop-blur-md border border-white/10 text-right shrink-0 text-white group-hover:bg-black/15 transition-colors">
                  <div className="text-sm opacity-90 mb-1 font-medium tracking-wide">Started</div>
                  <div className="text-3xl font-serif">~25 mins ago</div>
                  <button className="mt-4 text-xs font-bold uppercase tracking-widest text-white/80 group-hover:text-white transition-colors flex items-center justify-end gap-1 w-full">
                    View Details <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* The Family Layer */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Pack Messages */}
            <div className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-[2rem] p-7 sm:p-8 golden-shadow-sm flex flex-col h-[520px]">
              <div className="flex items-center justify-between mb-8 shrink-0">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <h2 className="text-2xl font-serif text-foreground">The Pack</h2>
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">3 New</span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-6 mb-6 pr-2 scrollbar-hide flex flex-col justify-end">
                {/* Thread messages */}
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-secondary text-primary font-serif flex items-center justify-center shrink-0 shadow-sm text-lg italic">
                    L
                  </div>
                  <div className="bg-secondary/40 rounded-2xl rounded-tl-none p-4 flex-1 border border-border/40 relative">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-semibold text-sm text-foreground">Layla</span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">4:15 PM</span>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed font-medium">Physio's here — settling him in now.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-secondary text-primary font-serif flex items-center justify-center shrink-0 shadow-sm text-lg italic">
                    Z
                  </div>
                  <div className="bg-secondary/40 rounded-2xl rounded-tl-none p-4 flex-1 border border-border/40">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-semibold text-sm text-foreground">Zayd</span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">3:30 PM</span>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed font-medium">Can someone approve my AC request before tonight?</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-secondary text-primary font-serif flex items-center justify-center shrink-0 shadow-sm text-lg italic">
                    N
                  </div>
                  <div className="bg-secondary/40 rounded-2xl rounded-tl-none p-4 flex-1 border border-border/40">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-semibold text-sm text-foreground">Nadia</span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">1:00 PM</span>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed font-medium">Laundry pickup done, back Thursday.</p>
                  </div>
                </div>
              </div>

              {/* Composer */}
              <div className="relative shrink-0">
                <input 
                  type="text" 
                  placeholder="Message the pack…" 
                  className="w-full bg-background rounded-2xl py-4 pl-5 pr-12 text-sm font-medium outline-none border border-border shadow-sm placeholder:text-muted-foreground/60 focus:border-primary/50 transition-colors"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 text-primary hover:bg-primary/10 rounded-xl transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Requests from the Pack */}
            <div className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-[2rem] p-7 sm:p-8 golden-shadow-sm flex flex-col h-[520px]">
              <div className="flex items-center justify-between mb-8 shrink-0">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="text-2xl font-serif text-foreground">Requests</h2>
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">2 Pending</span>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-hide">
                {/* Request 1 */}
                <div className="bg-background rounded-2xl p-5 border border-border shadow-sm group hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-secondary text-primary font-serif flex items-center justify-center shrink-0 italic text-lg shadow-sm">
                        Z
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="font-semibold text-sm text-foreground">Zayd</span>
                          <span className="text-muted-foreground text-[13px]">requested</span>
                        </div>
                        <span className="font-serif text-lg text-foreground block -mt-0.5">AC & Cooling</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-0.5">From</span>
                      <span className="font-serif text-lg text-primary">149 AED</span>
                    </div>
                  </div>
                  
                  <p className="text-[13px] text-foreground/80 mb-5 bg-secondary/30 p-3 rounded-xl border border-border/40 italic font-medium">
                    "My room's AC is barely cooling"
                  </p>
                  
                  <div className="flex gap-2.5">
                    <button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm">
                      <Check className="w-4 h-4" />
                      Approve & book
                    </button>
                    <button className="px-5 bg-secondary/80 text-secondary-foreground hover:bg-secondary rounded-xl py-2.5 text-sm font-semibold transition-colors border border-border/80 shadow-sm">
                      Later
                    </button>
                  </div>
                </div>

                {/* Request 2 */}
                <div className="bg-background rounded-2xl p-5 border border-border shadow-sm group hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-secondary text-primary font-serif flex items-center justify-center shrink-0 italic text-lg shadow-sm">
                        M
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="font-semibold text-sm text-foreground">Mariam</span>
                          <span className="text-muted-foreground text-[13px]">requested</span>
                        </div>
                        <span className="font-serif text-lg text-foreground block -mt-0.5">Beauty at Home</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-0.5">From</span>
                      <span className="font-serif text-lg text-primary">120 AED</span>
                    </div>
                  </div>
                  
                  <p className="text-[13px] text-foreground/80 mb-5 bg-secondary/30 p-3 rounded-xl border border-border/40 italic font-medium">
                    "Saturday morning?"
                  </p>
                  
                  <div className="flex gap-2.5">
                    <button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm">
                      <Check className="w-4 h-4" />
                      Approve & book
                    </button>
                    <button className="px-5 bg-secondary/80 text-secondary-foreground hover:bg-secondary rounded-xl py-2.5 text-sm font-semibold transition-colors border border-border/80 shadow-sm">
                      Later
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </section>

          {/* Service Directory */}
          <section className="pt-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-serif text-foreground">Summon a Professional</h2>
              <a href="#catalog" className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                Full Catalog <ArrowRight className="w-4 h-4" />
              </a>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 lg:gap-x-16 gap-y-1">
              {categories.map((cat) => (
                <a 
                  key={cat.name}
                  href={`#${cat.slug}`}
                  className="group flex items-center justify-between py-4 border-b border-border/60 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-5">
                    <div className="h-12 w-12 rounded-2xl bg-secondary/80 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-sm group-hover:rotate-6">
                      <cat.icon className="h-6 w-6" strokeWidth={1.5} />
                    </div>
                    <span className="font-serif text-2xl text-foreground group-hover:text-primary transition-colors">{cat.name}</span>
                  </div>
                  <div className="text-right flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">From</span>
                    <span className="font-serif text-xl text-primary">{cat.price} AED</span>
                  </div>
                </a>
              ))}
            </div>
          </section>

        </main>

        {/* Ledger Rail */}
        <aside className="w-full xl:w-[420px] shrink-0 flex flex-col gap-8">
          
          {/* The Plan */}
          <div className="bg-card/60 backdrop-blur-sm rounded-[2rem] p-8 border border-border/60 golden-shadow-sm hover:-translate-y-1 transition-transform duration-500">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2 text-primary">
                <Calendar className="w-5 h-5" />
                <h3 className="text-2xl font-serif text-foreground">The Plan</h3>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">2 Scheduled</span>
            </div>
            
            <div className="space-y-7">
              <div className="relative pl-6 before:absolute before:left-[5px] before:top-2 before:bottom-[-28px] before:w-[2px] before:bg-border last:before:hidden">
                <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-card" />
                <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Tomorrow, 9:00 AM</div>
                <div className="font-serif text-2xl text-foreground mb-0.5">Deep Home Cleaning</div>
                <div className="text-sm font-medium text-muted-foreground">Spotless Crew</div>
              </div>
              
              <div className="relative pl-6 before:absolute before:left-[5px] before:top-2 before:bottom-[-28px] before:w-[2px] before:bg-border last:before:hidden">
                <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-primary/40 ring-4 ring-card" />
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Thursday, 2:00 PM</div>
                <div className="font-serif text-2xl text-foreground mb-0.5">Pool Service</div>
                <div className="text-sm font-medium text-muted-foreground">Oasis Pools</div>
              </div>
            </div>
          </div>

          {/* Open Bill */}
          <div className="bg-secondary/40 rounded-[2rem] p-8 border border-border/50 relative group golden-shadow-sm hover:-translate-y-1 transition-transform duration-500">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2 text-primary">
                <Receipt className="w-5 h-5" />
                <h3 className="text-2xl font-serif text-foreground">Open Bill</h3>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest bg-background px-3 py-1 rounded-full text-muted-foreground shadow-sm border border-border/60">August</span>
            </div>
            
            <div className="mb-8">
              <div className="flex items-baseline gap-1.5 mb-1.5">
                <span className="text-6xl font-serif text-foreground tracking-tight">614</span>
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">AED</span>
              </div>
              <p className="text-sm font-medium text-muted-foreground">3 items so far this statement</p>
            </div>
            
            <button className="w-full py-4 bg-background rounded-2xl text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 border border-border shadow-sm group-hover:shadow-md">
              View Statement
            </button>
          </div>

        </aside>
      </div>
    </div>
  );
}
