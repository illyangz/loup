import { useState } from "react";
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
    <div className="min-h-[100dvh] bg-background text-foreground platform-grid">
      <div className="fixed inset-0 pointer-events-none bg-sunlight opacity-80" />
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col border-r border-border/70 bg-card/90 backdrop-blur-2xl transition-transform lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full", collapsed && "lg:w-[82px]")}>
        <div className="flex h-20 items-center justify-between border-b border-border/60 px-5">
          <Link href="/login" className={cn("flex items-center gap-3", collapsed && "lg:mx-auto")} data-testid="link-platform-brand">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background font-serif text-xl italic">L</span>
            <span className={cn("font-serif text-2xl italic tracking-tight", collapsed && "lg:hidden")}>Loup</span>
          </Link>
          <button type="button" onClick={() => setOpen(false)} className="lg:hidden text-muted-foreground" aria-label="Close navigation" data-testid="button-close-platform-nav"><X className="h-5 w-5" /></button>
        </div>
        <div className={cn("p-4", collapsed && "lg:px-3")}>
          <div className={cn("rounded-2xl bg-foreground px-3 py-3 text-background", collapsed && "lg:px-2 lg:flex lg:justify-center")} style={{ borderTop: `3px solid ${meta.accent}` }}>
            <div className="flex items-center gap-3">
              <RoleIcon className="h-5 w-5 shrink-0" />
              <div className={cn(collapsed && "lg:hidden")}>
                <p className="text-[10px] uppercase tracking-[0.16em] text-background/60">{meta.eyebrow}</p>
                <p className="text-sm font-medium">{meta.label}</p>
              </div>
            </div>
          </div>
        </div>
        <nav className={cn("flex-1 space-y-1 px-3", collapsed && "lg:px-2")} aria-label={`${role} navigation`}>
          {navItems.map((item) => {
            const active = item.href === `/${role}` ? location === item.href : location.startsWith(item.href.split("#")[0]) && location.includes(item.href.split("#")[1] ?? "");
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} data-testid={`link-platform-${item.label.toLowerCase().replaceAll(" ", "-")}`} className={cn("group flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors", active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground", collapsed && "lg:justify-center lg:px-2")}>
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className={cn(collapsed && "lg:hidden")}>{item.label}</span>
                {!collapsed && <ChevronRight className={cn("ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-70", active && "opacity-70")} />}
              </Link>
            );
          })}
        </nav>
        <div className={cn("space-y-1 border-t border-border/60 p-3", collapsed && "lg:px-2")}>
          <Link href="/api-docs" data-testid="link-platform-api-docs" className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground", collapsed && "lg:justify-center lg:px-2")}><BookOpen className="h-[18px] w-[18px]" /><span className={cn(collapsed && "lg:hidden")}>API docs</span></Link>
          <Link href="/support" data-testid="link-platform-support" className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground", collapsed && "lg:justify-center lg:px-2")}><CircleHelp className="h-[18px] w-[18px]" /><span className={cn(collapsed && "lg:hidden")}>Support</span></Link>
          <Link href="/employee" data-testid="link-switch-employee" className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground", collapsed && "lg:justify-center lg:px-2")}><ArrowUpRight className="h-[18px] w-[18px]" /><span className={cn(collapsed && "lg:hidden")}>Employee view</span></Link>
        </div>
      </aside>
      {open && <button type="button" aria-label="Close navigation overlay" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" data-testid="button-close-platform-overlay" />}
      <div className={cn("relative transition-[padding] duration-200 lg:pl-[272px]", collapsed && "lg:pl-[82px]")}>
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-accent lg:hidden" aria-label="Open navigation" data-testid="button-open-platform-nav"><Menu className="h-5 w-5" /></button>
            <button type="button" onClick={() => setCollapsed((value) => !value)} className="hidden rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground lg:block" aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} data-testid="button-collapse-platform-nav">{collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}</button>
            <div className="hidden sm:block"><p className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}</p><p className="font-medium">{meta.label}</p></div>
          </div>
          <div className="flex items-center gap-2"><Link href="/api-docs" className="hidden items-center gap-2 rounded-full px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground sm:flex" data-testid="link-header-api-docs"><Command className="h-3.5 w-3.5" /> Read the API</Link><ThemeButton /><div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-foreground" aria-label="Demo user avatar" data-testid="avatar-platform-user">AR</div></div>
        </header>
        <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}

export function PlatformHeader({ kicker, title, description, action }: { kicker: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end platform-reveal"><div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{kicker}</p><h1 className="max-w-3xl text-4xl leading-[.95] sm:text-5xl">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div>{action && <div className="shrink-0">{action}</div>}</div>;
}

export function StatTile({ label, value, detail, tone = "default" }: { label: string; value: string; detail?: string; tone?: "default" | "brass" | "mint" | "plum" }) {
  return <div className={cn("platform-surface rounded-2xl p-5 platform-reveal", tone === "brass" && "border-primary/40", tone === "mint" && "border-emerald-900/20", tone === "plum" && "border-fuchsia-950/20")} data-testid={`stat-${label.toLowerCase().replaceAll(" ", "-")}`}><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-2 font-serif text-3xl">{value}</p>{detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}</div>;
}

export function DataState({ loading, error, empty, children, onRetry }: { loading: boolean; error?: boolean; empty?: boolean; children: React.ReactNode; onRetry?: () => void }) {
  if (loading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="state-loading">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-muted/70" />)}</div>;
  if (error) return <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-6" data-testid="state-error"><p className="font-medium">This view could not load.</p><p className="mt-1 text-sm text-muted-foreground">The demo API may be taking a moment. Try again.</p>{onRetry && <button type="button" onClick={onRetry} className="mt-4 rounded-full bg-foreground px-4 py-2 text-sm text-background" data-testid="button-retry-data">Retry</button>}</div>;
  if (empty) return <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center" data-testid="state-empty"><p className="font-serif text-2xl">Nothing here yet</p><p className="mt-2 text-sm text-muted-foreground">When the first record arrives, it will appear in this space.</p></div>;
  return <>{children}</>;
}