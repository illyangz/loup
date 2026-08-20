import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight, Baby, Building2, Car, CheckCircle2, Dumbbell, FileCheck,
  GraduationCap, Handshake, Home, PartyPopper, Rocket, ShieldCheck,
  Sparkles, Wallet,
} from "lucide-react";
import { AltitudeNav, AltitudeFooter, type AltitudeNavLink } from "@/components/altitude-shell";
import { useReveal } from "@/hooks/use-reveal";

gsap.registerPlugin(ScrollTrigger);

/**
 * P1-18/19: the pitch, told like a pitch deck — real content pulled from
 * pitch/one-pager.md and pitch/target-schools.md (the outreach-tactics
 * section of that file was deliberately left out; only the market-segment
 * table, a standard pitch-deck element, is reproduced here). Built in the
 * same Altitude system as landing.tsx, sharing its Nav/Footer via
 * @/components/altitude-shell — see ALTITUDE-DESIGN-REFERENCE.md for the
 * full spec this page follows.
 */

const NAV_LINKS: AltitudeNavLink[] = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#for-institutions", label: "For institutions" },
  { href: "/whitepaper", label: "Whitepaper" },
  { href: "/api-docs", label: "API docs" },
];

const SERIF = "'Libre Baskerville', Georgia, 'Times New Roman', serif";
const MONO = "'Fira Code', ui-monospace, 'SF Mono', Menlo, monospace";

const problems = [
  { title: "Wellbeing is a poster, not help", body: "Teachers and school staff carry the emotional load of running a home while teaching. Existing \"wellbeing\" perks rarely translate into actual help." },
  { title: "One-off spend, no retention signal", body: "Institutions spend budget on one-off wellness days that don't move the number that matters — staff retention." },
  { title: "No one coordinates fulfilment", body: "Existing benefit platforms are B2C marketplaces or generic HR perks — none coordinate real-world service delivery for the education sector in the UAE." },
];

