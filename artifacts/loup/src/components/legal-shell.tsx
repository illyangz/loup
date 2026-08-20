import { useRef } from "react";
import { AltitudeNav, AltitudeFooter, type AltitudeNavLink } from "@/components/altitude-shell";
import { useReveal } from "@/hooks/use-reveal";

const NAV_LINKS: AltitudeNavLink[] = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#for-institutions", label: "For institutions" },
  { href: "/whitepaper", label: "Whitepaper" },
  { href: "/api-docs", label: "API docs" },
];

export function LegalPage({ title, updated, current, children }: { title: string; updated: string; current: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref, { y: 10, immediate: true });

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <AltitudeNav links={NAV_LINKS} current={current} />
      <main className="mx-auto max-w-3xl px-6 py-16 sm:px-10 sm:py-20">
        <div ref={ref}>
          <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-[-0.02em] sm:text-5xl">{title}</h1>
          <p className="mt-4 text-sm text-muted-foreground">Last updated {updated}</p>
        </div>
        <div className="mt-12 space-y-8 text-[15px] leading-relaxed text-foreground">
          {children}
        </div>
      </main>
      <AltitudeFooter />
    </div>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-serif text-2xl font-normal text-foreground">{heading}</h2>
      <div className="mt-3 space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}
