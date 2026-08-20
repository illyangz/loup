import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Activity, BookOpen, BriefcaseBusiness, CalendarDays, CircleHelp, FileText, Gauge, Layers3, LogOut, Menu, Moon, Search, ShieldCheck, Sparkles, Sun, TrendingDown, TrendingUp, UsersRound, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/demo-auth";
import { useTheme } from "@/hooks/use-theme";
import { useReveal } from "@/hooks/use-reveal";

type PlatformRole = "employee" | "institution" | "provider" | "admin";

const roleMeta: Record<PlatformRole, { label: string }> = {
  employee:    { label: "Employee benefit" },
  institution: { label: "Institution portal" },
  provider:    { label: "Provider workspace" },
  admin:       { label: "Loup control tower" },
};

const navByRole: Record<PlatformRole, { href: string; label: string; icon: typeof Gauge }[]> = {
  employee: [
    { href: "/employee",           label: "My benefit",       icon: Sparkles     },
    { href: "/browse",             label: "Services",         icon: Search       },
    { href: "/bookings",           label: "Bookings",         icon: CalendarDays },
    { href: "/household",          label: "Household",        icon: UsersRound   },
    { href: "/billing",            label: "Billing",          icon: FileText     },
  ],
  // institution/provider/admin are each a single page with their own
  // in-page tab bar (see the TABS const in employer.tsx / vendor.tsx /
  // operations.tsx) — the shell nav only needs to point back at that one
  // base route. An earlier version tried to deep-link into specific tabs
  // via URL hash (e.g. /institution#roster) from here, but those hashes
  // didn't match the page's real tab ids (some, like "integrations",
  // didn't correspond to a tab at all), so the links looked broken —
  // always landing on the default tab. Don't reintroduce per-tab links
  // here; let each page own its own tab state.
  institution: [
    { href: "/institution", label: "Institution portal", icon: Gauge },
  ],
  provider: [
    { href: "/provider", label: "Provider workspace", icon: Gauge },
  ],
  admin: [
    { href: "/admin", label: "Control tower", icon: Gauge },
  ],
};

const utilityLinks = [
  { href: "/api-docs", label: "API docs", icon: BookOpen },
  { href: "/support",  label: "Support",  icon: CircleHelp },
];

