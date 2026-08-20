import { useEffect, useRef, useState } from "react";
import { ArrowRight, CalendarDays, Check, ChevronRight, Clock3, Code2, ExternalLink, Home, Layers3, Lock, Plug, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useGetEmployeeOverview, getGetEmployeeOverviewQueryKey } from "@workspace/api-client-react";
import { DataState } from "@/components/platform-shell";
import { AltitudeNav, AltitudeFooter, type AltitudeNavLink } from "@/components/altitude-shell";
import { API_BASE_URL, ensureAuthGetter, getStoredToken, storeToken } from "@/lib/demo-auth";
import { useReveal } from "@/hooks/use-reveal";

const BASE = `${API_BASE_URL}${import.meta.env.BASE_URL}`;

const NAV_LINKS: AltitudeNavLink[] = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#for-institutions", label: "For institutions" },
  { href: "/whitepaper", label: "Whitepaper" },
  { href: "/api-docs", label: "API docs" },
];

const ERP_PATHS = [
  {
    icon: Plug,
    title: "Drop-in script tag",
    body: "One <script> embed mounts the widget wherever an institution already sends people — an HR portal, a company intranet, a benefits hub. No SSO project, no deployment on their end.",
  },
  {
    icon: Layers3,
    title: "Works alongside existing HRIS",
    body: "Roster sync reads from whatever the institution already runs — Workday, SuccessFactors, a plain CSV export — and stays the source of truth for eligibility and tier, not a second system employees have to reconcile.",
  },
  {
    icon: Lock,
    title: "Scoped, revocable access",
    body: "The widget only ever sees what its signed token grants — one employee's own benefit, nothing about the roster or other households. Tokens expire and can be revoked without touching the host system.",
  },
];

function money(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(value); }
function date(value: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value)); }

