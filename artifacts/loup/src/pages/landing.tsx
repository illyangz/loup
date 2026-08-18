import { ArrowRight, BriefcaseBusiness, Building2, LockKeyhole, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { useListDemoRoles, getListDemoRolesQueryKey } from "@workspace/api-client-react";
import { DataState } from "@/components/platform-shell";

const fallbackRoles = [
  {
    role: "employee",
    label: "Employee App",
    description: "Browse services, place bookings, and track your benefit allowance — all from one screen.",
    href: "/employee",
    note: "Benefits & bookings",
    icon: Sparkles,
    color: "hsl(var(--platform-brass))",
  },
  {
    role: "institution",
    label: "Institution Portal",
    description: "Manage your campus benefit programme, monitor adoption, and configure employee tiers.",
    href: "/institution",
    note: "Benefits governance",
    icon: Building2,
    color: "hsl(var(--platform-brass))",
  },
  {
    role: "provider",
    label: "Provider Portal",
    description: "View your assigned jobs, manage capacity, and track performance across all campuses.",
    href: "/provider",
    note: "Service operations",
    icon: BriefcaseBusiness,
    color: "hsl(var(--platform-mint))",
  },
  {
    role: "admin",
    label: "Loup Operations",
    description: "A calm control tower for provider matching, quality enforcement, and platform health.",
    href: "/admin",
    note: "Internal control tower",
    icon: ShieldCheck,
    color: "hsl(var(--platform-plum))",
  },
];

const roleIconMap: Record<string, typeof Sparkles> = {
  employee:    Sparkles,
  institution: Building2,
  provider:    BriefcaseBusiness,
  admin:       ShieldCheck,
};

const roleColorMap: Record<string, string> = {
  employee:    "hsl(var(--platform-brass))",
  institution: "hsl(var(--platform-brass))",
  provider:    "hsl(var(--platform-mint))",
  admin:       "hsl(var(--platform-plum))",
};

const roleNoteMap: Record<string, string> = {
  employee:    "Benefits & bookings",
  institution: "Benefits governance",
  provider:    "Service operations",
  admin:       "Internal control tower",
};

const isDev = import.meta.env.DEV;

export default function Landing() {
  const [, setLocation] = useLocation();
  const rolesQuery = useListDemoRoles({ query: { queryKey: getListDemoRolesQueryKey() } });

  const roles = rolesQuery.data?.map((role) => {
    const fallback = fallbackRoles.find((f) => f.role === role.role);
    return {
      ...role,
      icon:  roleIconMap[role.role]  ?? Sparkles,
      color: roleColorMap[role.role] ?? "hsl(var(--platform-brass))",
      note:  roleNoteMap[role.role]  ?? "Demo workspace",
      description: role.description ?? fallback?.description ?? "",
    };
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

  const handleReset = async () => {
    if (!confirm("This will reset all demo data to the Meridian Education Group seed. Continue?")) return;
    await fetch(`${import.meta.env.BASE_URL}api/v1/demo/reset`, { method: "POST" });
    window.location.reload();
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative overflow-hidden text-foreground">
      <div className="ambient-field" aria-hidden="true" />

      <div className="flex-1 flex flex-col justify-center p-8 sm:p-12 lg:p-20 relative z-10 mx-auto max-w-[1500px] w-full">
        {/* Header */}
        <header className="absolute top-8 left-8 sm:top-12 sm:left-12 flex items-center justify-between w-[calc(100%-4rem)] sm:w-[calc(100%-6rem)]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--platform-plum))] font-serif font-bold text-2xl text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]">L</span>
            <span className="font-serif font-extrabold text-3xl tracking-tight text-white">Loup</span>
          </div>
          <div className="flex items-center gap-3">
            {isDev && (
              <button
                type="button"
                onClick={() => void handleReset()}
                className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-[11px] font-medium tracking-wide uppercase text-white/60 hover:text-white hover:bg-white/10 backdrop-blur-md transition-colors"
                data-testid="button-reset-demo"
              >
                <RefreshCw className="h-3 w-3" /> Reset demo
              </button>
            )}
            <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-[11px] font-medium tracking-wide uppercase border border-white/10 backdrop-blur-md text-white/80">
              <LockKeyhole className="h-3.5 w-3.5" /> Simulated demo
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="grid lg:grid-cols-[5fr_6fr] items-center gap-10 lg:gap-12 mt-20 lg:mt-0">
          {/* Headline */}
          <div className="min-w-0 platform-reveal">
            <div className="inline-flex items-center rounded-full bg-[hsl(var(--primary))/0.1] border border-[hsl(var(--primary))/0.2] px-2.5 py-1 mb-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[hsl(var(--primary))]">Education sector · UAE</p>
            </div>
            <h1 className="text-[clamp(2.5rem,4vw,4.5rem)] leading-[0.88] font-extrabold tracking-tight text-white mb-8">
              Lifestyle benefits<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(var(--primary))] to-[#ffa740] drop-shadow-[0_0_30px_hsl(var(--primary)/0.3)]">for campus</span><br />
              communities.
            </h1>
            <div className="h-px w-24 bg-gradient-to-r from-[hsl(var(--primary))] to-transparent mb-6" />
            <p className="text-xl leading-relaxed text-white/40 max-w-lg">
              Meridian Education Group — four demo workspaces, one coordinated platform. Pick a perspective to explore.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {["Faculty · AED 750/mo", "Staff · AED 500/mo", "Administrative · AED 400/mo"].map((tier) => (
                <span key={tier} className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[11px] text-white/50 font-medium">
                  {tier}
                </span>
              ))}
            </div>
          </div>

          {/* Role cards */}
          <div className="flex-1 w-full max-w-3xl platform-reveal" style={{ animationDelay: "100ms" }}>
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
                        animationDelay: `${200 + index * 70}ms`,
                        transform: "perspective(800px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) scale3d(1, 1, 1)",
                        transformStyle: "preserve-3d",
                        transition: "transform 0.15s ease-out, box-shadow 0.15s ease-out",
                      }}
                      data-testid={`button-landing-${role.role}`}
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
