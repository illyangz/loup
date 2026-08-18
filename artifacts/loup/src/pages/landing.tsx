import { ArrowRight, CheckCircle2, LockKeyhole, RefreshCw, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { useGetHomeSummary } from "@workspace/api-client-react";

const isDev = import.meta.env.DEV;

const FEATURES = [
  "Book cleaning, wellness, childcare and more",
  "Track your monthly allowance in real time",
  "Manage your household and upcoming schedule",
];

export default function Landing() {
  const [, setLocation] = useLocation();

  // Pre-fetch the member name for a personalised welcome
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
      <div className="relative lg:w-[58%] flex flex-col justify-between p-10 lg:p-14 bg-[hsl(var(--background))] overflow-hidden">
        {/* Ambient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 30% 60%, hsl(var(--primary)/0.12) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 80% 20%, hsl(var(--platform-plum)/0.08) 0%, transparent 70%)",
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--platform-plum))] font-serif font-bold text-2xl text-white shadow-[0_0_20px_hsl(var(--primary)/0.3)]">
            L
          </span>
          <span className="font-serif font-extrabold text-3xl tracking-tight text-white">Loup</span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 my-auto pt-16 lg:pt-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--primary)/0.25)] bg-[hsl(var(--primary)/0.08)] px-3 py-1 mb-8">
            <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[hsl(var(--primary))]">
              Meridian Education Group
            </span>
          </div>

          <h1 className="text-[clamp(2.6rem,4.5vw,5rem)] leading-[0.9] font-extrabold tracking-tight text-white mb-6">
            Your campus<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(var(--primary))] to-[#ffa740]">
              lifestyle
            </span>
            ,<br />
            beautifully<br />
            managed.
          </h1>

          <div className="h-px w-16 bg-gradient-to-r from-[hsl(var(--primary))] to-transparent mb-8" />

          <ul className="space-y-3.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-[15px] text-white/55">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-[hsl(var(--primary))]" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="text-[11px] text-white/25">© 2026 Loup</span>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium tracking-wide uppercase text-white/50 backdrop-blur-md">
            <LockKeyhole className="h-3 w-3" /> Simulated demo
          </div>
        </div>
      </div>

      {/* ── Right — entry panel ────────────────────────────────────────────── */}
      <div className="lg:w-[42%] flex flex-col items-center justify-center p-10 lg:p-14 bg-white/[0.025] border-l border-white/[0.06]">
        <div className="w-full max-w-sm space-y-8 platform-reveal">

          {/* Welcome */}
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--primary))] mb-3">
              Employee portal
            </p>
            <h2 className="text-4xl font-serif font-bold text-white leading-tight mb-2">
              {firstName ? `Welcome back,\n${firstName}.` : "Welcome back."}
            </h2>
            <p className="text-[15px] text-white/40 leading-relaxed">
              Access your benefits, book services, and manage your household — all in one place.
            </p>
          </div>

          {/* Demo member chip */}
          {memberName && (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--primary)/0.3)] to-[hsl(var(--platform-plum)/0.3)] font-serif text-lg font-bold text-white">
                {memberName[0]}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-white truncate">{memberName}</p>
                <p className="text-[11px] text-white/40">Meridian Education Group</p>
              </div>
            </div>
          )}

          {/* CTA */}
          <button
            type="button"
            onClick={() => setLocation("/employee")}
            data-testid="button-enter-employee"
            className="group w-full flex items-center justify-center gap-3 rounded-xl bg-[hsl(var(--primary))] px-6 py-4 text-[15px] font-semibold text-black transition-all hover:bg-[hsl(var(--primary)/0.88)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.35)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]"
          >
            Open my workspace
            <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
          </button>

          {/* Dev reset */}
          {isDev && (
            <button
              type="button"
              onClick={() => void handleReset()}
              data-testid="button-reset-demo"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-transparent px-4 py-2.5 text-[12px] font-medium text-white/35 transition-colors hover:text-white/60 hover:border-white/20"
            >
              <RefreshCw className="h-3 w-3" /> Reset demo data
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