export default function EmbedDemo() {
  const [booked, setBooked] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const query = useGetEmployeeOverview({ query: { queryKey: getGetEmployeeOverviewQueryKey() } });
  const data = query.data;

  const heroRef = useRef<HTMLDivElement>(null);
  const erpRef = useRef<HTMLDivElement>(null);
  const erpGridRef = useRef<HTMLDivElement>(null);
  useReveal(heroRef, { y: 12, immediate: true });
  useReveal(erpRef, { y: 16 });
  useReveal(erpGridRef, { y: 12, stagger: true });

  // Standalone demo: the widget must work without a prior login, so bootstrap
  // a signed demo employee token when none is stored (P0-5).
  useEffect(() => {
    if (getStoredToken() || bootstrapping) return;
    setBootstrapping(true);
    void fetch(`${BASE}api/v1/demo/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "employee" }),
    })
      .then((r) => r.json() as Promise<{ token?: string }>)
      .then((d) => {
        if (d?.token) {
          storeToken(d.token);
          ensureAuthGetter();
          void query.refetch();
        }
      })
      .finally(() => setBootstrapping(false));
  }, [bootstrapping, query]);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <AltitudeNav links={NAV_LINKS} current="/embed/demo" />

      {/* Hero: widget preview */}
      <main className="mx-auto max-w-5xl px-6 py-16 sm:px-10 sm:py-20">
        <div ref={heroRef} className="grid items-center gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-14">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Employee benefit widget</p>
            <h1 className="mt-4 font-serif text-5xl font-normal leading-[1.02] tracking-[-0.02em] sm:text-6xl">A small doorway to a lighter day.</h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-muted-foreground">A focused, embeddable employee experience for a benefits hub, intranet, or HR app.</p>
            <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" /> Designed to feel native to the place it lives
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-[0_25px_80px_rgba(0,0,0,.25)] sm:p-7" data-testid="card-embed-widget">
            <div className="flex items-center justify-between border-b border-border pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded border border-foreground text-[13px] font-semibold text-foreground">L</div>
                <div>
                  <p className="text-sm font-medium text-foreground">Your Loup benefit</p>
                  <p className="text-xs text-muted-foreground">A little more room in the week</p>
                </div>
              </div>
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <DataState loading={query.isLoading} error={query.isError} onRetry={() => void query.refetch()}>
              {data && (
                <div className="pt-5">
                  <div className="rounded-lg bg-foreground p-5 text-background">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-background/60">Available allowance</p>
                        <p className="mt-1 font-serif text-4xl">{money(data.allowance.available)}</p>
                      </div>
                      <p className="text-right text-[11px] text-background/60">Renews<br /><span className="text-background">{date(data.allowance.renewalDate)}</span></p>
                    </div>
                    <div className="mt-4 h-1.5 rounded-full bg-background/15">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(data.allowance.redeemed / data.allowance.authorized) * 100}%` }} />
                    </div>
                  </div>
                  <div className="mt-6">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Next up</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{booked ? "Request received" : data.upcomingBooking?.serviceName ?? "Your next service"}</p>
                      </div>
                      <CalendarDays className="h-4 w-4 text-primary" />
                    </div>
                    {booked ? (
                      <div className="mt-3 flex items-center gap-2 rounded border border-primary/20 bg-primary/10 p-3 text-sm text-primary" data-testid="status-embed-booked">
                        <Check className="h-4 w-4" /> A Loup coordinator will confirm your time.
                      </div>
                    ) : data.upcomingBooking ? (
                      <div className="mt-3 flex items-center gap-3 rounded border border-border p-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-secondary">
                          <Clock3 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs text-foreground">{date(data.upcomingBooking.scheduledAt)} · {new Date(data.upcomingBooking.scheduledAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
                          <p className="text-xs text-muted-foreground">{data.upcomingBooking.providerName}</p>
                        </div>
                        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground">No booking on the calendar yet.</p>
                    )}
                  </div>
                  <div className="mt-6">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Eligible services</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {data.activeCategories.slice(0, 4).map((service) => (
                        <span key={service.slug} className="inline-flex items-center gap-1.5 rounded bg-secondary px-3 py-1.5 text-xs text-foreground" data-testid={`chip-embed-service-${service.slug}`}>
                          <Home className="h-3 w-3 text-muted-foreground" />{service.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBooked(true)}
                    disabled={booked}
                    className="mt-7 flex w-full items-center justify-center gap-2 rounded bg-primary py-3 text-sm font-medium text-primary-foreground transition-all hover:-translate-y-0.5 disabled:cursor-default disabled:opacity-70 disabled:hover:translate-y-0"
                    data-testid="button-embed-book"
                  >
                    {booked ? "Request received" : "Book a service"} {!booked && <ArrowRight className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </DataState>
            <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <ExternalLink className="h-3 w-3" /> Opens in the full Loup experience
            </div>
          </div>
        </div>

        {/* Fits into what the institution already runs */}
        <div ref={erpRef} className="mt-24 sm:mt-32">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Integration</p>
          <h2 className="mt-3 max-w-2xl font-serif text-4xl font-normal leading-[1.05] tracking-[-0.02em] sm:text-5xl">
            Fits into what the institution already runs.
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-6 text-muted-foreground">
            Loup doesn't ask an institution to replace its HRIS or benefits stack — it sits alongside it, reading roster and eligibility
            data from the system of record and surfacing one focused widget wherever employees already look.
          </p>

          <div ref={erpGridRef} className="mt-10 grid gap-4 sm:grid-cols-3">
            {ERP_PATHS.map((path) => (
              <div key={path.title} className="rounded-lg border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-secondary">
                  <path.icon className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.5} />
                </div>
                <h3 className="mt-5 text-[15px] font-medium text-foreground">{path.title}</h3>
                <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{path.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 overflow-hidden rounded-lg bg-foreground text-background">
            <div className="flex items-center gap-2 border-b border-background/10 px-4 py-3 text-xs text-background/60">
              <Code2 className="h-3.5 w-3.5" /> Embed on any intranet, portal, or ERP frontend
            </div>
            <pre className="overflow-x-auto p-5 text-xs leading-6 text-background/80"><code>{`<script src="https://app.loup.co/embed/loup-widget.js" data-token="{{employee_widget_token}}"></script>`}</code></pre>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Need deeper integration than an embed — writing eligibility back into your own system, or reading redemption data into a BI
            tool? The same endpoints are available directly. See the <Link href="/api-docs" className="text-primary hover:opacity-70 transition-opacity">API docs</Link>.
          </p>
        </div>
      </main>

      <AltitudeFooter />
    </div>
  );
}
