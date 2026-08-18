import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Activity, ArrowUpRight, BookOpen, BriefcaseBusiness, Building2, CalendarDays, ChevronRight, CircleHelp, Command, Gauge, Layers3, Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, ShieldCheck, Sparkles, Sun, UsersRound, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";

type PlatformRole = "employee" | "institution" | "provider" | "admin";

const roleMeta: Record<PlatformRole, { label: string; eyebrow: string; icon: typeof Building2; accent: string }> = {
  employee:    { label: "Employee benefit",      eyebrow: "Private concierge",      icon: Sparkles,         accent: "hsl(var(--platform-brass))" },
  institution: { label: "Institution portal",    eyebrow: "Benefits governance",    icon: Building2,        accent: "hsl(var(--platform-brass))" },
  provider:    { label: "Provider workspace",    eyebrow: "Service operations",     icon: BriefcaseBusiness, accent: "hsl(var(--platform-mint))"  },
  admin:       { label: "Loup control tower",    eyebrow: "Internal operations",    icon: ShieldCheck,      accent: "hsl(var(--platform-plum))"  },
};

const navByRole: Record<PlatformRole, { href: string; label: string; icon: typeof Gauge }[]> = {
  employee: [
    { href: "/employee",           label: "My benefit",       icon: Sparkles     },
    { href: "/browse",             label: "Services",         icon: Search       },
    { href: "/bookings",           label: "Bookings",         icon: CalendarDays },
    { href: "/household",          label: "Household",        icon: UsersRound   },
  ],
  institution: [
    { href: "/institution",                label: "Overview",        icon: Gauge      },
    { href: "/institution#roster",         label: "Roster",          icon: UsersRound },
    { href: "/institution#integrations",   label: "Integrations",    icon: Layers3    },
  ],
  provider: [
    { href: "/provider",             label: "Today",            icon: Gauge           },
    { href: "/provider#forecast",    label: "Capacity forecast", icon: Activity        },
    { href: "/provider#performance", label: "Performance",       icon: BriefcaseBusiness },
  ],
  admin: [
    { href: "/admin",              label: "Control tower",  icon: Gauge      },
    { href: "/admin#service-fit", label: "Service fit",    icon: Layers3    },
    { href: "/admin#audit",       label: "Audit trail",    icon: ShieldCheck },
  ],
};

