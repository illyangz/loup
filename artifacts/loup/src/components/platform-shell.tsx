import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Activity, ArrowUpRight, BookOpen, BriefcaseBusiness, Building2, CalendarDays, ChevronRight, CircleHelp, Command, Gauge, Layers3, Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, ShieldCheck, Sparkles, Sun, UsersRound, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";

type PlatformRole = "employee" | "employer" | "vendor" | "operations";

const roleMeta: Record<PlatformRole, { label: string; eyebrow: string; icon: typeof Building2; accent: string }> = {
  employee: { label: "Employee benefit", eyebrow: "Private concierge", icon: Sparkles, accent: "hsl(var(--platform-brass))" },
  employer: { label: "Employer workspace", eyebrow: "Benefits governance", icon: Building2, accent: "hsl(var(--platform-brass))" },
  vendor: { label: "Vendor workspace", eyebrow: "Service operations", icon: BriefcaseBusiness, accent: "hsl(var(--platform-mint))" },
  operations: { label: "Loup control tower", eyebrow: "Internal operations", icon: ShieldCheck, accent: "hsl(var(--platform-plum))" },
};

const navByRole: Record<PlatformRole, { href: string; label: string; icon: typeof Gauge }[]> = {
  employee: [
    { href: "/employee", label: "My benefit", icon: Sparkles },
    { href: "/browse", label: "Services", icon: Search },
    { href: "/bookings", label: "Bookings", icon: CalendarDays },
    { href: "/household", label: "Household", icon: UsersRound },
  ],
  employer: [
    { href: "/employer", label: "Overview", icon: Gauge },
    { href: "/employer#roster", label: "Roster", icon: UsersRound },
    { href: "/employer#integrations", label: "Integrations", icon: Layers3 },
  ],
  vendor: [
    { href: "/vendor", label: "Today", icon: Gauge },
    { href: "/vendor#forecast", label: "Capacity forecast", icon: Activity },
    { href: "/vendor#performance", label: "Performance", icon: BriefcaseBusiness },
  ],
  operations: [
    { href: "/operations", label: "Control tower", icon: Gauge },
    { href: "/operations#service-fit", label: "Service fit", icon: Layers3 },
    { href: "/operations#audit", label: "Audit trail", icon: ShieldCheck },
  ],
};

