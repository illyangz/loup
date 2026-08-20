import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight, Baby, Building2, Car, ChevronDown, Code2, Database, Download,
  Dumbbell, FileSpreadsheet, GraduationCap, Home, KeyRound, LayoutTemplate,
  Lock, PartyPopper, ScrollText, ShieldCheck, Sparkles, Webhook, Eye,
} from "lucide-react";
import { AltitudeNav, AltitudeFooter, type AltitudeNavLink } from "@/components/altitude-shell";
import { useReveal } from "@/hooks/use-reveal";
import { API_BASE_URL } from "@/lib/demo-auth";

gsap.registerPlugin(ScrollTrigger);

/**
 * P1-15/16/19: the marketing landing page — dark editorial register
 * (off-white serif headlines on a near-black canvas, hairline borders, a
 * single blue accent) with GSAP-driven scroll reveals throughout. Now
 * runs on the SAME shared token system + `useTheme()` toggle as every
 * other page in the app (it originally had its own isolated `--alt-*`
 * CSS-var theme, which was the root cause of it and whitepaper.tsx
 * drifting out of sync — see ALTITUDE-DESIGN-REFERENCE.md for the full
 * spec and DESIGN-SYSTEM-NOTES.md for the migration writeup).
 */

// terminal chrome is always dark regardless of the page theme
const TERMINAL_BG = "#1f1f1f";
const TERMINAL_ALT = "#262626";
const TERMINAL_TEXT = "#eeeeee";
const TERMINAL_MUTED = "#a4a19b";

const SERIF = "'Libre Baskerville', Georgia, 'Times New Roman', serif";
const MONO = "'Fira Code', ui-monospace, 'SF Mono', Menlo, monospace";

const NAV_LINKS: AltitudeNavLink[] = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#for-institutions", label: "For institutions" },
  { href: "/whitepaper", label: "Whitepaper", testId: "link-landing-whitepaper" },
  { href: "/api-docs", label: "API docs" },
];

const categories = [
  { icon: Home, label: "Household & Life Admin" },
  { icon: Sparkles, label: "Personal Wellbeing" },
  { icon: Dumbbell, label: "Fitness & Recovery" },
  { icon: Baby, label: "Family & Dependent Support" },
  { icon: Car, label: "Mobility & Convenience" },
  { icon: GraduationCap, label: "Personal Development" },
  { icon: PartyPopper, label: "Recreation & Lifestyle" },
];

const integrations = [
  { icon: FileSpreadsheet, label: "CSV roster" },
  { icon: Database, label: "HRIS sync" },
  { icon: Webhook, label: "Webhooks" },
  { icon: KeyRound, label: "SSO / SAML" },
  { icon: LayoutTemplate, label: "Embeddable widget" },
  { icon: Code2, label: "REST API" },
  { icon: Building2, label: "HR portal" },
  { icon: Download, label: "Data export" },
];

const privacyPoints = [
  { icon: ShieldCheck, label: "PDPL compliant" },
  { icon: Eye, label: "Aggregate-only visibility" },
  { icon: Lock, label: "Encrypted in transit & at rest" },
  { icon: ScrollText, label: "Vetted & insured providers" },
];

const GOVERNANCE_BAR_HEIGHTS = [40, 55, 35, 70, 50, 85, 60];

const faqs = [
  { q: "How does the monthly allowance work?", a: "Your institution funds a benefit tier — faculty, staff, or admin — each month. Loup tracks what's authorized, reserved against open bookings, and redeemed, so you always know exactly what's left to spend." },
  { q: "Which services can I book?", a: "22 curated categories across household, wellness, fitness, and family support — every provider is vetted and insured before they're listed, and quality is monitored end to end by Loup Ops." },
  { q: "Does my institution see what I book?", a: "No. Institutions see aggregate adoption and spend only — never individual bookings, providers, or categories. Privacy is a first-class part of the product, not an afterthought." },
  { q: "Can I add household members?", a: "Yes — invite your household and share the allowance across everyone under one account, with individual booking history kept separate." },
  { q: "What happens if I don't use my full allowance?", a: "Unused allowance doesn't roll over — it resets with your institution's billing cycle, so there's no expiry tracking to manage yourself." },
  { q: "How does roster sync work for institutions?", a: "Upload a CSV or connect your HR system once — Loup keeps employee tiers, campuses, and eligibility in sync automatically, no manual re-entry each month." },
  { q: "Is Loup PDPL compliant?", a: "Yes. All data handling follows UAE PDPL requirements, including consent tracking, data export, and erasure on request." },
  { q: "How long does it take to get started?", a: "Most institutions are live within a 90-day pilot — roster sync, tier configuration, and employee onboarding all happen before the first invoice." },
];

