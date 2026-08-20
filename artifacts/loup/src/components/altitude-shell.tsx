import { useState } from "react";
import { Link } from "wouter";
import { Menu, Moon, Sun, X, Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";

/**
 * Shared nav + footer for the two pre-auth "Altitude" pages (landing.tsx,
 * whitepaper.tsx) — extracted after they drifted out of sync (different
 * footer columns, different nav links). One implementation now, both
 * pages render exactly the same chrome. See ALTITUDE-DESIGN-REFERENCE.md.
 *
 * Both the desktop link row and the mobile menu render from the same
 * `links` array, so they can never drift from each other again either.
 * Nav is `sticky top-0` so it stays visible while scrolling at every
 * breakpoint; below `lg` the link row collapses into a hamburger-
 * triggered dropdown panel instead of disappearing.
 */

export type AltitudeNavLink = { href: string; label: string; testId?: string };

const isDev = import.meta.env.DEV;

export function AltitudeNav({ links, current }: { links: AltitudeNavLink[]; current?: string }) {
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="relative flex h-16 items-center justify-between px-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2" data-testid="link-nav-brand" onClick={() => setOpen(false)}>
          <span className="flex h-6 w-6 items-center justify-center rounded border border-foreground text-[11px] font-semibold text-foreground">L</span>
          <span className="text-[15px] font-semibold uppercase tracking-[0.08em] text-foreground">Loup</span>
        </Link>

        <div className="hidden items-center gap-8 text-[14px] text-foreground lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              data-testid={link.testId}
              className={cn("transition-opacity hover:opacity-70", current === link.href ? "opacity-100" : "opacity-80")}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            data-testid="button-nav-theme-toggle"
            className="flex h-7 w-7 items-center justify-center rounded border border-border text-foreground transition-colors hover:bg-secondary"
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
          <Link href="/login" data-testid="link-nav-signin" className="hidden text-[14px] text-foreground transition-opacity hover:opacity-70 sm:inline">
            Login
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            data-testid="button-nav-mobile-toggle"
            className="flex h-8 w-8 items-center justify-center rounded border border-border text-foreground lg:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div
          className="absolute left-0 right-0 top-full z-50 border-t border-border bg-background px-6 py-4 shadow-lg lg:hidden"
          data-testid="panel-nav-mobile"
        >
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded px-2 py-2.5 text-[15px] text-foreground transition-colors hover:bg-secondary"
              >
                {link.label}
              </Link>
            ))}
            <Link href="/login" onClick={() => setOpen(false)} className="rounded px-2 py-2.5 text-[15px] text-foreground transition-colors hover:bg-secondary sm:hidden">
              Login
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

export function AltitudeFooter({ onReset }: { onReset?: () => void }) {
  return (
    <footer className="mt-4 border-t border-border bg-secondary/40 px-6 py-16 text-foreground sm:px-10">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded border border-foreground text-[11px] font-semibold">L</span>
              <span className="text-[14px] font-semibold uppercase tracking-[0.08em]">Loup</span>
            </div>
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
              The private concierge layer between work and home — for institutions across the UAE.
            </p>
            <div className="mt-5 flex items-center gap-3 text-muted-foreground">
              <a href="#" aria-label="Twitter" className="hover:opacity-70"><Twitter className="h-4 w-4" /></a>
              <a href="#" aria-label="LinkedIn" className="hover:opacity-70"><Linkedin className="h-4 w-4" /></a>
              <a href="#" aria-label="Instagram" className="hover:opacity-70"><Instagram className="h-4 w-4" /></a>
              <a href="#" aria-label="Facebook" className="hover:opacity-70"><Facebook className="h-4 w-4" /></a>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase text-muted-foreground/80" style={{ letterSpacing: "0.05em" }}>Product</p>
            <div className="mt-4 flex flex-col gap-3 text-[13px] text-muted-foreground">
              <Link href="/#how-it-works" className="transition-opacity hover:opacity-70">How it works</Link>
              <Link href="/embed/demo" className="transition-opacity hover:opacity-70">Widget preview</Link>
              <Link href="/api-docs" className="transition-opacity hover:opacity-70">API docs</Link>
              <Link href="/whitepaper" className="transition-opacity hover:opacity-70">Whitepaper</Link>
              <Link href="/#for-institutions" className="transition-opacity hover:opacity-70">For institutions</Link>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase text-muted-foreground/80" style={{ letterSpacing: "0.05em" }}>Legal</p>
            <div className="mt-4 flex flex-col gap-3 text-[13px] text-muted-foreground">
              <a href="#">Privacy</a>
              <a href="#">Terms of use</a>
              <a href="#">PDPL compliance</a>
            </div>
          </div>
        </div>
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-[12px] text-muted-foreground/80">© 2026 Loup · Simulated demo</p>
          {isDev && onReset && (
            <button type="button" onClick={onReset} data-testid="button-reset-demo" className="text-[12px] text-muted-foreground/80 hover:text-foreground">
              Reset demo data
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}