function ThemeButton() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <button type="button" onClick={toggleTheme} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} data-testid="button-platform-theme" className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-[hsl(0_0%_100%/0.1)] bg-[hsl(0_0%_100%/0.05)] backdrop-blur-xl text-white/40 hover:text-white hover:-translate-y-0.5 transition-transform">
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function PlatformShell({ role, children }: { role: PlatformRole; children: React.ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const meta = roleMeta[role];
  const RoleIcon = meta.icon;
  const navItems = navByRole[role];

  return (
    <div className="min-h-[100dvh] bg-background text-foreground relative">
      <div className="ambient-field" aria-hidden="true" />
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col border-r border-[hsl(0_0%_100%/0.07)] bg-[hsl(0_0%_100%/0.03)] backdrop-blur-2xl transition-[transform,width] duration-200 ease-out lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full", collapsed && "lg:w-[82px]")}>
        <div className="flex h-20 items-center justify-between border-b border-[hsl(0_0%_100%/0.07)] px-5">
          <Link href="/" className={cn("flex items-center gap-3 transition-all", collapsed && "lg:mx-auto")} data-testid="link-platform-brand">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--platform-plum))] text-white font-serif font-bold text-xl shadow-sm">L</span>
            <span className={cn("font-serif font-extrabold text-2xl tracking-tight text-white transition-opacity duration-200", collapsed && "lg:hidden lg:opacity-0")}>Loup</span>
          </Link>
          <button type="button" onClick={() => setOpen(false)} className="lg:hidden text-white/30 hover:text-white/70" aria-label="Close navigation" data-testid="button-close-platform-nav"><X className="h-5 w-5" /></button>
        </div>
        <div className={cn("p-4 transition-all duration-200", collapsed && "lg:px-3")}>
          <div className={cn("relative overflow-hidden rounded-2xl glass-card px-3 py-3 shadow-md transition-all duration-200", collapsed && "lg:px-2 lg:flex lg:justify-center")} style={{ borderLeftColor: meta.accent, borderLeftWidth: '3px' }}>
            <div className="flex items-center gap-3 mt-0.5">
              <RoleIcon className="h-5 w-5 shrink-0" style={{ color: meta.accent }} />
              <div className={cn("transition-opacity duration-200", collapsed && "lg:hidden lg:opacity-0")}>
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/60">{meta.eyebrow}</p>
                <p className="text-sm font-medium text-white/90">{meta.label}</p>
              </div>
            </div>
          </div>
        </div>
        <nav className={cn("flex-1 space-y-1.5 px-3 py-2 transition-all duration-200", collapsed && "lg:px-2")} aria-label={`${role} navigation`}>
          {navItems.map((item, i) => {
            const base = item.href.split("#")[0]!;
            const active = location === base || (base !== "/" && location.startsWith(base));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                data-testid={`link-platform-${item.label.toLowerCase().replaceAll(" ", "-")}`}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all duration-200 ease-out overflow-hidden platform-reveal",
                  active ? "text-[hsl(var(--primary))] bg-[hsl(var(--primary))/0.08] font-medium border-l-2 border-[hsl(var(--primary))]" : "text-white/40 hover:bg-[hsl(0_0%_100%/0.06)] hover:text-white",
                  collapsed && "lg:justify-center lg:px-2"
                )}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-colors", active ? "text-[hsl(var(--primary))]" : "text-white/40 group-hover:text-white")} />
                <span className={cn("transition-opacity duration-200", collapsed && "lg:hidden lg:opacity-0")}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className={cn("space-y-1 border-t border-[hsl(0_0%_100%/0.07)] p-3 opacity-80 hover:opacity-100 transition-opacity duration-200", collapsed && "lg:px-2")}>
          <Link href="/api-docs" data-testid="link-platform-api-docs" className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/40 hover:bg-[hsl(0_0%_100%/0.06)] hover:text-white transition-colors", collapsed && "lg:justify-center lg:px-2")}><BookOpen className="h-[18px] w-[18px]" /><span className={cn("transition-opacity duration-200", collapsed && "lg:hidden lg:opacity-0")}>API docs</span></Link>
          <Link href="/support" data-testid="link-platform-support" className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/40 hover:bg-[hsl(0_0%_100%/0.06)] hover:text-white transition-colors", collapsed && "lg:justify-center lg:px-2")}><CircleHelp className="h-[18px] w-[18px]" /><span className={cn("transition-opacity duration-200", collapsed && "lg:hidden lg:opacity-0")}>Support</span></Link>
          <Link href="/employee" data-testid="link-switch-employee" className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/40 hover:bg-[hsl(0_0%_100%/0.06)] hover:text-white transition-colors", collapsed && "lg:justify-center lg:px-2")}><ArrowUpRight className="h-[18px] w-[18px]" /><span className={cn("transition-opacity duration-200", collapsed && "lg:hidden lg:opacity-0")}>Employee view</span></Link>
        </div>
      </aside>
      {open && <button type="button" aria-label="Close navigation overlay" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-background/50 backdrop-blur-sm lg:hidden transition-opacity" data-testid="button-close-platform-overlay" />}
      <div className={cn("relative z-10 transition-[padding] duration-200 ease-out lg:pl-[272px]", collapsed && "lg:pl-[82px]")}>
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[hsl(0_0%_100%/0.07)] bg-[hsl(0_0%_100%/0.03)] px-4 backdrop-blur-2xl sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white lg:hidden" aria-label="Open navigation" data-testid="button-open-platform-nav"><Menu className="h-5 w-5" /></button>
            <button type="button" onClick={() => setCollapsed((v) => !v)} className="hidden rounded-lg p-2 text-white/30 hover:bg-white/5 hover:text-white/70 lg:block transition-colors" aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} data-testid="button-collapse-platform-nav">{collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}</button>
            <div className="hidden sm:block platform-reveal"><p className="text-xs text-white/40">{new Intl.DateTimeFormat("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}</p><p className="font-semibold text-white/90 mt-0.5">{meta.label}</p></div>
          </div>
          <div className="flex items-center gap-3 platform-reveal" style={{ animationDelay: '100ms' }}>
            <Link href="/api-docs" className="hidden items-center gap-2 rounded-full px-3 py-2 text-xs text-white/40 hover:bg-white/5 hover:text-white sm:flex transition-colors" data-testid="link-header-api-docs"><Command className="h-3.5 w-3.5" /> Read the API</Link>
            <ThemeButton />
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--platform-plum))] text-xs font-semibold text-white shadow-sm ring-1 ring-[hsl(0_0%_100%/0.1)]" aria-label="Demo user avatar" data-testid="avatar-platform-user">ME</div>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-10 lg:py-12">{children}</main>
      </div>
    </div>
  );
}

