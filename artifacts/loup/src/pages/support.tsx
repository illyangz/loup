import { useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, LifeBuoy, MessageCircle, Search, Send, Sparkles } from "lucide-react";
import { Link } from "wouter";

const topics = [
  { title: "Employee benefit", body: "Allowance, eligibility, booking, or household questions.", href: "/employee", icon: Sparkles },
  { title: "Employer workspace", body: "Roster, utilization, billing, or integrations.", href: "/employer", icon: CheckCircle2 },
  { title: "Vendor operations", body: "Assignments, capacity, quality, or recovery.", href: "/vendor", icon: LifeBuoy },
];

export default function Support() {
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground platform-grid">
      <header className="flex h-20 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-8">
        <Link href="/login" className="flex items-center gap-2.5 transition-opacity hover:opacity-70" data-testid="link-support-brand">
          <span className="flex h-8 w-8 items-center justify-center rounded border border-foreground text-[13px] font-semibold text-foreground">L</span>
          <span className="text-[15px] font-semibold uppercase tracking-[0.08em] text-foreground">Loup</span>
        </Link>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <Link href="/api-docs" className="hover:text-foreground transition-colors" data-testid="link-support-api-docs">API docs</Link>
          <Link href="/login" className="hover:text-foreground transition-colors" data-testid="link-support-login">Choose workspace</Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-8 lg:py-20">
        <section className="platform-reveal">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Loup support</p>
          <h1 className="mt-4 max-w-2xl font-serif text-6xl font-normal leading-[.95] tracking-[-0.02em] text-foreground sm:text-7xl">A human answer, when you need one.</h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">Start with the right door. This simulated support center shows how Loup keeps context intact across employee, employer, vendor, and operations experiences.</p>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-3">
          {topics.map((topic) => {
            const Icon = topic.icon;
            return (
              <Link
                href={topic.href}
                key={topic.title}
                className="group rounded-lg border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40"
                data-testid={`link-support-${topic.title.toLowerCase().replaceAll(" ", "-")}`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded bg-secondary">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <h2 className="mt-7 font-serif text-2xl font-normal text-foreground">{topic.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{topic.body}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary">
                  Open workspace <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[.7fr_1.3fr]">
          <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-serif text-2xl font-normal text-foreground">Quick answers</h2>
            </div>
            <label className="mt-6 flex items-center gap-2 rounded border border-border bg-background/60 px-3 py-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="sr-only">Search support</span>
              <input placeholder="Search the simulated help center" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" data-testid="input-support-search" />
            </label>
            <div className="mt-5 space-y-3 text-sm">
              <button type="button" onClick={() => window.alert("Eligibility article opened in the demo.")} className="flex w-full items-center justify-between rounded border border-border bg-secondary/60 p-3 text-left text-foreground transition-colors hover:bg-secondary" data-testid="button-support-eligibility">
                How does eligibility work? <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <button type="button" onClick={() => window.alert("Privacy article opened in the demo.")} className="flex w-full items-center justify-between rounded border border-border bg-secondary/60 p-3 text-left text-foreground transition-colors hover:bg-secondary" data-testid="button-support-privacy">
                Who can see my household details? <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="rounded-lg bg-foreground p-6 text-background sm:p-8">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-background/70" />
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-background/55">Contact support</p>
                <h2 className="mt-1 font-serif text-3xl font-normal">Tell us what&rsquo;s going on.</h2>
              </div>
            </div>
            {sent ? (
              <div className="mt-9 rounded-lg bg-background/10 p-5" data-testid="status-support-sent">
                <CheckCircle2 className="h-5 w-5 text-background/70" />
                <p className="mt-3 font-medium">Message received.</p>
                <p className="mt-1 text-sm text-background/65">A simulated Loup coordinator will reply in this demo.</p>
              </div>
            ) : (
              <div className="mt-7 space-y-3">
                <input placeholder="Work email" type="email" className="w-full rounded border border-background/15 bg-background/10 px-3 py-3 text-sm text-background outline-none placeholder:text-background/45 focus:ring-2 focus:ring-background/30" data-testid="input-support-email" />
                <textarea placeholder="How can we help?" rows={4} className="w-full resize-none rounded border border-background/15 bg-background/10 px-3 py-3 text-sm text-background outline-none placeholder:text-background/45 focus:ring-2 focus:ring-background/30" data-testid="input-support-message" />
                <button type="button" onClick={() => setSent(true)} className="inline-flex items-center gap-2 rounded bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:-translate-y-0.5" data-testid="button-support-send">
                  Send message <Send className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