const stakeholders = [
  { icon: Sparkles, label: "Employees", body: "An allowance (AED 400–750/mo by tier) and one tap to book vetted services — a coordinator confirms, a provider shows up." },
  { icon: Building2, label: "Institutions", body: "Governance: plans, tiers, roster sync, utilization analytics, and a single monthly invoice." },
  { icon: ShieldCheck, label: "Providers", body: "DHA-licensed, vetted providers get demand, scheduling, and settlement — Loup handles invoicing and payment." },
  { icon: Wallet, label: "Loup", body: "A hybrid fee: a small SaaS base per eligible employee per month + a % of benefit spend (default 8%), configurable per plan." },
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

const traction = [
  { value: "2", label: "tenants live in one install" },
  { value: "4", label: "signed-token portals" },
  { value: "AED 747", label: "est. monthly revenue · Meridian" },
];

const targetMarket = [
  { tier: "Tier 1 — large groups", name: "Multi-campus K-12 & university groups", emirate: "Dubai · Abu Dhabi", note: "Centralized HR, existing HR tech budget, highest revenue ceiling per pilot" },
  { tier: "Tier 2 — single-site premium", name: "Independent premium schools", emirate: "Dubai · Abu Dhabi", note: "Small HR headcount, short sales cycle, strong brand halo for case studies" },
  { tier: "Tier 3 — university", name: "Higher-education institutions", emirate: "Sharjah · Al Ain", note: "1,000+ faculty & staff; public-sector procurement runs slower, phase-2 target" },
];

const pilotCriteria = ["200+ staff", "Dubai or Abu Dhabi", "Existing HR/wellbeing budget", "Stable leadership"];


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

function SectionHeader({ kicker, title, body, center }: { kicker: string; title: string; body?: string; center?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref, { y: 18 });
  return (
    <div ref={ref} className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="text-[12px] font-medium uppercase text-muted-foreground" style={{ letterSpacing: "0.05em" }}>{kicker}</p>
      <h2 className="mt-3 font-serif text-[clamp(1.75rem,3.5vw,2.5rem)] font-normal leading-[1.15] tracking-[-0.025em] text-foreground">{title}</h2>
      {body && <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{body}</p>}
    </div>
  );
}

export default function Whitepaper() {
  const heroRef = useRef<HTMLDivElement>(null);
  const problemGridRef = useRef<HTMLDivElement>(null);
  const stakeholderGridRef = useRef<HTMLDivElement>(null);
  const categoryGridRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const tractionRef = useRef<HTMLDivElement>(null);
  const marketRef = useRef<HTMLDivElement>(null);
  const askRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.1 });
    tl.fromTo(heroRef.current!.children, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: "power2.out" });
    return () => { tl.kill(); };
  }, []);

  useReveal(problemGridRef, { stagger: true, y: 18 });
  useReveal(stakeholderGridRef, { stagger: true, y: 18 });
  useReveal(categoryGridRef, { stagger: true, y: 14 });
  useReveal(modelRef, { y: 20 });
  useReveal(tractionRef, { stagger: true, y: 18 });
  useReveal(marketRef, { y: 20 });
  useReveal(askRef, { y: 18 });

  const spend = 334;
  const fee = spend * 0.08;
  const perEmployee = 60 * 12;
  const total = fee + perEmployee;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <AltitudeNav links={NAV_LINKS} current="/whitepaper" />

      {/* Hero */}
      <header ref={heroRef} className="px-6 pb-16 pt-20 text-center sm:px-10 sm:pt-28">
        <p className="mx-auto mb-6 max-w-md text-[13px] font-semibold uppercase text-muted-foreground" style={{ letterSpacing: "0.16em" }}>The pitch</p>
        <h1 className="mx-auto max-w-3xl font-serif font-normal" style={{ fontSize: "clamp(2.25rem,5.5vw,4rem)", lineHeight: 1.1, letterSpacing: "-0.025em" }} data-testid="text-whitepaper-headline">
          A private benefit layer<br />for UAE institutions.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-[17px] text-muted-foreground">
          Loup is a UAE-first B2B2C lifestyle-benefits platform for the education sector — schools give staff a monthly allowance they spend on curated home and life services, coordinated end to end by Loup.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <GhostLink href="/login" testId="button-whitepaper-see-product">See the product <ArrowRight className="h-3.5 w-3.5" /></GhostLink>
          <GhostLink href="/" testId="link-whitepaper-back-home">Back to homepage</GhostLink>
        </div>
      </header>

      {/* The problem */}
      <section className="px-6 py-20 sm:px-10 bg-secondary/40 text-foreground">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-[12px] font-medium uppercase text-muted-foreground" style={{ letterSpacing: "0.05em" }}>The problem</p>
          <h2 className="mt-3 font-serif text-[clamp(1.75rem,3.5vw,2.5rem)] font-normal leading-[1.15] tracking-[-0.025em]">Benefits that don't reach anyone.</h2>
          <div ref={problemGridRef} className="mt-10 grid gap-5 sm:grid-cols-3">
            {problems.map((p, i) => (
              <div key={p.title} className="rounded-lg border border-border p-6" data-testid={`card-problem-${i}`}>
                <p className="text-[12px] text-muted-foreground" style={{ fontFamily: MONO }}>{String(i + 1).padStart(2, "0")}</p>
                <p className="mt-3 text-[16px] font-semibold">{p.title}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The product — four stakeholders */}
      <section className="mx-auto max-w-[1200px] px-6 py-20 sm:px-10">
        <SectionHeader kicker="The product" title="One allowance. Four perspectives." body="Employees, institutions, providers, and Loup itself — each gets exactly the view they need." />
        <div ref={stakeholderGridRef} className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stakeholders.map((s) => (
            <div key={s.label} className="glass-card rounded-lg p-6" data-testid={`card-stakeholder-${s.label.toLowerCase()}`}>
              <s.icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
              <p className="mt-4 text-[15px] font-semibold">{s.label}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-14">
          <p className="text-[12px] font-medium uppercase text-muted-foreground" style={{ letterSpacing: "0.05em" }}>Seven categories, 22 services</p>
          <div ref={categoryGridRef} className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {categories.map((cat) => (
              <div key={cat.label} className="flex flex-col items-center gap-2 rounded-lg border border-border px-2 py-5 text-center transition-transform hover:-translate-y-0.5">
                <cat.icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                <p className="text-[11px] font-medium leading-tight">{cat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Business model — real math in a terminal */}
      <section className="px-6 py-20 sm:px-10" style={{ background: "hsl(var(--secondary) / 0.4)" }}>
        <div className="mx-auto max-w-[1200px] grid items-center gap-12 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <SectionHeader kicker="Business model" title="A hybrid fee, not a markup." body="A small per-employee SaaS base plus a percentage of benefit spend redeemed — both configurable per plan. No markup on provider pricing." />
          </div>
          <div ref={modelRef} className="lg:col-span-3 overflow-hidden rounded-lg border" style={{ background: "#1f1f1f", borderColor: "#262626" }}>
            <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: "#262626" }}>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ff5f57" }} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#febc20" }} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#28c840" }} />
              </div>
              <span className="text-[11px]" style={{ color: "#a4a19b", fontFamily: MONO, letterSpacing: "0.1em" }}>loup — fee.calculate</span>
            </div>
            <div className="p-6" style={{ fontFamily: MONO, fontSize: 13, color: "#eeeeee", letterSpacing: "0.02em" }}>
              <p style={{ color: "#a4a19b" }}>$ loup fee calculate --institution=meridian-international</p>
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between"><span>Monthly benefit spend</span><span>AED {spend.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Platform fee (8% of spend)</span><span>AED {fee.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Per-employee fee (60 × AED 12)</span><span>AED {perEmployee.toFixed(2)}</span></div>
                <div className="my-2 h-px" style={{ background: "#262626" }} />
                <div className="flex justify-between font-medium"><span>Est. monthly platform revenue</span><span>AED {total.toFixed(2)}</span></div>
              </div>
              <p className="mt-4" style={{ color: "#3ecf6e" }}>✓ reconciled against Meridian's August ledger</p>
            </div>
          </div>
        </div>
      </section>

      {/* Traction — Phase 0 demo */}
      <section className="mx-auto max-w-[1200px] px-6 py-20 sm:px-10 text-center">
        <SectionHeader kicker="Traction — Phase 0, working today" title="Not a mockup. A working platform." center body="Two tenants, fully isolated. Signed-token login across four portals. A full transaction lifecycle in the webhook log — booking created, accepted, completed, paid, refunded. An embeddable widget that drops into any HR intranet in two lines of HTML." />
        <div ref={tractionRef} className="mt-12 grid gap-8 sm:grid-cols-3">
          {traction.map((t) => (
            <div key={t.label}>
              <p className="font-serif font-normal" style={{ fontSize: "clamp(2.5rem,5vw,3.5rem)", letterSpacing: "-0.02em" }}>{t.value}</p>
              <p className="mt-2 text-[13px] text-muted-foreground">{t.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Target market */}
      <section className="px-6 py-20 sm:px-10" style={{ background: "hsl(var(--secondary) / 0.4)" }}>
        <div className="mx-auto max-w-[1200px]">
          <SectionHeader kicker="Target market" title="UAE education, by segment." body="Pilot fit: 200+ staff, Dubai or Abu Dhabi, an existing HR/wellbeing budget, and stable leadership." />
          <div ref={marketRef} className="mt-10 overflow-hidden rounded-lg border border-border">
            {/* Mobile & tablet: stacked cards */}
            <div className="divide-y divide-border lg:hidden">
              {targetMarket.map((row) => (
                <div key={row.tier} className="p-4">
                  <p className="text-[13px] font-medium">{row.tier}</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">{row.name}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                    <span>{row.emirate}</span>
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{row.note}</p>
                </div>
              ))}
            </div>

            {/* Desktop: real table */}
            <table className="hidden w-full border-collapse text-[13px] lg:table">
              <thead>
                <tr className="text-muted-foreground">
                  {["Segment", "Profile", "Emirate", "Why it fits"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-medium uppercase" style={{ letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {targetMarket.map((row, i) => (
                  <tr key={row.tier} className="border-t border-border" style={{ background: i % 2 === 1 ? "hsl(var(--secondary) / 0.5)" : "transparent" }}>
                    <td className="px-4 py-4 font-medium">{row.tier}</td>
                    <td className="px-4 py-4">{row.name}</td>
                    <td className="px-4 py-4 text-muted-foreground">{row.emirate}</td>
                    <td className="px-4 py-4 text-muted-foreground">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {pilotCriteria.map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5 rounded border border-border px-2.5 py-1 text-[12px] text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-primary" /> {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Pilot offer + ask */}
      <section className="mx-auto max-w-[1200px] px-6 py-20 sm:px-10">
        <div ref={askRef} className="grid gap-5 sm:grid-cols-2">
          <div className="glass-card rounded-lg p-8">
            <Rocket className="h-5 w-5 text-primary" strokeWidth={1.5} />
            <p className="mt-4 font-serif text-[22px] font-normal">The pilot offer</p>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              Free 90-day pilot for 20–50 employees. Loup funds and coordinates provider fulfilment during the pilot; the institution funds the allowance. Pilot goals: ledger reconciliation, provider quality, one full monthly cycle.
            </p>
          </div>
          <div className="glass-card rounded-lg p-8">
            <Handshake className="h-5 w-5 text-primary" strokeWidth={1.5} />
            <p className="mt-4 font-serif text-[22px] font-normal">The ask</p>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              A pilot with 2–3 UAE schools and an introductory network of vetted providers, in exchange for product feedback and a signed letter of intent.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-5 rounded-lg border border-border p-6 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4 sm:flex-1">
            <FileCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={1.5} />
            <p className="text-[13px] text-muted-foreground">A non-binding letter-of-intent template is ready for any institution that wants to move forward — waived fees, confidential pilot data, a monthly utilization and spend report.</p>
          </div>
          <GhostLink href="/login" testId="button-whitepaper-cta">Get started <ArrowRight className="h-3.5 w-3.5" /></GhostLink>
        </div>
      </section>

      <AltitudeFooter />
    </div>
  );
}
