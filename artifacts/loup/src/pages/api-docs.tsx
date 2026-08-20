import { useState } from "react";
import { Check, ChevronRight, Clipboard, Code2, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

const endpoints = [
  { method: "GET", path: "/api/v1/employee/overview", role: "employee", description: "Allowance, upcoming booking, eligible services, and routines." },
  { method: "GET", path: "/api/v1/employer/utilization", role: "employer", description: "Aggregated activation, category mix, savings, and completion." },
  { method: "GET", path: "/api/v1/vendor/forecast", role: "vendor", description: "Demand windows, confidence, and capacity gaps." },
  { method: "GET", path: "/api/v1/operations/overview", role: "operations", description: "Matching decisions, risk surface, and control-tower signals." },
];

export default function ApiDocs() {
  const [selected, setSelected] = useState(endpoints[0]);
  const [copied, setCopied] = useState(false);
  const copy = () => { setCopied(true); window.setTimeout(() => setCopied(false), 1500); };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground platform-grid">
      <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-xl sm:px-8">
        <Link href="/login" className="flex items-center gap-2.5 transition-opacity hover:opacity-70" data-testid="link-docs-brand">
          <span className="flex h-8 w-8 items-center justify-center rounded border border-foreground text-[13px] font-semibold text-foreground">L</span>
          <span className="text-[15px] font-semibold uppercase tracking-[0.08em] text-foreground">Loup</span>
        </Link>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="rounded border border-border px-3 py-1 uppercase tracking-[0.08em]">Simulated API</span>
          <Link href="/support" className="hover:text-foreground transition-colors" data-testid="link-docs-support">Support</Link>
          <Link href="/login" className="hover:text-foreground transition-colors" data-testid="link-docs-login">Choose workspace</Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-8 lg:py-16">
        <div className="max-w-3xl platform-reveal">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Developer reference</p>
          <h1 className="mt-3 font-serif text-5xl font-normal leading-[1.02] tracking-[-0.02em] sm:text-6xl">A clear contract for care.</h1>
          <p className="mt-6 text-base leading-7 text-muted-foreground">
            Loup&rsquo;s API coordinates the operational layer without exposing the private details that make a household feel private. This is a readable simulation of the v1 surface.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside>
            <div className="sticky top-28">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Endpoints</p>
              <div className="space-y-1">
                {endpoints.map((endpoint) => (
                  <button
                    type="button"
                    key={endpoint.path}
                    onClick={() => setSelected(endpoint)}
                    className={`w-full rounded-lg p-3 text-left text-sm transition-colors ${selected.path === endpoint.path ? "bg-secondary text-foreground border border-border" : "text-muted-foreground hover:bg-secondary/50"}`}
                    data-testid={`button-doc-endpoint-${endpoint.role}`}
                  >
                    <span className="font-mono text-[10px] text-muted-foreground">{endpoint.method}</span>
                    <span className="mt-1 block truncate">{endpoint.path.split("/").slice(-1)[0]}</span>
                  </button>
                ))}
              </div>
              <div className="mt-8 rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Privacy by role</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">Each token sees the smallest useful surface. Household-level detail stays with the employee.</p>
              </div>
            </div>
          </aside>

          <section>
            <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-border bg-secondary px-2 py-1 font-mono text-xs text-muted-foreground">{selected.method}</span>
                    <span className="font-mono text-sm text-foreground">{selected.path}</span>
                  </div>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">{selected.description}</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded border border-border px-3 py-1.5 text-xs text-muted-foreground">
                  <LockKeyhole className="h-3.5 w-3.5" /> {selected.role} token
                </span>
              </div>

              <div className="mt-8 overflow-hidden rounded-lg bg-foreground text-background">
                <div className="flex items-center justify-between border-b border-background/10 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-background/60"><Code2 className="h-3.5 w-3.5" /> Request example</div>
                  <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 text-xs text-background/60 hover:text-background transition-colors" data-testid="button-copy-api-example">
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="overflow-x-auto p-5 text-xs leading-6 text-background/80"><code>{`curl https://api.loup.co${selected.path} \\\n  -H "Authorization: Bearer demo_${selected.role}_token" \\\n  -H "Loup-Version: 2024-08-20"`}</code></pre>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Versioning</p>
                  <p className="mt-2 text-sm leading-6 text-foreground">Pin behavior with <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">Loup-Version</code>. Breaking changes ship behind a new date-based version.</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Response shape</p>
                  <p className="mt-2 text-sm leading-6 text-foreground">Payloads return directly, with ISO 8601 timestamps and whole-AED demo amounts.</p>
                </div>
              </div>

              <div className="mt-6 rounded-lg border border-border bg-secondary/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Embed</p>
                <p className="mt-2 text-sm text-foreground">Add <code className="rounded bg-background px-1.5 py-0.5 text-xs">&lt;script src="/embed/loup-widget.js"&gt;&lt;/script&gt;</code> to a benefits hub to mount the simulated employee widget.</p>
                <Link href="/embed/demo" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:opacity-70 transition-opacity" data-testid="link-docs-embed-preview">
                  Preview the embed <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-border bg-card p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Boundaries that matter</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {[["Employee", "Private allowance, household, and bookings"], ["Employer", "Aggregates and roster eligibility, never household detail"], ["Vendor", "Assigned work and capacity, never employee identity"]].map(([title, body]) => (
                  <div key={title} className="flex gap-3">
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{title}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