function TrafficLights() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ff5f57" }} />
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#febc20" }} />
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#28c840" }} />
    </div>
  );
}

function LedgerTerminal() {
  const ref = useRef<HTMLDivElement>(null);
  const sidebarItems = ["Roster", "Allowance", "Bookings", "Webhooks", "Settlement"];
  useReveal(ref, { y: 20 });
  return (
    <div className="relative" ref={ref}>
      <div className="absolute -bottom-5 -right-5 h-full w-full rounded-lg bg-white/[0.06]" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-lg border" style={{ background: TERMINAL_BG, borderColor: TERMINAL_ALT }}>
        <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: TERMINAL_ALT }}>
          <TrafficLights />
          <span className="text-[11px]" style={{ color: TERMINAL_MUTED, fontFamily: MONO, letterSpacing: "0.1em" }}>loup — console</span>
        </div>
        <div className="flex">
          <div className="hidden w-[160px] shrink-0 border-r py-3 sm:block" style={{ borderColor: TERMINAL_ALT }}>
            {sidebarItems.map((item, i) => (
              <div
                key={item}
                className="mx-2 rounded px-2.5 py-1.5 text-[13px]"
                style={{ color: i === 1 ? TERMINAL_TEXT : TERMINAL_MUTED, background: i === 1 ? TERMINAL_ALT : "transparent" }}
              >
                {item}
              </div>
            ))}
          </div>
          <div className="flex-1 p-5 overflow-x-auto" style={{ fontFamily: MONO, letterSpacing: "0.02em" }}>
            <p className="whitespace-nowrap text-[13px]" style={{ color: TERMINAL_MUTED }}>
              $ loup sync roster --institution=meridian-intnl
            </p>
            <p className="mt-1.5 text-[13px]" style={{ color: "#3ecf6e" }}>
              ✓ 60 employees synced · 3 tier changes
            </p>
            <p className="mt-5 whitespace-nowrap text-[13px]" style={{ color: TERMINAL_MUTED }}>
              $ loup ledger show --employee=omar.mansour
            </p>
            <div className="mt-2.5 min-w-[220px] space-y-1 text-[13px]" style={{ color: TERMINAL_TEXT }}>
              <div className="flex justify-between gap-4"><span>AUTHORIZED</span><span>750.00 AED</span></div>
              <div className="flex justify-between gap-4"><span>RESERVED</span><span>249.00 AED</span></div>
              <div className="flex justify-between gap-4"><span>REDEEMED</span><span>85.00 AED</span></div>
              <div className="my-1.5 h-px" style={{ background: TERMINAL_ALT }} />
              <div className="flex justify-between gap-4 font-medium"><span>AVAILABLE</span><span>416.00 AED</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const LEDGER_ROWS = [
  { id: "#000001", employee: "Omar Mansour", type: "Authorized", date: "20 Aug", amount: "+AED 750" },
  { id: "#000002", employee: "Omar Mansour", type: "Reserved", date: "20 Aug", amount: "+AED 249" },
  { id: "#000003", employee: "Omar Mansour", type: "Redeemed", date: "20 Aug", amount: "+AED 85" },
  { id: "#000004", employee: "Layla Mansour", type: "Reserved", date: "19 Aug", amount: "+AED 120" },
];

