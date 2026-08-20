import { useEffect, useRef, useState } from "react";
import { ArrowRight, BriefcaseBusiness, Building2, ExternalLink, Loader2, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { useListDemoRoles, getListDemoRolesQueryKey, useDemoLogin, useGetSsoStatus } from "@workspace/api-client-react";
import { DataState } from "@/components/platform-shell";
import { ensureAuthGetter, storeToken } from "@/lib/demo-auth";
import { useReveal } from "@/hooks/use-reveal";

const BASE = import.meta.env.BASE_URL;

const fallbackRoles = [
  { role: "employee", label: "Consumer", description: "A private concierge for the things waiting at home.", href: "/employee", icon: Sparkles, note: "Allowance and bookings" },
  { role: "employer", label: "Employer", description: "Govern benefits with a clear view of adoption, cost, and care.", href: "/employer", icon: Building2, note: "Benefits governance" },
  { role: "vendor", label: "Vendor", description: "Plan the day, protect capacity, and deliver work worth repeating.", href: "/vendor", icon: BriefcaseBusiness, note: "Service operations" },
  { role: "operations", label: "Operations", description: "A calm control tower for matching, quality, and recovery.", href: "/operations", icon: ShieldCheck, note: "Internal control tower" },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const rolesQuery = useListDemoRoles({ query: { queryKey: getListDemoRolesQueryKey() } });
  const ssoStatusQuery = useGetSsoStatus();
  const loginMutation = useDemoLogin();
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [ssoError, setSsoError] = useState<string | null>(null);

  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  useReveal(headerRef, { y: 12, immediate: true });
  useReveal(gridRef, { y: 14, stagger: true, immediate: true, delay: 0.1 });

  // P1-1: SSO callback lands here with ?token= or ?error=
  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get("token");
    if (token) {
      storeToken(token);
      ensureAuthGetter();
      setLocation("/institution");
      return;
    }
    const error = params.get("error");
    if (error === "no_account") {
      setSsoError(`Signed in with ${params.get("email") ?? "your SSO email"}, but no Loup account matches it.`);
    } else if (error) {
      setSsoError("Single sign-on did not complete. Try again or use the demo login.");
    }
  }, [search, setLocation]);

  const roles = rolesQuery.data?.map((role) => {
    const fallback = fallbackRoles.find((item) => item.role === role.role);
    return { ...role, icon: fallback?.icon ?? Sparkles, note: fallback?.note ?? "Demo workspace" };
  }) ?? fallbackRoles;

  const handleSignIn = async (role: { role: string; href: string }, slug?: string) => {
    setPendingRole(role.role);
    try {
      const result = await loginMutation.mutateAsync({ data: { role: role.role as "employee" | "institution" | "provider" | "admin", ...(slug ? { slug } : {}) } });
      storeToken(result.token);
      ensureAuthGetter();
      setLocation(role.href);
    } catch (err) {
      console.error("Demo login failed", err);
      setPendingRole(null);
    }
  };

  const ssoTenant = tenantSlug
    ? ssoStatusQuery.data?.institutions?.find((i) => i.slug === (tenantSlug === "meridian" ? "meridian-international" : "al-noor-university"))
    : undefined;

  const handleCardClick = (role: { role: string; href: string }) => {
    if (role.role === "institution" && tenantSlug === null) {
      setTenantSlug("meridian");
      return;
    }
    void handleSignIn(role, role.role === "institution" ? tenantSlug ?? undefined : undefined);
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-70" data-testid="link-login-home">
          <span className="flex h-8 w-8 items-center justify-center rounded border border-foreground text-[13px] font-semibold text-foreground">L</span>
          <span className="text-[15px] font-semibold uppercase tracking-[0.08em] text-foreground">Loup</span>
        </Link>
        <div className="inline-flex items-center gap-2 rounded border border-border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          <LockKeyhole className="h-3.5 w-3.5" /> Simulated demo
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 pb-24 pt-16 sm:px-10 sm:pt-20">
        <div ref={headerRef} className="mb-20 text-center">
          <h1 className="font-serif text-[clamp(2.25rem,4.5vw,3.25rem)] font-normal leading-[1.1] tracking-[-0.02em] text-foreground">
            Four perspectives, one trusted layer.
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-[16px] leading-relaxed text-muted-foreground">
            Choose a workspace to explore how Loup orchestrates the space between work and home.
          </p>
        </div>

        <DataState loading={rolesQuery.isLoading} error={rolesQuery.isError} onRetry={() => void rolesQuery.refetch()}>
          {ssoError && (
            <div className="mb-6 rounded-lg border border-destructive/30 bg-card px-5 py-4 text-[14px] text-foreground" data-testid="status-sso-error">
              {ssoError}
            </div>
          )}
          <div ref={gridRef} className="grid gap-4 sm:grid-cols-2">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <div
                  key={role.role}
                  onClick={() => { if (pendingRole === null) handleCardClick(role); }}
                  onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && pendingRole === null) { e.preventDefault(); handleCardClick(role); } }}
                  role="button"
                  tabIndex={pendingRole === null ? 0 : -1}
                  aria-disabled={pendingRole !== null}
                  className={`group relative w-full rounded-lg border border-border bg-card p-7 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${pendingRole !== null ? "opacity-60" : ""}`}
                  data-testid={`button-login-${role.role}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded border border-border bg-secondary">
                      <Icon className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    {pendingRole === role.role && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>

                  <div className="mt-7">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{role.note}</p>
                    <p className="mt-2 text-[21px] font-medium tracking-tight text-foreground">{role.label}</p>
                    <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{role.description}</p>
                  </div>

                  <div className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground opacity-0 transition-opacity group-hover:opacity-100">
                    Continue <ArrowRight className="h-3.5 w-3.5" />
                  </div>

                  {role.role === "institution" && tenantSlug !== null && (
                    <div className="relative z-10 mt-5 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sign in as institution</p>
                      <div className="flex gap-2">
                        {(["meridian", "al-noor"] as const).map((slug) => (
                          <button
                            type="button"
                            key={slug}
                            disabled={pendingRole !== null}
                            onClick={() => void handleSignIn({ role: "institution", href: "/institution" }, slug)}
                            className={`flex-1 rounded border px-3 py-2 text-xs font-medium transition-colors ${
                              tenantSlug === slug
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                            }`}
                            data-testid={`button-login-tenant-${slug}`}
                          >
                            {slug === "meridian" ? "Meridian Education Group" : "Al Noor University"}
                          </button>
                        ))}
                      </div>
                      {ssoTenant?.ssoConfigured && (
                        <a
                          href={`${BASE}api/v1/auth/sso?slug=${ssoTenant.slug}`}
                          className="mt-1 inline-flex items-center justify-center gap-2 rounded border border-border bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                          data-testid="link-login-sso"
                        >
                          <LockKeyhole className="h-3 w-3" /> Sign in with SSO <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DataState>
      </div>
    </div>
  );
}