function ThemeButton() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      data-testid="button-platform-theme"
      className="h-9 w-9 inline-flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function PlatformShell({ role, children }: { role: PlatformRole; children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const meta = roleMeta[role];
  const navItems = navByRole[role];
  const navRef = useRef<HTMLElement>(null);
  useReveal(navRef, { y: 8, stagger: true, immediate: true, duration: 0.4, deps: [role] });

  const isActive = (href: string) => {
    const base = href.split("#")[0]!;
    return location === base || (base !== "/" && location.startsWith(base));
  };
  const activeNavLabel = navItems.find((item) => isActive(item.href))?.label ?? meta.label;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground relative">
      <div className="ambient-field" aria-hidden="true" />
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-6 min-w-0">
            <Link href="/" className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-70" data-testid="link-platform-brand">
              <span className="flex h-7 w-7 items-center justify-center rounded border border-foreground text-[11px] font-semibold text-foreground">L</span>
              <span className="hidden text-[15px] font-semibold uppercase tracking-[0.08em] text-foreground sm:inline">Loup</span>
            </Link>
            <span className="truncate text-sm text-muted-foreground lg:hidden">{activeNavLabel}</span>
            {navItems.length > 1 && (
              <nav ref={navRef} className="hidden items-center gap-1 lg:flex" aria-label={`${role} navigation`}>
                {navItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-testid={`link-platform-${item.label.toLowerCase().replaceAll(" ", "-")}`}
                      className={cn(
                        "rounded px-3 py-2 text-sm font-medium transition-colors",
                        active ? "text-foreground bg-secondary" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            )}
            {navItems.length <= 1 && (
              <span className="hidden text-sm text-muted-foreground lg:inline">{meta.label}</span>
            )}
          </div>

          <div className="hidden items-center gap-1 lg:flex">
            {utilityLinks.map((item) => (
              <Link key={item.href} href={item.href} data-testid={`link-platform-${item.label.toLowerCase().replaceAll(" ", "-")}`} className="rounded px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ))}
            <span className="mx-2 h-4 w-px bg-border" />
            <ThemeButton />
            <button type="button" onClick={() => { void signOut(); setLocation("/"); }} className="inline-flex h-9 items-center gap-2 rounded border border-border px-3 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors ml-1" data-testid="button-platform-signout" aria-label="Sign out and switch workspace"><LogOut className="h-4 w-4" /> Sign out</button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground ml-1" aria-label="Demo user avatar" data-testid="avatar-platform-user">ME</div>
          </div>

          <button type="button" onClick={() => setOpen((v) => !v)} className="rounded p-2 text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden" aria-label={open ? "Close navigation" : "Open navigation"} data-testid="button-open-platform-nav">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="absolute inset-x-0 top-full z-50 border-b border-border bg-card shadow-lg lg:hidden" data-testid="panel-platform-mobile-nav">
            <nav className="space-y-1 p-4" aria-label={`${role} navigation`}>
              {navItems.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    data-testid={`link-platform-mobile-${item.label.toLowerCase().replaceAll(" ", "-")}`}
                    className={cn("flex items-center gap-3 rounded px-3 py-2.5 text-sm transition-colors", active ? "text-foreground bg-secondary font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="space-y-1 border-t border-border p-4">
              {utilityLinks.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)} data-testid={`link-platform-mobile-${item.label.toLowerCase().replaceAll(" ", "-")}`} className="flex items-center gap-3 rounded px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                  <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                  {item.label}
                </Link>
              ))}
              <button type="button" onClick={toggleTheme} className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" data-testid="button-platform-theme-mobile">
                {theme === "dark" ? <Sun className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} /> : <Moon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
              <button type="button" onClick={() => { void signOut(); setLocation("/"); }} className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" data-testid="button-platform-signout-mobile">
                <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} /> Sign out
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10 mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-10 lg:py-12">{children}</main>
    </div>
  );
}

export function PlatformHeader({ kicker, title, description, action }: { kicker: string; title: string; description: string; action?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref, { y: 16, immediate: true });

  return (
    <div ref={ref} className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
      <div>
        <div className="inline-flex items-center rounded border border-primary/25 bg-primary/10 px-2 py-1 mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">{kicker}</p>
        </div>
        <h1 className="max-w-3xl font-serif text-4xl font-normal leading-[1.1] tracking-[-0.02em] sm:text-5xl lg:text-[clamp(2.5rem,4vw,3.5rem)] text-foreground">{title}</h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatTile({ label, value, detail, index = 0, trend }: { label: string; value: string; detail?: string; tone?: "default" | "brass" | "mint" | "plum", index?: number; trend?: { value: string; direction: "up" | "down" } }) {
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { setMounted(true); }, []);
  useReveal(ref, { y: 10, delay: index * 0.04, immediate: true, duration: 0.5 });

  return (
    <div ref={ref} className="glass-card rounded-lg p-6" data-testid={`stat-${label.toLowerCase().replaceAll(" ", "-")}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
        {trend && (
          <span className={cn(
            "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium",
            trend.direction === "up" ? "text-muted-foreground" : "text-destructive"
          )}>
            {trend.direction === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.value}
          </span>
        )}
      </div>
      <div className="mt-3 overflow-hidden">
        <p className="text-4xl font-semibold tabular-nums text-foreground">
          {mounted ? value : "0"}
        </p>
      </div>
      {detail && <p className="mt-2 text-[13px] text-muted-foreground">{detail}</p>}
    </div>
  );
}

export function DataState({ loading, error, empty, children, onRetry }: { loading: boolean; error?: boolean; empty?: boolean; children: React.ReactNode; onRetry?: () => void }) {
  if (loading) return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" data-testid="state-loading">{[1, 2, 3, 4].map((item) => <div key={item} className="h-32 animate-pulse rounded-lg bg-muted border border-border" />)}</div>;
  if (error)   return <div className="glass-card rounded-lg border-destructive/20 p-8 text-center" data-testid="state-error"><p className="font-medium text-destructive">This view could not load.</p><p className="mt-2 text-sm text-muted-foreground">The demo API may be taking a moment. Please try again.</p>{onRetry && <button type="button" onClick={onRetry} className="mt-5 rounded bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90" data-testid="button-retry-data">Retry</button>}</div>;
  if (empty)   return <div className="glass-card rounded-lg border border-dashed border-border p-12 text-center" data-testid="state-empty"><div className="mx-auto w-12 h-12 rounded-lg bg-secondary flex items-center justify-center mb-4"><Search className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} /></div><p className="font-serif text-2xl font-normal text-foreground">Nothing here yet</p><p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">When the first record arrives, it will appear in this space.</p></div>;
  return <>{children}</>;
}