function ThemeButton() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <button type="button" onClick={toggleTheme} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} data-testid="button-platform-theme" className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-border/70 bg-card/70 text-muted-foreground hover:text-foreground hover:-translate-y-0.5 transition-transform">
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
    <div className="min-h-[100dvh] bg-background text-foreground">
      <div className="fixed inset-0 pointer-events-none bg-sunlight opacity-80" />
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col border-r border-border/60 bg-gradient-to-b from-card/95 to-[hsl(var(--platform-wash))]/60 backdrop-blur-2xl transition-[transform,width] duration-200 ease-out lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full", collapsed && "lg:w-[82px]")}>
        <div className="flex h-20 items-center justify-between border-b border-border/50 px-5">
          <Link href="/login" className={cn("flex items-center gap-3 transition-all", collapsed && "lg:mx-auto")} data-testid="link-platform-brand">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background font-serif text-xl italic shadow-sm">L</span>
            <span className={cn("font-serif text-2xl italic tracking-tight transition-opacity duration-200", collapsed && "lg:hidden lg:opacity-0")}>Loup</span>
          </Link>
          <button type="button" onClick={() => setOpen(false)} className="lg:hidden text-muted-foreground hover:text-foreground" aria-label="Close navigation" data-testid="button-close-platform-nav"><X className="h-5 w-5" /></button>
        </div>
        <div className={cn("p-4 transition-all duration-200", collapsed && "lg:px-3")}>
          <div className={cn("relative overflow-hidden rounded-2xl bg-foreground px-3 py-3 text-background shadow-md transition-all duration-200", collapsed && "lg:px-2 lg:flex lg:justify-center")}>
            <div className="absolute top-0 inset-x-0 h-1" style={{ backgroundColor: meta.accent }} />
            <div className="flex items-center gap-3 mt-0.5">
              <RoleIcon className="h-5 w-5 shrink-0 text-background/90" />
              <div className={cn("transition-opacity duration-200", collapsed && "lg:hidden lg:opacity-0")}>
                <p className="text-[10px] uppercase tracking-[0.16em] text-background/60">{meta.eyebrow}</p>
                <p className="text-sm font-medium">{meta.label}</p>
              </div>
            </div>
          </div>
        </div>
        <nav className={cn("flex-1 space-y-1.5 px-3 py-2 transition-all duration-200", collapsed && "lg:px-2")} aria-label={`${role} navigation`}>
          {navItems.map((item, i) => {
            const active = item.href === `/${role}` ? location === item.href : location.startsWith(item.href.split("#")[0]) && location.includes(item.href.split("#")[1] ?? "");
            const Icon = item.icon;
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                onClick={() => setOpen(false)} 
                data-testid={`link-platform-${item.label.toLowerCase().replaceAll(" ", "-")}`} 
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all duration-200 ease-out overflow-hidden platform-reveal", 
                  active ? "text-foreground bg-accent/50 font-medium" : "text-muted-foreground hover:bg-accent/40 hover:text-foreground", 
                  collapsed && "lg:justify-center lg:px-2"
                )}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1/2 w-1 rounded-r-full" style={{ backgroundColor: meta.accent, boxShadow: `0 0 10px ${meta.accent}` }} />}
                <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-colors", active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                <span className={cn("transition-opacity duration-200", collapsed && "lg:hidden lg:opacity-0")}>{item.label}</span>
                {!collapsed && <ChevronRight className={cn("ml-auto h-4 w-4 opacity-0 transition-all duration-200 group-hover:opacity-70 group-hover:translate-x-0.5 -translate-x-1", active && "opacity-70 translate-x-0")} />}
              </Link>
            );
          })}
        </nav>
        <div className={cn("space-y-1 border-t border-border/50 p-3 opacity-80 hover:opacity-100 transition-opacity duration-200", collapsed && "lg:px-2")}>
          <Link href="/api-docs" data-testid="link-platform-api-docs" className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-colors", collapsed && "lg:justify-center lg:px-2")}><BookOpen className="h-[18px] w-[18px]" /><span className={cn("transition-opacity duration-200", collapsed && "lg:hidden lg:opacity-0")}>API docs</span></Link>
          <Link href="/support" data-testid="link-platform-support" className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-colors", collapsed && "lg:justify-center lg:px-2")}><CircleHelp className="h-[18px] w-[18px]" /><span className={cn("transition-opacity duration-200", collapsed && "lg:hidden lg:opacity-0")}>Support</span></Link>
          <Link href="/employee" data-testid="link-switch-employee" className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-colors", collapsed && "lg:justify-center lg:px-2")}><ArrowUpRight className="h-[18px] w-[18px]" /><span className={cn("transition-opacity duration-200", collapsed && "lg:hidden lg:opacity-0")}>Employee view</span></Link>
        </div>
      </aside>
      {open && <button type="button" aria-label="Close navigation overlay" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-foreground/10 backdrop-blur-sm lg:hidden transition-opacity" data-testid="button-close-platform-overlay" />}
      <div className={cn("relative transition-[padding] duration-200 ease-out lg:pl-[272px]", collapsed && "lg:pl-[82px]")}>
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-border/50 bg-background/70 px-4 backdrop-blur-xl sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-accent lg:hidden" aria-label="Open navigation" data-testid="button-open-platform-nav"><Menu className="h-5 w-5" /></button>
            <button type="button" onClick={() => setCollapsed((value) => !value)} className="hidden rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground lg:block transition-colors" aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} data-testid="button-collapse-platform-nav">{collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}</button>
            <div className="hidden sm:block platform-reveal"><p className="text-xs text-muted-foreground/80">{new Intl.DateTimeFormat("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}</p><p className="font-medium mt-0.5">{meta.label}</p></div>
          </div>
          <div className="flex items-center gap-3 platform-reveal" style={{ animationDelay: '100ms' }}><Link href="/api-docs" className="hidden items-center gap-2 rounded-full px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground sm:flex transition-colors" data-testid="link-header-api-docs"><Command className="h-3.5 w-3.5" /> Read the API</Link><ThemeButton /><div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-foreground shadow-sm ring-1 ring-border/50" aria-label="Demo user avatar" data-testid="avatar-platform-user">AR</div></div>
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
        <div className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">{kicker}</p>
        </div>
        <h1 className="max-w-3xl text-4xl leading-[.95] sm:text-5xl lg:text-[3.5rem]">{title}</h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {action && <div className="shrink-0 platform-reveal" style={{ animationDelay: '150ms' }}>{action}</div>}
    </div>
  );
}