/** Below `sm`, a real table can't fit without horizontal scrolling on a phone — render a stacked card list instead. Table returns at `sm` and up. */
function LedgerTable() {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref, { y: 20 });
  return (
    <div ref={ref} className="overflow-hidden rounded-lg border" style={{ background: TERMINAL_BG, borderColor: TERMINAL_ALT }}>
      <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: TERMINAL_ALT }}>
        <TrafficLights />
        <span className="text-[11px]" style={{ color: TERMINAL_MUTED, fontFamily: MONO, letterSpacing: "0.1em" }}>settlement — ledger.table</span>
      </div>

      {/* Mobile: stacked cards */}
      <div className="divide-y sm:hidden" style={{ borderColor: TERMINAL_ALT }}>
        {LEDGER_ROWS.map((row) => (
          <div key={row.id} className="p-4" style={{ borderColor: TERMINAL_ALT }}>
            <div className="flex items-center justify-between">
              <span className="text-[12px]" style={{ color: TERMINAL_MUTED, fontFamily: MONO }}>{row.id}</span>
              <span className="text-[13px] font-medium" style={{ color: TERMINAL_TEXT }}>{row.amount}</span>
            </div>
            <p className="mt-1.5 text-[14px]" style={{ color: TERMINAL_TEXT }}>{row.employee}</p>
            <div className="mt-1 flex items-center justify-between text-[12px]" style={{ color: TERMINAL_MUTED }}>
              <span>{row.type}</span>
              <span>{row.date}</span>
            </div>
          </div>
        ))}
      </div>

      {/* sm and up: real table */}
      <div className="hidden overflow-x-auto p-2 sm:block">
        <table className="w-full min-w-[480px] border-collapse text-[13px]">
          <thead>
            <tr style={{ color: TERMINAL_MUTED }}>
              {["Transaction", "Employee", "Type", "Date", "Amount"].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-[11px] font-medium uppercase" style={{ letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LEDGER_ROWS.map((row, i) => (
              <tr key={row.id} style={{ background: i % 2 === 1 ? TERMINAL_ALT : "transparent", borderBottom: `1px solid ${TERMINAL_ALT}` }}>
                <td className="px-3 py-3" style={{ color: TERMINAL_MUTED, fontFamily: MONO, fontSize: 12 }}>{row.id}</td>
                <td className="px-3 py-3" style={{ color: TERMINAL_TEXT }}>{row.employee}</td>
                <td className="px-3 py-3" style={{ color: TERMINAL_TEXT }}>{row.type}</td>
                <td className="px-3 py-3" style={{ color: TERMINAL_MUTED }}>{row.date}</td>
                <td className="px-3 py-3 text-right" style={{ color: TERMINAL_TEXT }}>{row.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GhostLink({ href, children, testId }: { href: string; children: React.ReactNode; testId?: string }) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className="inline-flex items-center gap-2 rounded border border-foreground px-4 py-2 text-[14px] font-medium text-foreground transition-colors hover:bg-secondary"
    >
      {children}
    </Link>
  );
}