export function PlatformHeader({ kicker, title, description, action }: { kicker: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end platform-reveal">
      <div>
        <div className="inline-flex items-center rounded-full bg-[hsl(var(--primary))/0.1] border border-[hsl(var(--primary))/0.2] px-2.5 py-1 mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[hsl(var(--primary))] shadow-[0_0_10px_hsl(var(--primary)/0.2)]">{kicker}</p>
        </div>
        <h1 className="max-w-3xl text-4xl leading-[.95] sm:text-5xl lg:text-[clamp(2.5rem,4vw,3.5rem)] font-extrabold text-white">{title}</h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/50">{description}</p>
      </div>
      {action && <div className="shrink-0 platform-reveal" style={{ animationDelay: '150ms' }}>{action}</div>}
    </div>
  );
}

export function StatTile({ label, value, detail, tone = "default", index = 0 }: { label: string; value: string; detail?: string; tone?: "default" | "brass" | "mint" | "plum", index?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const textColors = {
    default: "text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]",
    brass:   "text-[hsl(var(--platform-brass))] drop-shadow-[0_0_15px_hsl(var(--platform-brass)/0.4)]",
    mint:    "text-[hsl(var(--platform-mint))] drop-shadow-[0_0_15px_hsl(var(--platform-mint)/0.4)]",
    plum:    "text-[hsl(var(--platform-plum))] drop-shadow-[0_0_15px_hsl(var(--platform-plum)/0.4)]",
  };

  return (
    <div className={cn("glass-card rounded-2xl p-6 platform-reveal")} style={{ animationDelay: `${index * 75}ms` }} data-testid={`stat-${label.toLowerCase().replaceAll(" ", "-")}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/40">{label}</p>
      <div className="mt-3 overflow-hidden">
        <p className={cn("font-serif text-4xl count-up", mounted && "platform-stat-glow", textColors[tone])}>
          {mounted ? value : "0"}
        </p>
      </div>
      {detail && <p className="mt-2 text-[13px] text-white/30">{detail}</p>}
    </div>
  );
}

export function DataState({ loading, error, empty, children, onRetry }: { loading: boolean; error?: boolean; empty?: boolean; children: React.ReactNode; onRetry?: () => void }) {
  if (loading) return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 platform-reveal" data-testid="state-loading">{[1, 2, 3, 4].map((item, i) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-white/5 border border-white/5" style={{ animationDelay: `${i * 100}ms` }} />)}</div>;
  if (error)   return <div className="glass-card rounded-2xl border-destructive/20 p-8 text-center platform-reveal" data-testid="state-error"><p className="font-medium text-destructive">This view could not load.</p><p className="mt-2 text-sm text-white/40">The demo API may be taking a moment. Please try again.</p>{onRetry && <button type="button" onClick={onRetry} className="mt-5 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-transform hover:-translate-y-0.5 hover:shadow-md" data-testid="button-retry-data">Retry</button>}</div>;
  if (empty)   return <div className="glass-card rounded-3xl border border-dashed border-white/10 p-12 text-center platform-reveal" data-testid="state-empty"><div className="mx-auto w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4"><Search className="h-5 w-5 text-white/40" /></div><p className="font-serif text-2xl text-white/90">Nothing here yet</p><p className="mt-2 text-sm text-white/40 max-w-sm mx-auto">When the first record arrives, it will appear in this space.</p></div>;
  return <>{children}</>;
}