export function StatTile({ label, value, detail, tone = "default", index = 0 }: { label: string; value: string; detail?: string; tone?: "default" | "brass" | "mint" | "plum", index?: number }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const backgrounds = {
    default: "linear-gradient(135deg, hsl(var(--card) / .96), hsl(var(--platform-wash) / .78))",
    brass: "linear-gradient(135deg, hsl(var(--card) / .96), hsl(var(--platform-brass) / .15))",
    mint: "linear-gradient(135deg, hsl(var(--card) / .96), hsl(var(--platform-mint) / .15))",
    plum: "linear-gradient(135deg, hsl(var(--card) / .96), hsl(var(--platform-plum) / .15))"
  };

  const textColors = {
    default: "text-foreground",
    brass: "text-primary",
    mint: "text-emerald-700 dark:text-emerald-400",
    plum: "text-fuchsia-800 dark:text-fuchsia-400"
  };

  return (
    <div 
      className={cn("platform-surface platform-card-lift rounded-2xl p-6 platform-reveal")}
      style={{ 
        background: backgrounds[tone],
        animationDelay: `${index * 75}ms` 
      }} 
      data-testid={`stat-${label.toLowerCase().replaceAll(" ", "-")}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <div className="mt-3 overflow-hidden">
        <p className={cn("font-serif text-4xl count-up", mounted && "platform-stat-glow", textColors[tone])}>
          {mounted ? value : "0"}
        </p>
      </div>
      {detail && <p className="mt-2 text-[13px] text-muted-foreground/80">{detail}</p>}
    </div>
  );
}

export function DataState({ loading, error, empty, children, onRetry }: { loading: boolean; error?: boolean; empty?: boolean; children: React.ReactNode; onRetry?: () => void }) {
  if (loading) return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 platform-reveal" data-testid="state-loading">{[1, 2, 3, 4].map((item, i) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-muted/60" style={{ animationDelay: `${i * 100}ms` }} />)}</div>;
  if (error) return <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center platform-reveal" data-testid="state-error"><p className="font-medium text-destructive">This view could not load.</p><p className="mt-2 text-sm text-muted-foreground">The demo API may be taking a moment. Please try again.</p>{onRetry && <button type="button" onClick={onRetry} className="mt-5 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-transform hover:-translate-y-0.5 hover:shadow-md" data-testid="button-retry-data">Retry</button>}</div>;
  if (empty) return <div className="rounded-3xl border border-dashed border-border/80 bg-card/30 p-12 text-center platform-reveal" data-testid="state-empty"><div className="mx-auto w-12 h-12 rounded-full bg-accent/50 flex items-center justify-center mb-4"><Search className="h-5 w-5 text-muted-foreground" /></div><p className="font-serif text-2xl">Nothing here yet</p><p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">When the first record arrives, it will appear in this space.</p></div>;
  return <>{children}</>;
}
