import { ArrowRight, Code2, LockKeyhole, RefreshCw } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useGetHomeSummary } from "@workspace/api-client-react";

const isDev = import.meta.env.DEV;

export default function Landing() {
  const [, setLocation] = useLocation();
  const summaryQuery = useGetHomeSummary();
  const memberName = summaryQuery.data?.memberName;
  const firstName = memberName ? memberName.split(" ")[0] : null;

  const handleReset = async () => {
    if (!confirm("Reset all demo data to the Meridian seed?")) return;
    await fetch(`${import.meta.env.BASE_URL}api/v1/demo/reset`, { method: "POST" });
    window.location.reload();
  };

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-background text-foreground overflow-hidden">

      {/* ── Left — brand panel ─────────────────────────────────────────────── */}
      <div className="relative lg:w-[55%] flex flex-col p-10 lg:p-14 overflow-hidden">

        {/* Background layers */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 80% 60% at 20% 70%, hsl(var(--primary)/0.10) 0%, transparent 65%), radial-gradient(ellipse 55% 45% at 85% 15%, hsl(var(--platform-plum)/0.07) 0%, transparent 65%)" }}
        />

        {/* Decorative ring */}
        <div aria-hidden="true" className="pointer-events-none absolute"
          style={{
            width: 520, height: 520,
            borderRadius: "50%",
            border: "1px solid hsl(var(--primary)/0.08)",
            bottom: -160, left: -80,
          }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute"
          style={{
            width: 340, height: 340,
            borderRadius: "50%",
            border: "1px solid hsl(var(--primary)/0.05)",
            bottom: -60, left: 20,
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--platform-plum))] font-serif font-bold text-xl text-white shadow-[0_0_20px_hsl(var(--primary)/0.25)]">
            L
          </span>
          <span className="font-serif font-extrabold text-2xl tracking-tight text-white">Loup</span>
        </div>

        {/* Hero slogan */}
        <div className="relative z-10 mt-auto mb-auto pt-16 lg:pt-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30 mb-8">
            Meridian Education Group · UAE
          </p>
          <h1 className="text-[clamp(3rem,5.5vw,5.5rem)] leading-[0.88] font-extrabold tracking-tight text-white mb-5">
            Less to do.<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(var(--primary))] to-[#ffa740]">
              More to enjoy.
            </span>
          </h1>
          <p className="text-[17px] leading-relaxed text-white/35 max-w-sm">
            Your employer benefits, organised and ready&nbsp;to&nbsp;use.
          </p>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between mt-16 lg:mt-0">
          <span className="text-[11px] text-white/20">© 2026 Loup</span>
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-medium tracking-widest uppercase text-white/35 backdrop-blur-md">
            <LockKeyhole className="h-3 w-3" /> Simulated demo
          </div>
        </div>
      </div>

      {/* ── Right — entry panel ────────────────────────────────────────────── */}
      <div className="lg:w-[45%] flex items-center justify-center p-10 lg:p-14 border-l border-white/[0.05] bg-white/[0.02]">
        <div className="w-full max-w-[340px] space-y-7 platform-reveal">

          {/* Heading */}
          <div>
            <h2 className="text-[2.1rem] font-serif font-bold text-white leading-[1.1] mb-2">
              {firstName ? `Welcome back, ${firstName}.` : "Welcome back."}
            </h2>
            <p className="text-[14px] text-white/35 leading-relaxed">
              Sign in to manage your benefits and book services.
            </p>
          </div>

          {/* Member chip */}
          {memberName && (
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--primary)/0.25)] to-[hsl(var(--platform-plum)/0.25)] font-serif text-base font-bold text-white">
                {memberName[0]}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-white truncate">{memberName}</p>
                <p className="text-[11px] text-white/35">Meridian Education Group</p>
              </div>
            </div>
          )}

          {/* Primary CTA */}
          <button
            type="button"
            onClick={() => setLocation("/employee")}
            data-testid="button-enter-employee"
            className="group w-full flex items-center justify-center gap-2.5 rounded-xl bg-[hsl(var(--primary))] px-6 py-[14px] text-[14px] font-semibold text-black transition-all hover:brightness-110 hover:shadow-[0_0_28px_hsl(var(--primary)/0.30)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]"
          >
            Open my workspace
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>

          {/* Embed snippet (P0-5) */}
          <div className="rounded-xl border border-white/[0.08] bg-black/25 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                <Code2 className="h-3 w-3" /> Embed the widget in two lines
              </p>
              <Link href="/embed/demo" className="text-[11px] font-medium text-[hsl(var(--primary))] hover:brightness-125 transition-all" data-testid="link-embed-preview">
                Live preview →
              </Link>
            </div>
            <pre className="font-mono text-[11px] leading-relaxed text-white/60 overflow-x-auto">{`<!-- Loup employee benefits widget -->
<script src="/embed/loup-widget.js"></script>`}</pre>
          </div>

          {/* Reset */}
          {isDev && (
            <button
              type="button"
              onClick={() => void handleReset()}
              data-testid="button-reset-demo"
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-[12px] font-medium text-white/25 transition-colors hover:text-white/50"
            >
              <RefreshCw className="h-3 w-3" /> Reset demo data
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
