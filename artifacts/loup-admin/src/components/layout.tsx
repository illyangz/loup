import { ReactNode, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { useReveal } from "@/hooks/use-reveal";
import {
  Activity,
  Building2,
  Users,
  BookOpen,
  Calendar,
  Wallet,
  BarChart2,
  ShieldAlert,
  Menu,
  Moon,
  Sun,
  X,
} from "lucide-react";

export const navLinks = [
  { href: "/", label: "Overview", icon: Activity },
  { href: "/institutions", label: "Institutions", icon: Building2 },
  { href: "/providers", label: "Providers", icon: Users },
  { href: "/catalog", label: "Catalog", icon: BookOpen },
  { href: "/bookings", label: "Bookings", icon: Calendar },
  { href: "/ledger", label: "Ledger", icon: Wallet },
  { href: "/incidents", label: "Incidents", icon: ShieldAlert },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
];

function ThemeButton() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      data-testid="button-admin-theme"
      className="h-9 w-9 inline-flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  useReveal(navRef, { y: 8, stagger: true, immediate: true, duration: 0.4 });
  useReveal(mainRef, { y: 10, immediate: true, duration: 0.4, deps: [location] });

  const isActive = (href: string) => location === href || (href !== "/" && location.startsWith(href));
  const current = navLinks.find((l) => isActive(l.href)) ?? navLinks[0];

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="ambient-field" aria-hidden="true" />
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-6 min-w-0">
            <Link href="/" className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-70" data-testid="link-admin-brand">
              <span className="flex h-7 w-7 items-center justify-center rounded border border-foreground text-[11px] font-semibold text-foreground">L</span>
              <span className="hidden text-[15px] font-semibold uppercase tracking-[0.08em] text-foreground sm:inline">Loup Admin</span>
            </Link>
            <span className="truncate text-sm text-muted-foreground lg:hidden">{current?.label}</span>
            <nav ref={navRef} className="hidden items-center gap-0.5 overflow-x-auto lg:flex" aria-label="Admin navigation">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    data-testid={`link-admin-nav-${link.label.toLowerCase()}`}
                    className={cn(
                      "whitespace-nowrap rounded px-2.5 py-2 text-sm font-medium transition-colors",
                      active ? "text-foreground bg-secondary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="hidden items-center gap-1 lg:flex">
            <ThemeButton />
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground ml-1" aria-label="Admin user avatar" data-testid="avatar-admin-user">AD</div>
          </div>

          <button type="button" onClick={() => setOpen((v) => !v)} className="rounded p-2 text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden" aria-label={open ? "Close navigation" : "Open navigation"} data-testid="button-open-admin-nav">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="absolute inset-x-0 top-full z-50 border-b border-border bg-card shadow-lg lg:hidden" data-testid="panel-admin-mobile-nav">
            <nav className="space-y-1 p-4" aria-label="Admin navigation">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    data-testid={`link-admin-nav-mobile-${link.label.toLowerCase()}`}
                    className={cn("flex items-center gap-3 rounded px-3 py-2.5 text-sm transition-colors", active ? "text-foreground bg-secondary font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="space-y-1 border-t border-border p-4">
              <button type="button" onClick={toggleTheme} className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" data-testid="button-admin-theme-mobile">
                {theme === "dark" ? <Sun className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} /> : <Moon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
            </div>
          </div>
        )}
      </header>

      <main ref={mainRef} className="relative z-10 mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-10 lg:py-12">
        {children}
      </main>
    </div>
  );
}
