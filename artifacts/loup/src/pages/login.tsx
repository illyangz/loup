import { ArrowRight, BriefcaseBusiness, Building2, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useListDemoRoles, getListDemoRolesQueryKey } from "@workspace/api-client-react";
import { DataState } from "@/components/platform-shell";

const fallbackRoles = [
  { role: "employee", label: "Employee", description: "A private concierge for the things waiting at home.", href: "/employee", icon: Sparkles, note: "Allowance and bookings" },
  { role: "employer", label: "Employer", description: "Govern benefits with a clear view of adoption, cost, and care.", href: "/employer", icon: Building2, note: "Benefits governance" },
  { role: "vendor", label: "Vendor", description: "Plan the day, protect capacity, and deliver work worth repeating.", href: "/vendor", icon: BriefcaseBusiness, note: "Service operations" },
  { role: "operations", label: "Operations", description: "A calm control tower for matching, quality, and recovery.", href: "/operations", icon: ShieldCheck, note: "Internal control tower" },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const rolesQuery = useListDemoRoles({ query: { queryKey: getListDemoRolesQueryKey() } });
  const roles = rolesQuery.data?.map((role) => ({ ...role, icon: fallbackRoles.find((item) => item.role === role.role)?.icon ?? Sparkles, note: fallbackRoles.find((item) => item.role === role.role)?.note ?? "Demo workspace" })) ?? fallbackRoles;
  return (
    <div className="min-h-[100dvh] bg-background px-4 py-6 sm:px-8 lg:px-12 platform-grid">
      <header className="mx-auto flex max-w-7xl items-center justify-between"><Link href="/" className="flex items-center gap-2" data-testid="link-login-home"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground font-serif text-xl italic text-background">L</span><span className="font-serif text-3xl italic">Loup</span></Link><div className="flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5" /> Simulated access</div></header>
      <main className="mx-auto grid max-w-7xl items-center gap-12 py-14 lg:grid-cols-[.8fr_1.2fr] lg:py-24">
        <section className="platform-reveal"><p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Golden Hour / Loup platform</p><h1 className="max-w-xl text-6xl leading-[.86] sm:text-7xl">Time back, <em className="font-serif font-normal text-primary">beautifully</em> coordinated.</h1><p className="mt-7 max-w-md text-base leading-7 text-muted-foreground">Choose a simulated workspace to see how Loup makes the essential parts of life feel lighter for everyone involved.</p><div className="mt-10 flex items-center gap-3 text-sm text-muted-foreground"><span className="h-px w-10 bg-primary" /> Four perspectives, one trusted layer</div></section>
        <section><div className="mb-4 flex items-end justify-between"><div><p className="text-sm font-medium">Select a demo interface</p><p className="text-xs text-muted-foreground">No credentials required for this walkthrough.</p></div><span className="rounded-full bg-accent px-3 py-1 text-[11px] font-medium text-accent-foreground">v1.0 demo</span></div><DataState loading={rolesQuery.isLoading} error={rolesQuery.isError} onRetry={() => void rolesQuery.refetch()}><div className="grid gap-3 sm:grid-cols-2">{roles.map((role, index) => { const Icon = role.icon; return <button type="button" key={role.role} onClick={() => setLocation(role.href)} className="group platform-surface rounded-2xl p-5 text-left transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary platform-reveal" style={{ animationDelay: `${index * 70}ms` }} data-testid={`button-login-${role.role}`}><div className="flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background"><Icon className="h-5 w-5" /></span><ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" /></div><p className="mt-5 font-serif text-2xl">{role.label}</p><p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-primary">{role.note}</p><p className="mt-3 text-sm leading-5 text-muted-foreground">{role.description}</p></button>; })}</div></DataState></section>
      </main>
      <footer className="mx-auto flex max-w-7xl flex-col gap-3 border-t border-border/70 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>Built for the everyday between work and home.</span><div className="flex gap-4"><Link href="/api-docs" className="hover:text-foreground" data-testid="link-login-api-docs">API docs</Link><Link href="/support" className="hover:text-foreground" data-testid="link-login-support">Support</Link></div></footer>
    </div>
  );
}