import { ArrowRight, BriefcaseBusiness, Building2, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useListDemoRoles, getListDemoRolesQueryKey } from "@workspace/api-client-react";
import { DataState } from "@/components/platform-shell";

const fallbackRoles = [
  { role: "employee", label: "Employee", description: "A private concierge for the things waiting at home.", href: "/employee", icon: Sparkles, note: "Allowance and bookings" },
  { role: "employer", label: "Employer", description: "Govern benefits with a clear view of adoption, cost, and care.", href: "/employer", icon: Building2, note: "Benefits governance" },
  { role: "vendor", label: "Vendor", description: "Plan the day, protect capacity, and deliver work worth repeating.", href: "/vendor", icon: BriefcaseBusiness, note: "Service operations" },
  { role: "operations", label: "Operations", description: "A calm control tower for matching, quality, and recovery.", href: "/operations", icon: ShieldCheck, note: "Internal control tower" },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const rolesQuery = useListDemoRoles({ query: { queryKey: getListDemoRolesQueryKey() } });
  const roles = rolesQuery.data?.map((role) => ({ ...role, icon: fallbackRoles.find((item) => item.role === role.role)?.icon ?? Sparkles, note: fallbackRoles.find((item) => item.role === role.role)?.note ?? "Demo workspace" })) ?? fallbackRoles;
  
  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-background">
      {/* Left side - Cinematic Hero */}
      <div className="relative flex-1 lg:flex-[0.45] bg-[#1a1512] text-white overflow-hidden flex flex-col justify-between p-8 lg:p-14">
        <div className="absolute inset-0 platform-grid opacity-20 pointer-events-none mix-blend-overlay" />
        <div className="absolute -left-1/4 top-1/4 w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,rgba(210,124,75,0.15)_0%,transparent_60%)] ambient-pulse pointer-events-none" />
        
        <header className="relative z-10 flex items-center justify-between w-full">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80" data-testid="link-login-home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white font-serif text-2xl italic text-[#1a1512] shadow-[0_0_15px_rgba(255,255,255,0.1)]">L</span>
            <span className="font-serif text-3xl italic tracking-tight">Loup</span>
          </Link>
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-medium tracking-wide uppercase border border-white/10 backdrop-blur-sm">
            <LockKeyhole className="h-3.5 w-3.5" /> Simulated demo
          </div>
        </header>

        <div className="relative z-10 mt-20 mb-10 platform-reveal">
          <div className="inline-flex items-center gap-3 mb-8">
            <span className="h-px w-8 bg-primary/60" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/90">Platform Access</p>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-[5rem] leading-[0.9] tracking-tight">
            Time back, <br />
            <em className="font-serif font-normal text-[#d27c4b] block mt-2">beautifully</em> 
            coordinated.
          </h1>
        </div>

        <div className="relative z-10 max-w-sm platform-reveal" style={{ animationDelay: '200ms' }}>
          <p className="text-base leading-relaxed text-white/60">
            Four perspectives, one trusted layer. Choose a workspace to explore how Loup orchestrates the space between work and home.
          </p>
        </div>
      </div>

      {/* Right side - Roles Grid */}
      <div className="flex-1 lg:flex-[0.55] bg-[#f8f6f3] dark:bg-background flex items-center justify-center p-6 sm:p-12 lg:p-20 relative">
        <div className="absolute inset-0 pointer-events-none bg-sunlight opacity-50 mix-blend-overlay" />
        
        <div className="w-full max-w-3xl relative z-10">
          <div className="mb-10 flex items-end justify-between platform-reveal" style={{ animationDelay: '100ms' }}>
            <div>
              <h2 className="text-2xl font-serif">Select a perspective</h2>
              <p className="text-sm text-muted-foreground mt-2">No credentials required for this walkthrough.</p>
            </div>
            <span className="rounded-full bg-foreground/5 border border-border/50 px-3 py-1 text-[11px] font-medium text-muted-foreground">v1.0 demo</span>
          </div>

          <DataState loading={rolesQuery.isLoading} error={rolesQuery.isError} onRetry={() => void rolesQuery.refetch()}>
            <div className="grid gap-5 sm:grid-cols-2">
              {roles.map((role, index) => { 
                const Icon = role.icon; 
                return (
                  <button 
                    type="button" 
                    key={role.role} 
                    onClick={() => setLocation(role.href)} 
                    className="group relative bg-white dark:bg-card rounded-2xl p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary platform-reveal border border-border/50 role-card-shimmer overflow-hidden" 
                    style={{ animationDelay: `${200 + (index * 70)}ms` }} 
                    data-testid={`button-login-${role.role}`}
                  >
                    {/* Role Accent Stripe */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/80 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="flex items-start justify-between relative z-10">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1a1512] text-white shadow-md transition-transform duration-300 group-hover:scale-105 group-hover:shadow-lg">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="h-8 w-8 rounded-full bg-accent/50 flex items-center justify-center opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                        <ArrowRight className="h-4 w-4 text-foreground" />
                      </div>
                    </div>
                    
                    <div className="mt-8 relative z-10">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-2">{role.note}</p>
                      <p className="font-serif text-3xl text-foreground mb-3">{role.label}</p>
                      <p className="text-[14px] leading-relaxed text-muted-foreground">{role.description}</p>
                    </div>
                  </button>
                ); 
              })}
            </div>
          </DataState>
          
          <div className="mt-16 pt-6 border-t border-border/40 flex justify-between items-center text-xs font-medium text-muted-foreground platform-reveal" style={{ animationDelay: '500ms' }}>
            <Link href="/api-docs" className="hover:text-foreground transition-colors" data-testid="link-login-api-docs">API Documentation</Link>
            <Link href="/support" className="hover:text-foreground transition-colors" data-testid="link-login-support">Platform Support</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
