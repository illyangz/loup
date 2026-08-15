import { ArrowRight, BriefcaseBusiness, Building2, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useListDemoRoles, getListDemoRolesQueryKey } from "@workspace/api-client-react";
import { DataState } from "@/components/platform-shell";

const fallbackRoles = [
  { role: "employee", label: "Employee", description: "A private concierge for the things waiting at home.", href: "/employee", icon: Sparkles, note: "Allowance and bookings", color: "hsl(var(--platform-brass))" },
  { role: "employer", label: "Employer", description: "Govern benefits with a clear view of adoption, cost, and care.", href: "/employer", icon: Building2, note: "Benefits governance", color: "hsl(var(--platform-brass))" },
  { role: "vendor", label: "Vendor", description: "Plan the day, protect capacity, and deliver work worth repeating.", href: "/vendor", icon: BriefcaseBusiness, note: "Service operations", color: "hsl(var(--platform-mint))" },
  { role: "operations", label: "Operations", description: "A calm control tower for matching, quality, and recovery.", href: "/operations", icon: ShieldCheck, note: "Internal control tower", color: "hsl(var(--platform-plum))" },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const rolesQuery = useListDemoRoles({ query: { queryKey: getListDemoRolesQueryKey() } });
  const roles = rolesQuery.data?.map((role) => {
    const fallback = fallbackRoles.find((item) => item.role === role.role);
    return { ...role, icon: fallback?.icon ?? Sparkles, note: fallback?.note ?? "Demo workspace", color: fallback?.color ?? "hsl(var(--platform-brass))" };
  }) ?? fallbackRoles;
  
  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    e.currentTarget.style.setProperty("--rx", `${-y * 12}deg`);
    e.currentTarget.style.setProperty("--ry", `${x * 12}deg`);
  };
  
  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.setProperty("--rx", "0deg");
    e.currentTarget.style.setProperty("--ry", "0deg");
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative overflow-hidden text-foreground">
      <div className="ambient-field" aria-hidden="true" />
      
      <div className="flex-1 flex flex-col justify-center p-8 sm:p-12 lg:p-20 relative z-10 mx-auto max-w-[1500px] w-full">
        <header className="absolute top-8 left-8 sm:top-12 sm:left-12 flex items-center justify-between w-[calc(100%-4rem)] sm:w-[calc(100%-6rem)]">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80" data-testid="link-login-home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--platform-plum))] font-serif font-bold text-2xl text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]">L</span>
            <span className="font-serif font-extrabold text-3xl tracking-tight text-white">Loup</span>
          </Link>
          <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-[11px] font-medium tracking-wide uppercase border border-white/10 backdrop-blur-md text-white/80">
            <LockKeyhole className="h-3.5 w-3.5" /> Simulated demo
          </div>
        </header>

        <div className="grid lg:grid-cols-[5fr_6fr] items-center gap-10 lg:gap-12 mt-20 lg:mt-0">
          <div className="min-w-0 platform-reveal">
            <h1 className="text-[clamp(2.5rem,4vw,4.5rem)] leading-[0.88] font-extrabold tracking-tight text-white mb-8">
              Time back,<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(var(--primary))] to-[#ffa740] drop-shadow-[0_0_30px_hsl(var(--primary)/0.3)]">beautifully</span><br />
              coordinated.
            </h1>
            <div className="h-px w-24 bg-gradient-to-r from-[hsl(var(--primary))] to-transparent mb-6" />
            <p className="text-xl leading-relaxed text-white/40 max-w-lg">
              Four perspectives, one trusted layer. Choose a workspace to explore how Loup orchestrates the space between work and home.
            </p>
          </div>

          <div className="flex-1 w-full max-w-3xl platform-reveal" style={{ animationDelay: '100ms' }}>
            <DataState loading={rolesQuery.isLoading} error={rolesQuery.isError} onRetry={() => void rolesQuery.refetch()}>
              <div className="grid gap-6 sm:grid-cols-2">
                {roles.map((role, index) => { 
                  const Icon = role.icon; 
                  return (
                    <button 
                      type="button" 
                      key={role.role} 
                      onClick={() => setLocation(role.href)} 
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                      className="group relative glass-card rounded-2xl p-6 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] platform-reveal overflow-hidden" 
                      style={{ 
                        animationDelay: `${200 + (index * 70)}ms`,
                        transform: "perspective(800px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) scale3d(1, 1, 1)",
                        transformStyle: "preserve-3d",
                        transition: "transform 0.15s ease-out, box-shadow 0.15s ease-out"
                      }} 
                      data-testid={`button-login-${role.role}`}
                    >
                      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: role.color }} />
                      
                      <div className="flex items-start justify-between relative z-10" style={{ transform: "translateZ(30px)" }}>
                        <Icon className="h-6 w-6" style={{ color: role.color }} />
                        <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                          <ArrowRight className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      
                      <div className="mt-12 relative z-10" style={{ transform: "translateZ(20px)" }}>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: role.color }}>{role.note}</p>
                        <p className="font-serif text-3xl text-white mb-3 font-bold">{role.label}</p>
                        <p className="text-[14px] leading-relaxed text-white/40">{role.description}</p>
                      </div>
                    </button>
                  ); 
                })}
              </div>
            </DataState>
          </div>
        </div>
      </div>
    </div>
  );
}