/** Smooth single-line mountain ridge, drawn in with GSAP on mount via a Catmull-Rom → cubic-bezier path. */
function catmullRomPath(points: { x: number; y: number }[]) {
  let d = `M${points[0]!.x},${points[0]!.y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

const RIDGE_POINTS = [
  { x: 0, y: 92 }, { x: 130, y: 58 }, { x: 260, y: 88 }, { x: 400, y: 32 },
  { x: 540, y: 78 }, { x: 660, y: 18 }, { x: 800, y: 72 }, { x: 940, y: 42 },
  { x: 1080, y: 68 }, { x: 1200, y: 48 },
];

function RidgeLine() {
  const pathRef = useRef<SVGPathElement>(null);
  const d = catmullRomPath(RIDGE_POINTS);

  useEffect(() => {
    if (!pathRef.current) return;
    const el = pathRef.current;
    const length = el.getTotalLength();
    el.style.strokeDasharray = `${length}`;
    el.style.strokeDashoffset = `${length}`;
    const tween = gsap.to(el, { strokeDashoffset: 0, duration: 2.4, ease: "power2.inOut", delay: 0.5 });
    return () => { tween.kill(); };
  }, []);

  return (
    <svg viewBox="0 0 1200 110" preserveAspectRatio="none" className="h-[90px] w-full sm:h-[110px]" aria-hidden="true">
      <path ref={pathRef} d={d} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProductSplit({ id, kicker, title, body, cta, visual, reverse = false }: {
  id?: string; kicker?: string; title: string; body: string; cta?: string; visual: React.ReactNode; reverse?: boolean;
}) {
  const copyRef = useRef<HTMLDivElement>(null);
  useReveal(copyRef, { stagger: true, y: 20 });
  return (
    <section id={id} className="mx-auto max-w-[1200px] px-6 py-20 sm:px-10">
      <div className={`grid items-center gap-12 lg:grid-cols-5 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
        <div className="lg:col-span-2" ref={copyRef}>
          {kicker && <p className="text-[12px] font-medium uppercase text-muted-foreground" style={{ letterSpacing: "0.05em" }}>{kicker}</p>}
          <h2 className={kicker ? "mt-3 font-serif text-[2.25rem] font-normal leading-[1.15] tracking-[-0.025em] text-foreground" : "font-serif text-[2.25rem] font-normal leading-[1.15] tracking-[-0.025em] text-foreground"}>
            {title}
          </h2>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground">{body}</p>
          {cta && (
            <a href="#for-institutions" className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-medium text-primary">
              {cta} <ArrowRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        <div className="lg:col-span-3 min-w-0">{visual}</div>
      </div>
    </section>
  );
}

function FaqRow({ index, q, a, open, onToggle }: { index: number; q: string; a: string; open: boolean; onToggle: () => void }) {
  const answerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = answerRef.current;
    if (!el) return;
    if (open) {
      gsap.to(el, { height: "auto", opacity: 1, duration: 0.4, ease: "power2.out" });
    } else {
      gsap.to(el, { height: 0, opacity: 0, duration: 0.3, ease: "power2.in" });
    }
  }, [open]);

  return (
    <div className="border-t border-border" data-testid={`accordion-faq-${index}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-4">
          <span className="text-[12px] text-muted-foreground/70" style={{ fontFamily: MONO }}>{String(index + 1).padStart(2, "0")}</span>
          <span className="text-[15px] font-medium text-foreground">{q}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div ref={answerRef} style={{ height: open ? "auto" : 0, opacity: open ? 1 : 0, overflow: "hidden" }}>
        <p className="pb-5 pl-9 text-[14px] leading-relaxed text-muted-foreground">{a}</p>
      </div>
    </div>
  );
}

export default function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const heroHeadRef = useRef<HTMLHeadingElement>(null);
  const heroSubRef = useRef<HTMLParagraphElement>(null);
  const heroCtaRef = useRef<HTMLDivElement>(null);
  const categoryGridRef = useRef<HTMLDivElement>(null);
  const workflowCopyRef = useRef<HTMLDivElement>(null);
  const institutionsHeadRef = useRef<HTMLDivElement>(null);
  const integrationsGridRef = useRef<HTMLDivElement>(null);
  const privacyGridRef = useRef<HTMLDivElement>(null);
  const faqHeadRef = useRef<HTMLDivElement>(null);
  const ctaBarRef = useRef<HTMLDivElement>(null);
  const governanceBarsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.15 });
    tl.fromTo(heroHeadRef.current, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.9, ease: "power2.out" })
      .fromTo(heroSubRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, "-=0.55")
      .fromTo(heroCtaRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, "-=0.4");
    return () => { tl.kill(); };
  }, []);

  useReveal(categoryGridRef, { stagger: true, y: 18 });
  useReveal(workflowCopyRef, { stagger: true, y: 18 });
  useReveal(institutionsHeadRef, { stagger: true, y: 18 });
  useReveal(integrationsGridRef, { stagger: true, y: 12 });
  useReveal(privacyGridRef, { stagger: true, y: 12 });
  useReveal(faqHeadRef, { stagger: true, y: 18 });
  useReveal(ctaBarRef, { y: 18 });

  // Governance bar chart: grow each bar from 0 to its real height on
  // scroll reveal. fromTo with explicit end heights (not gsap.from) —
  // same reasoning as useReveal, see hooks/use-reveal.ts.
  useEffect(() => {
    if (!governanceBarsRef.current) return;
    const el = governanceBarsRef.current;
    const bars = Array.from(el.children);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        bars,
        { height: "0%" },
        {
          height: (i: number) => `${GOVERNANCE_BAR_HEIGHTS[i]}%`,
          duration: 0.7,
          stagger: 0.08,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        }
      );
    }, el);
    return () => ctx.revert();
  }, []);

  const handleReset = async () => {
    if (!confirm("Reset all demo data to the Meridian seed?")) return;
    await fetch(`${API_BASE_URL}${import.meta.env.BASE_URL}api/v1/demo/reset`, { method: "POST" });
    window.location.reload();
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <AltitudeNav links={NAV_LINKS} current="/" />

      {/* Hero */}
      <header className="px-6 pt-20 text-center sm:px-10 sm:pt-28">
        <h1
          ref={heroHeadRef}
          className="mx-auto max-w-3xl font-serif font-normal text-foreground"
          style={{ fontSize: "clamp(2.5rem,6vw,4.5rem)", lineHeight: 1.1, letterSpacing: "-0.025em" }}
          data-testid="text-landing-headline"
        >
          The private concierge<br />layer for institutions.
        </h1>
        <p ref={heroSubRef} className="mx-auto mt-6 max-w-lg text-[18px] text-muted-foreground">
          Loup turns a monthly allowance into vetted household help — booked in a few taps, funded directly by your institution.
        </p>
        <div ref={heroCtaRef} className="mt-8 flex justify-center">
          <GhostLink href="/login" testId="button-hero-get-started">Sign in</GhostLink>
        </div>
        <div className="mt-14">
          <RidgeLine />
        </div>
      </header>

      {/* Product split 1 — ledger console */}
      <ProductSplit
        kicker="The allowance engine"
        title="An allowance, not a black box."
        body="Every authorization, reservation, and redemption is tracked in a real ledger — for employees and institutions alike. No spreadsheets, no reconciliation at month end."
        cta="See the widget"
        visual={<LedgerTerminal />}
      />

      {/* Light section — workflow / category grid */}
      <section id="how-it-works" className="bg-secondary/40 px-6 py-20 sm:px-10">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-5">
          <div className="rounded-2xl bg-[#e4e4e4] p-6 lg:col-span-3">
            {/* flex + grow (not grid) so a short last row stretches to fill the
                full row width instead of leaving one row "full" and the other
                "partial" — 7 items never divides evenly into any fixed column
                count, so every row is made to look complete instead. */}
            <div ref={categoryGridRef} className="flex flex-wrap gap-x-3 gap-y-6 pb-6">
              {categories.map((cat) => (
                <div
                  key={cat.label}
                  className="flex min-h-[112px] grow basis-[calc(50%-6px)] flex-col items-center justify-center gap-3 rounded-lg border border-[#d8d6d1] bg-white px-3 py-6 text-center transition-transform hover:-translate-y-0.5 sm:basis-[calc(25%-9px)]"
                  data-testid={`tile-category-${cat.label.split(" ")[0]?.toLowerCase()}`}
                >
                  <cat.icon className="h-6 w-6 text-[#1a365d]" strokeWidth={1.5} />
                  <p className="text-[13px] font-medium leading-tight text-[#181818]">{cat.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2" ref={workflowCopyRef}>
            <p className="text-[12px] font-medium uppercase text-muted-foreground" style={{ letterSpacing: "0.05em" }}>One allowance</p>
            <h2 className="mt-3 font-serif text-[2.25rem] font-normal leading-[1.15] tracking-[-0.025em] text-foreground">
              Seven categories.<br />Zero paperwork.
            </h2>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
              22 curated services across the categories that keep a household running — every provider background-checked and insured before it ever appears in a booking flow.
            </p>
          </div>
        </div>
      </section>

      {/* Product split 2 — settlement table, reversed */}
      <ProductSplit
        id="institutions"
        kicker="Settlement & audit"
        title="Every transaction, accounted for."
        body="Institutions see a full audit trail of authorized, reserved, and redeemed allowance across every campus — reconciled automatically against Loup's platform fee."
        visual={<LedgerTable />}
        reverse
      />

      {/* Built for institutions */}
      <section id="for-institutions" className="bg-secondary/40 px-6 py-20 sm:px-10">
        <div className="mx-auto max-w-[1200px] text-center">
          <div ref={institutionsHeadRef}>
            <h2 className="font-serif text-[2.25rem] font-normal leading-[1.15] tracking-[-0.025em] text-foreground">
              Built for institutions.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] text-muted-foreground">
              Roster sync, governance, and privacy — designed for schools managing hundreds of employees across multiple campuses.
            </p>
          </div>
          <div className="mt-12 grid gap-5 text-left sm:grid-cols-3">
            <div className="rounded-lg border border-border p-6">
              <h3 className="text-[16px] font-semibold text-foreground">Integrations</h3>
              <div ref={integrationsGridRef} className="mt-5 grid grid-cols-4 gap-3">
                {integrations.map((item) => (
                  <div key={item.label} className="flex h-11 w-11 items-center justify-center rounded bg-secondary transition-transform hover:-translate-y-0.5" title={item.label}>
                    <item.icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  </div>
                ))}
              </div>
              <p className="mt-5 text-[13px] leading-relaxed text-muted-foreground">Loup syncs roster and eligibility data via CSV, HRIS, or the REST API — no manual re-entry.</p>
            </div>
            <div className="rounded-lg border border-border p-6">
              <h3 className="text-[16px] font-semibold text-foreground">Governance</h3>
              <div ref={governanceBarsRef} className="mt-5 flex items-end gap-1.5" style={{ height: 44 }}>
                {GOVERNANCE_BAR_HEIGHTS.map((h, i) => (
                  <div key={i} className={cnBar(i === 5)} style={{ height: 0 }} data-target-height={h} />
                ))}
              </div>
              <div className="mt-5 space-y-2 text-[13px] text-muted-foreground">
                <div className="flex justify-between"><span>Faculty tier</span><span className="text-foreground">62%</span></div>
                <div className="flex justify-between"><span>Staff tier</span><span className="text-foreground">31%</span></div>
                <div className="flex justify-between"><span>Admin tier</span><span className="text-foreground">7%</span></div>
              </div>
            </div>
            <div className="rounded-lg border border-border p-6">
              <h3 className="text-[16px] font-semibold text-foreground">Privacy</h3>
              <div ref={privacyGridRef} className="mt-5 grid grid-cols-2 gap-3">
                {privacyPoints.map((item) => (
                  <div key={item.label} className="flex min-h-[88px] flex-col items-start justify-center gap-2 rounded bg-secondary p-3 transition-transform hover:-translate-y-0.5">
                    <item.icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                    <p className="text-[11px] leading-tight text-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-20 sm:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <div ref={faqHeadRef}>
            <h2 className="font-serif text-[2.25rem] font-normal leading-[1.15] tracking-[-0.025em] text-foreground">
              Got questions?
            </h2>
            <h3 className="font-serif text-[2.25rem] font-normal leading-[1.15] tracking-[-0.025em] text-muted-foreground/70">
              We've got answers.
            </h3>
          </div>
          <div className="mt-12 text-left">
            {faqs.map((item, i) => (
              <FaqRow
                key={item.q}
                index={i}
                q={item.q}
                a={item.a}
                open={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
            <div className="border-t border-border" />
          </div>
        </div>
      </section>

      {/* Bottom CTA bar */}
      <section className="px-6 sm:px-10">
        <div ref={ctaBarRef} className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-6 rounded-lg border border-border p-8 sm:flex-row">
          <h2 className="font-serif text-[1.75rem] font-normal tracking-[-0.025em] text-foreground">
            Built for institutions across the UAE.
          </h2>
          <GhostLink href="/login" testId="button-footer-cta">Get started</GhostLink>
        </div>
      </section>

      <AltitudeFooter onReset={() => void handleReset()} />
    </div>
  );
}

function cnBar(active: boolean) {
  return active ? "flex-1 rounded-sm bg-primary" : "flex-1 rounded-sm bg-[#323232]";
}
