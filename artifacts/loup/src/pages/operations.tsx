import { useState } from "react";
import { AlertCircle, BadgeCheck, BookOpen, Building2, CheckCircle2, ChevronDown, ChevronUp, Globe, Layers3, Loader2, Plus, Search, ShieldAlert, ShieldCheck, Star, TrendingUp, Users, Wallet, X } from "lucide-react";
import { DataState, PlatformHeader, PlatformShell, StatTile } from "@/components/platform-shell";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;

// ── Inline types for admin API (not in OpenAPI) ───────────────────────────────
type AdminOverview = { totalInstitutions: number; totalEmployees: number; bookingsToday: number; platformRevenueEstimate: number; qualityWarningsCount: number; activeProviders: number };
type AdminInstitution = { id: number; name: string; slug: string; type: string; city: string; country: string; active: boolean; campusCount: number; campuses: { id: number; name: string }[]; employeeCount: number; createdAt: string };
type AdminProvider = { id: number; name: string; tagline: string; categoryId: number; categoryName: string; rating: number; reviewCount: number; jobsCompleted: number; verified: boolean; availableNow: boolean; startingPrice: number; status: string; openFlagCount: number; hasOpenFlag: boolean; reducedRouting: boolean; qualityFlags: { id: number; flagType: string; currentValue: number; threshold: number }[] };
type QualityFlag = { id: number; providerId: number; providerName: string; flagType: string; threshold: number; currentValue: number; status: string; reviewedAt: string | null; createdAt: string };
type AdminCategory = { id: number; name: string; slug: string; tagline: string; icon: string; startingPrice: number; providerCount: number; serviceCount: number };
type AdminService = { id: number; name: string; description: string; price: number; durationMinutes: number; providerId: number; providerName: string; categoryId: number | null; categoryName: string };
type AdminBooking = { id: number; memberName: string; providerName: string; serviceName: string; categoryName: string; scheduledAt: string; status: string; priceEstimate: number; instructions: string | null };
type LedgerEntry = { id: number; employeeId: number; employeeName: string; entryType: string; amount: number; referenceType: string | null; referenceId: number | null; note: string | null; createdAt: string };

// ── Fetching helpers ──────────────────────────────────────────────────────────
// Role header for admin API calls.
// Production: derive from a verified JWT admin claim.
// Demo: explicit header consumed by requireAdminRole middleware on /v1/admin/* routes.
const ADMIN_HEADERS = { "Content-Type": "application/json", "x-loup-demo-role": "admin" };

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}api${path}`, {
    ...init,
    headers: { ...ADMIN_HEADERS, ...(init?.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

function useAdminData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetch_ = async () => {
    setLoading(true); setError(false);
    try { setData(await apiFetch<T>(path)); }
    catch { setError(true); }
    finally { setLoading(false); }
  };

  return { data, loading, error, refetch: fetch_, setData };
}

function useFetchOnMount<T>(path: string) {
  const state = useAdminData<T>(path);
  // trigger on first render
  const [triggered, setTriggered] = useState(false);
  if (!triggered) { setTriggered(true); void state.refetch(); }
  return state;
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = "overview" | "institutions" | "providers" | "catalog" | "bookings" | "ledger";
const TABS: { id: Tab; label: string; icon: typeof Building2 }[] = [
  { id: "overview",      label: "Overview",      icon: TrendingUp  },
  { id: "institutions",  label: "Institutions",  icon: Building2   },
  { id: "providers",     label: "Providers",     icon: Users       },
  { id: "catalog",       label: "Catalog",       icon: Layers3     },
  { id: "bookings",      label: "Bookings",      icon: BookOpen    },
  { id: "ledger",        label: "Ledger",        icon: Wallet      },
];

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab() {
  const { data, loading, error, refetch } = useFetchOnMount<AdminOverview>("/v1/admin/overview");
  const flags = useFetchOnMount<QualityFlag[]>("/v1/admin/quality-flags");

  function money(v: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(v); }

  return (
    <DataState loading={loading} error={error} onRetry={() => { void refetch(); void flags.refetch(); }}>
      {data && (
        <div className="space-y-6">
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <StatTile index={0} label="Institutions" value={String(data.totalInstitutions)} detail="active on platform" tone="brass" />
            <StatTile index={1} label="Employees" value={String(data.totalEmployees)} detail="across all institutions" />
            <StatTile index={2} label="Bookings today" value={String(data.bookingsToday)} detail="since midnight" tone="mint" />
            <StatTile index={3} label="Platform revenue" value={money(data.platformRevenueEstimate)} detail="redeemed to date" tone="plum" />
            <StatTile index={4} label="Active providers" value={String(data.activeProviders)} detail="verified on platform" />
            <StatTile index={5} label="Quality warnings" value={String(data.qualityWarningsCount)} detail="open flags pending review" tone={data.qualityWarningsCount > 0 ? "plum" : "mint"} />
          </section>

          {/* Open quality flags */}
          {!flags.loading && (flags.data?.filter(f => f.status === "pending_review") ?? []).length > 0 && (
            <section className="glass-card rounded-2xl p-6 border border-red-500/20 platform-reveal">
              <div className="flex items-center gap-3 mb-5">
                <ShieldAlert className="h-5 w-5 text-red-400" />
                <h3 className="font-semibold text-[15px] text-red-400">Open quality flags</h3>
              </div>
              <div className="space-y-3">
                {(flags.data ?? []).filter(f => f.status === "pending_review").map(f => (
                  <div key={f.id} className="flex items-center justify-between rounded-xl bg-red-500/5 border border-red-500/10 px-4 py-3">
                    <div>
                      <p className="font-medium text-[14px]">{f.providerName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{f.flagType.replace(/_/g, " ")} — {f.currentValue.toFixed(2)} vs threshold {f.threshold}</p>
                    </div>
                    <button type="button" onClick={async () => { await apiFetch(`/v1/admin/quality-flags/${f.id}`, { method: "PATCH", body: JSON.stringify({ status: "resolved" }) }); void flags.refetch(); }} className="text-xs rounded-full border border-border/60 px-3 py-1.5 hover:bg-accent/30 transition-colors">Resolve</button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </DataState>
  );
}

// ── Institutions tab ──────────────────────────────────────────────────────────
function InstitutionsTab() {
  const { data, loading, error, refetch, setData } = useFetchOnMount<AdminInstitution[]>("/v1/admin/institutions");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", type: "school", city: "Dubai", country: "AE" });
  const [addCampus, setAddCampus] = useState<{ institutionId: number; name: string } | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; city: string }>({ name: "", city: "" });

  const filtered = (data ?? []).filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()));

  async function handleCreate() {
    if (!form.name) return;
    setSaving(true);
    try {
      const created = await apiFetch<AdminInstitution>("/v1/admin/institutions", { method: "POST", body: JSON.stringify(form) });
      setData([...(data ?? []), created]);
      setShowAdd(false);
      setForm({ name: "", type: "school", city: "Dubai", country: "AE" });
    } catch { /* swallow */ }
    finally { setSaving(false); }
  }

  async function handleToggle(id: number, active: boolean) {
    await apiFetch(`/v1/admin/institutions/${id}`, { method: "PATCH", body: JSON.stringify({ active: !active }) });
    void refetch();
  }

  function startEdit(inst: AdminInstitution) {
    setEditId(inst.id);
    setEditForm({ name: inst.name, city: inst.city });
  }

  async function saveEdit(id: number) {
    setSaving(true);
    try {
      await apiFetch(`/v1/admin/institutions/${id}`, { method: "PATCH", body: JSON.stringify(editForm) });
      void refetch();
      setEditId(null);
    } catch { /* swallow */ }
    finally { setSaving(false); }
  }

  async function handleAddCampus() {
    if (!addCampus?.name) return;
    await apiFetch(`/v1/admin/institutions/${addCampus.institutionId}/campuses`, { method: "POST", body: JSON.stringify({ name: addCampus.name }) });
    setAddCampus(null);
    void refetch();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 rounded-full border border-border/80 bg-background/60 px-4 py-2.5 text-sm focus-within:ring-2 focus-within:ring-primary transition-all">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search institutions…" className="bg-transparent outline-none w-40 placeholder:text-muted-foreground" data-testid="input-search-institutions" />
        </label>
        <button type="button" onClick={() => setShowAdd(v => !v)} className="ml-auto inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:-translate-y-0.5 transition-all" data-testid="button-add-institution">
          <Plus className="h-4 w-4" /> Add institution
        </button>
      </div>

      {showAdd && (
        <div className="glass-card rounded-2xl p-6 border border-primary/20 platform-reveal">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">New institution</h3>
            <button type="button" onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
            <div><label className="label-xs">Name</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-std mt-1" placeholder="Greenfield International" data-testid="input-institution-name" /></div>
            <div><label className="label-xs">Type</label><select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="input-std mt-1"><option value="school">School</option><option value="university">University</option><option value="corporate">Corporate</option></select></div>
            <div><label className="label-xs">City</label><input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} className="input-std mt-1" /></div>
            <div><label className="label-xs">Country</label><input value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} className="input-std mt-1" /></div>
          </div>
          <button type="button" disabled={!form.name || saving} onClick={handleCreate} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50" data-testid="button-submit-institution">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
          </button>
        </div>
      )}

      <DataState loading={loading} error={error} onRetry={() => void refetch()}>
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map(inst => (
            <div key={inst.id} className="glass-card rounded-2xl p-6 platform-reveal" data-testid={`row-institution-${inst.id}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 mr-3">
                  {editId === inst.id ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="flex-1 input-std text-sm" placeholder="Institution name" autoFocus data-testid={`input-edit-institution-name-${inst.id}`} />
                        <input value={editForm.city} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))} className="w-28 input-std text-sm" placeholder="City" />
                      </div>
                      <div className="flex gap-2">
                        <button type="button" disabled={!editForm.name || saving} onClick={() => saveEdit(inst.id)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50" data-testid={`button-save-institution-${inst.id}`}>{saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}</button>
                        <button type="button" onClick={() => setEditId(null)} className="text-xs text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-[15px]">{inst.name}</p>
                      <p className="text-sm text-muted-foreground mt-0.5"><Globe className="inline h-3.5 w-3.5 mr-1" />{inst.city}, {inst.country} · {inst.type}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn("text-xs rounded-full px-2.5 py-1 font-medium", inst.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{inst.active ? "Active" : "Inactive"}</span>
                  {editId !== inst.id && <button type="button" onClick={() => startEdit(inst)} className="text-xs text-muted-foreground hover:text-foreground border border-border/50 rounded-full px-2.5 py-1 transition-colors" data-testid={`button-edit-institution-${inst.id}`}>Edit</button>}
                  <button type="button" onClick={() => handleToggle(inst.id, inst.active)} className="text-xs text-muted-foreground hover:text-foreground border border-border/50 rounded-full px-2.5 py-1 transition-colors">{inst.active ? "Suspend" : "Activate"}</button>
                </div>
              </div>
              <div className="flex items-center gap-5 text-sm text-muted-foreground mb-4">
                <span><Building2 className="inline h-3.5 w-3.5 mr-1" />{inst.campusCount} campus{inst.campusCount !== 1 ? "es" : ""}</span>
                <span><Users className="inline h-3.5 w-3.5 mr-1" />{inst.employeeCount} employees</span>
              </div>
              {inst.campuses.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {inst.campuses.map(c => <span key={c.id} className="text-xs bg-accent/40 border border-border/30 rounded-full px-2.5 py-1">{c.name}</span>)}
                </div>
              )}
              <button type="button" onClick={() => setAddCampus({ institutionId: inst.id, name: "" })} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"><Plus className="h-3 w-3" />Add campus</button>
              {addCampus?.institutionId === inst.id && (
                <div className="mt-3 flex gap-2">
                  <input value={addCampus.name} onChange={e => setAddCampus(p => p ? { ...p, name: e.target.value } : p)} className="flex-1 input-std text-sm" placeholder="Campus name" autoFocus data-testid="input-campus-name" />
                  <button type="button" onClick={handleAddCampus} disabled={!addCampus.name} className="rounded-xl bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-50">Add</button>
                  <button type="button" onClick={() => setAddCampus(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </DataState>
    </div>
  );
}

// ── Providers tab ─────────────────────────────────────────────────────────────
function ProvidersTab() {
  const { data, loading, error, refetch } = useFetchOnMount<AdminProvider[]>("/v1/admin/providers");
  const [search, setSearch] = useState("");
  const [flagFilter, setFlagFilter] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);

  const filtered = (data ?? []).filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.categoryName.toLowerCase().includes(q);
    const matchFlag = !flagFilter || p.hasOpenFlag;
    return matchSearch && matchFlag;
  });

  async function handleAction(id: number, action: "approve" | "suspend") {
    setSaving(id);
    try { await apiFetch(`/v1/admin/providers/${id}`, { method: "PATCH", body: JSON.stringify({ action }) }); void refetch(); }
    catch { /* swallow */ }
    finally { setSaving(null); }
  }

  async function resolveFlag(flagId: number) {
    await apiFetch(`/v1/admin/quality-flags/${flagId}`, { method: "PATCH", body: JSON.stringify({ status: "resolved" }) });
    void refetch();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 rounded-full border border-border/80 bg-background/60 px-4 py-2.5 text-sm focus-within:ring-2 focus-within:ring-primary transition-all">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search providers…" className="bg-transparent outline-none w-40 placeholder:text-muted-foreground" data-testid="input-search-providers" />
        </label>
        <button type="button" onClick={() => setFlagFilter(v => !v)} className={cn("rounded-full px-4 py-2.5 text-sm font-medium transition-all border", flagFilter ? "bg-red-500/20 border-red-500/30 text-red-400" : "border-border/60 text-muted-foreground hover:bg-accent/30")} data-testid="button-flagged-filter">
          <ShieldAlert className="inline h-3.5 w-3.5 mr-1.5" />Flagged only
        </button>
      </div>

      <DataState loading={loading} error={error} onRetry={() => void refetch()}>
        <div className="overflow-x-auto rounded-2xl border border-border/50 bg-background/30">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-accent/20 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {["Provider", "Category", "Rating", "Jobs", "Status", "Quality", "Actions"].map(h => <th key={h} className="px-5 py-4 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map((p, i) => (
                <tr key={p.id} className={cn("transition-colors hover:bg-accent/30", i % 2 ? "bg-accent/10" : "")} data-testid={`row-provider-${p.id}`}>
                  <td className="px-5 py-4">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">{p.tagline}</p>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{p.categoryName}</td>
                  <td className="px-5 py-4">
                    <span className={cn("flex items-center gap-1 font-medium", p.rating < 4.0 ? "text-red-400" : "text-white")}>
                      <Star className="h-3.5 w-3.5 fill-current" />{p.rating.toFixed(1)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{p.reviewCount} reviews</span>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{p.jobsCompleted}</td>
                  <td className="px-5 py-4">
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", p.verified ? "bg-primary/10 text-primary" : "bg-amber-400/10 text-amber-400")}>
                      {p.verified ? <BadgeCheck className="h-3.5 w-3.5" /> : null}
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {p.hasOpenFlag ? (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-[11px] font-medium text-red-400">
                          <ShieldAlert className="h-3 w-3" /> {p.openFlagCount} flag{p.openFlagCount !== 1 ? "s" : ""}
                        </span>
                        {p.reducedRouting && <span className="block text-[11px] text-amber-400">Reduced routing</span>}
                        {p.qualityFlags.map(f => (
                          <button key={f.id} type="button" onClick={() => resolveFlag(f.id)} className="block text-[11px] text-muted-foreground hover:text-primary transition-colors">
                            Clear: {f.flagType.replace(/_/g, " ")} →
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[12px] text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-primary" />Clean</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      {!p.verified && <button type="button" disabled={saving === p.id} onClick={() => handleAction(p.id, "approve")} className="text-xs rounded-full border border-primary/40 text-primary px-3 py-1.5 hover:bg-primary/10 transition-colors" data-testid={`button-approve-${p.id}`}>Approve</button>}
                      {p.verified && <button type="button" disabled={saving === p.id} onClick={() => handleAction(p.id, "suspend")} className="text-xs rounded-full border border-border/50 text-muted-foreground px-3 py-1.5 hover:bg-accent/30 transition-colors" data-testid={`button-suspend-${p.id}`}>Suspend</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && <div className="p-12 text-center text-muted-foreground text-sm">No providers match your filters.</div>}
        </div>
      </DataState>
    </div>
  );
}

// ── Catalog tab ───────────────────────────────────────────────────────────────
type CatalogSubTab = "categories" | "services";

function CatalogTab() {
  const [sub, setSub] = useState<CatalogSubTab>("categories");
  const cats = useFetchOnMount<AdminCategory[]>("/v1/admin/categories");
  const svcs = useFetchOnMount<AdminService[]>("/v1/admin/services");

  const [showAddCat, setShowAddCat] = useState(false);
  const [showAddSvc, setShowAddSvc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", tagline: "", icon: "Sparkles", startingPrice: 0 });
  const [svcForm, setSvcForm] = useState({ providerId: "", name: "", description: "", price: "", durationMinutes: "60" });

  // Inline edit state for categories and services
  const [editCatId, setEditCatId] = useState<number | null>(null);
  const [editCat, setEditCat] = useState({ name: "", tagline: "", startingPrice: 0 });
  const [editSvcId, setEditSvcId] = useState<number | null>(null);
  const [editSvc, setEditSvc] = useState({ name: "", description: "", price: "", durationMinutes: "" });

  async function saveCatEdit(id: number) {
    setSaving(true);
    try {
      await apiFetch(`/v1/admin/categories/${id}`, { method: "PATCH", body: JSON.stringify({ ...editCat, startingPrice: Number(editCat.startingPrice) }) });
      void cats.refetch();
      setEditCatId(null);
    } catch { /* swallow */ }
    finally { setSaving(false); }
  }

  async function saveSvcEdit(id: number) {
    setSaving(true);
    try {
      await apiFetch(`/v1/admin/services/${id}`, { method: "PATCH", body: JSON.stringify({ name: editSvc.name, description: editSvc.description, price: Number(editSvc.price), durationMinutes: Number(editSvc.durationMinutes) }) });
      void svcs.refetch();
      setEditSvcId(null);
    } catch { /* swallow */ }
    finally { setSaving(false); }
  }

  async function createCategory() {
    setSaving(true);
    try { await apiFetch("/v1/admin/categories", { method: "POST", body: JSON.stringify({ ...catForm, startingPrice: Number(catForm.startingPrice) }) }); void cats.refetch(); setShowAddCat(false); setCatForm({ name: "", tagline: "", icon: "Sparkles", startingPrice: 0 }); }
    catch { /* swallow */ } finally { setSaving(false); }
  }

  async function createService() {
    setSaving(true);
    try { await apiFetch("/v1/admin/services", { method: "POST", body: JSON.stringify({ ...svcForm, providerId: Number(svcForm.providerId), price: Number(svcForm.price), durationMinutes: Number(svcForm.durationMinutes) }) }); void svcs.refetch(); setShowAddSvc(false); }
    catch { /* swallow */ } finally { setSaving(false); }
  }

  // unique providers from services for dropdown
  const providerOptions = [...new Map((svcs.data ?? []).map(s => [s.providerId, s.providerName])).entries()];

  return (
    <div className="space-y-6">
      <div className="flex gap-1 rounded-xl bg-white/5 p-1 w-fit">
        {(["categories", "services"] as CatalogSubTab[]).map(t => (
          <button key={t} type="button" onClick={() => setSub(t)} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all", sub === t ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground")} data-testid={`subtab-catalog-${t}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {sub === "categories" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button type="button" onClick={() => setShowAddCat(v => !v)} className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:-translate-y-0.5 transition-all" data-testid="button-add-category"><Plus className="h-4 w-4" />Add category</button>
          </div>
          {showAddCat && (
            <div className="glass-card rounded-2xl p-5 border border-primary/20 platform-reveal">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
                <div><label className="label-xs">Name</label><input value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} className="input-std mt-1" placeholder="Wellness" data-testid="input-category-name" /></div>
                <div><label className="label-xs">Tagline</label><input value={catForm.tagline} onChange={e => setCatForm(p => ({ ...p, tagline: e.target.value }))} className="input-std mt-1" /></div>
                <div><label className="label-xs">Icon</label><input value={catForm.icon} onChange={e => setCatForm(p => ({ ...p, icon: e.target.value }))} className="input-std mt-1" /></div>
                <div><label className="label-xs">Starting price (AED)</label><input type="number" value={catForm.startingPrice} onChange={e => setCatForm(p => ({ ...p, startingPrice: Number(e.target.value) }))} className="input-std mt-1" /></div>
              </div>
              <div className="flex gap-3">
                <button type="button" disabled={!catForm.name || saving} onClick={createCategory} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50" data-testid="button-submit-category">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}</button>
                <button type="button" onClick={() => setShowAddCat(false)} className="text-sm text-muted-foreground"><X className="h-4 w-4" /></button>
              </div>
            </div>
          )}
          <DataState loading={cats.loading} error={cats.error} onRetry={() => void cats.refetch()}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cats.data?.map(cat => (
                <div key={cat.id} className="glass-card rounded-2xl p-5 platform-reveal" data-testid={`row-category-${cat.id}`}>
                  {editCatId === cat.id ? (
                    <div className="space-y-3">
                      <div><label className="label-xs">Name</label><input value={editCat.name} onChange={e => setEditCat(p => ({ ...p, name: e.target.value }))} className="input-std mt-1 text-sm" autoFocus data-testid={`input-edit-category-${cat.id}`} /></div>
                      <div><label className="label-xs">Tagline</label><input value={editCat.tagline} onChange={e => setEditCat(p => ({ ...p, tagline: e.target.value }))} className="input-std mt-1 text-sm" /></div>
                      <div><label className="label-xs">Starting price (AED)</label><input type="number" value={editCat.startingPrice} onChange={e => setEditCat(p => ({ ...p, startingPrice: Number(e.target.value) }))} className="input-std mt-1 text-sm" /></div>
                      <div className="flex gap-2 pt-1">
                        <button type="button" disabled={saving || !editCat.name} onClick={() => saveCatEdit(cat.id)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50" data-testid={`button-save-category-${cat.id}`}>{saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}</button>
                        <button type="button" onClick={() => setEditCatId(null)} className="text-xs text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-[15px]">{cat.name}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">{cat.tagline}</p>
                        </div>
                        <button type="button" onClick={() => { setEditCatId(cat.id); setEditCat({ name: cat.name, tagline: cat.tagline, startingPrice: cat.startingPrice }); }} className="text-xs text-muted-foreground hover:text-foreground border border-border/50 rounded-full px-2.5 py-1 shrink-0 ml-2" data-testid={`button-edit-category-${cat.id}`}>Edit</button>
                      </div>
                      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                        <span>{cat.providerCount} providers</span>
                        <span>{cat.serviceCount} services</span>
                        <span>from AED {cat.startingPrice}</span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </DataState>
        </div>
      )}

      {sub === "services" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button type="button" onClick={() => setShowAddSvc(v => !v)} className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:-translate-y-0.5 transition-all" data-testid="button-add-service"><Plus className="h-4 w-4" />Add service</button>
          </div>
          {showAddSvc && (
            <div className="glass-card rounded-2xl p-5 border border-primary/20 platform-reveal">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-4">
                <div>
                  <label className="label-xs">Provider</label>
                  <select value={svcForm.providerId} onChange={e => setSvcForm(p => ({ ...p, providerId: e.target.value }))} className="input-std mt-1" data-testid="select-service-provider">
                    <option value="">Select…</option>
                    {providerOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                  </select>
                </div>
                <div><label className="label-xs">Name</label><input value={svcForm.name} onChange={e => setSvcForm(p => ({ ...p, name: e.target.value }))} className="input-std mt-1" placeholder="60-min deep tissue" data-testid="input-service-name" /></div>
                <div><label className="label-xs">Description</label><input value={svcForm.description} onChange={e => setSvcForm(p => ({ ...p, description: e.target.value }))} className="input-std mt-1" /></div>
                <div><label className="label-xs">Price (AED)</label><input type="number" value={svcForm.price} onChange={e => setSvcForm(p => ({ ...p, price: e.target.value }))} className="input-std mt-1" /></div>
                <div><label className="label-xs">Duration (min)</label><input type="number" value={svcForm.durationMinutes} onChange={e => setSvcForm(p => ({ ...p, durationMinutes: e.target.value }))} className="input-std mt-1" /></div>
              </div>
              <div className="flex gap-3">
                <button type="button" disabled={!svcForm.providerId || !svcForm.name || !svcForm.price || saving} onClick={createService} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50" data-testid="button-submit-service">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}</button>
                <button type="button" onClick={() => setShowAddSvc(false)} className="text-sm text-muted-foreground"><X className="h-4 w-4" /></button>
              </div>
            </div>
          )}
          <DataState loading={svcs.loading} error={svcs.error} onRetry={() => void svcs.refetch()}>
            <div className="overflow-x-auto rounded-2xl border border-border/50 bg-background/30">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead><tr className="border-b border-border/60 bg-accent/20 text-xs uppercase tracking-[0.12em] text-muted-foreground">{["Service", "Provider", "Category", "Price", "Duration"].map(h => <th key={h} className="px-5 py-4 font-medium">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-border/40">
                  {svcs.data?.map((s, i) => (
                    <tr key={s.id} className={cn("hover:bg-accent/30", i % 2 ? "bg-accent/10" : "")} data-testid={`row-service-${s.id}`}>
                      {editSvcId === s.id ? (
                        <>
                          <td className="px-5 py-3" colSpan={4}>
                            <div className="flex flex-wrap gap-2">
                              <input value={editSvc.name} onChange={e => setEditSvc(p => ({ ...p, name: e.target.value }))} className="input-std text-sm w-40" placeholder="Name" autoFocus data-testid={`input-edit-service-${s.id}`} />
                              <input value={editSvc.description} onChange={e => setEditSvc(p => ({ ...p, description: e.target.value }))} className="input-std text-sm w-48" placeholder="Description" />
                              <input type="number" value={editSvc.price} onChange={e => setEditSvc(p => ({ ...p, price: e.target.value }))} className="input-std text-sm w-24" placeholder="Price" />
                              <input type="number" value={editSvc.durationMinutes} onChange={e => setEditSvc(p => ({ ...p, durationMinutes: e.target.value }))} className="input-std text-sm w-20" placeholder="Dur min" />
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex gap-2">
                              <button type="button" disabled={saving || !editSvc.name} onClick={() => saveSvcEdit(s.id)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50" data-testid={`button-save-service-${s.id}`}>{saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}</button>
                              <button type="button" onClick={() => setEditSvcId(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-5 py-3"><p className="font-medium">{s.name}</p><p className="text-[12px] text-muted-foreground">{s.description}</p></td>
                          <td className="px-5 py-3 text-muted-foreground">{s.providerName}</td>
                          <td className="px-5 py-3 text-muted-foreground">{s.categoryName}</td>
                          <td className="px-5 py-3 font-medium">AED {s.price}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">{s.durationMinutes}m</span>
                              <button type="button" onClick={() => { setEditSvcId(s.id); setEditSvc({ name: s.name, description: s.description, price: String(s.price), durationMinutes: String(s.durationMinutes) }); }} className="ml-3 text-xs text-muted-foreground hover:text-foreground border border-border/50 rounded-full px-2.5 py-1" data-testid={`button-edit-service-${s.id}`}>Edit</button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataState>
        </div>
      )}
    </div>
  );
}

// ── Bookings tab ──────────────────────────────────────────────────────────────
const STATUS_COLOURS: Record<string, string> = {
  pending:    "bg-amber-400/10 text-amber-400",
  confirmed:  "bg-primary/10 text-primary",
  completed:  "bg-emerald-400/10 text-emerald-400",
  cancelled:  "bg-muted text-muted-foreground",
  no_show:    "bg-red-500/10 text-red-400",
};

function BookingsTab() {
  const { data, loading, error, refetch } = useFetchOnMount<AdminBooking[]>("/v1/admin/bookings");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [updating, setUpdating] = useState<number | null>(null);

  const filtered = (data ?? []).filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${b.memberName} ${b.providerName} ${b.serviceName}`.toLowerCase().includes(q);
    const matchStatus = !statusFilter || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  async function updateStatus(id: number, status: string) {
    setUpdating(id);
    try { await apiFetch(`/v1/admin/bookings/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }); void refetch(); }
    catch { /* swallow */ } finally { setUpdating(null); }
  }

  const statuses = ["pending", "confirmed", "completed", "cancelled", "no_show"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 rounded-full border border-border/80 bg-background/60 px-4 py-2.5 text-sm focus-within:ring-2 focus-within:ring-primary transition-all">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bookings…" className="bg-transparent outline-none w-40 placeholder:text-muted-foreground" data-testid="input-search-bookings" />
        </label>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-full border border-border/80 bg-background/60 px-4 py-2.5 text-sm outline-none" data-testid="select-status-filter">
          <option value="">All statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-sm text-muted-foreground">{filtered.length} booking{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <DataState loading={loading} error={error} onRetry={() => void refetch()}>
        <div className="overflow-x-auto rounded-2xl border border-border/50 bg-background/30">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead><tr className="border-b border-border/60 bg-accent/20 text-xs uppercase tracking-[0.12em] text-muted-foreground">{["Member", "Provider", "Service", "Scheduled", "Status", "Amount", "Action"].map(h => <th key={h} className="px-5 py-4 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map((b, i) => (
                <tr key={b.id} className={cn("hover:bg-accent/30", i % 2 ? "bg-accent/10" : "")} data-testid={`row-booking-${b.id}`}>
                  <td className="px-5 py-3 font-medium">{b.memberName}</td>
                  <td className="px-5 py-3 text-muted-foreground">{b.providerName}</td>
                  <td className="px-5 py-3 text-muted-foreground">{b.serviceName}</td>
                  <td className="px-5 py-3 text-muted-foreground">{new Date(b.scheduledAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="px-5 py-3"><span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_COLOURS[b.status] ?? "bg-muted text-muted-foreground")}>{b.status}</span></td>
                  <td className="px-5 py-3 font-medium">AED {b.priceEstimate}</td>
                  <td className="px-5 py-3">
                    {["pending", "confirmed"].includes(b.status) && (
                      <div className="flex gap-2">
                        {b.status === "pending" && <button type="button" disabled={updating === b.id} onClick={() => updateStatus(b.id, "confirmed")} className="text-xs rounded-full border border-primary/40 text-primary px-3 py-1.5 hover:bg-primary/10 transition-colors">Confirm</button>}
                        <button type="button" disabled={updating === b.id} onClick={() => updateStatus(b.id, "cancelled")} className="text-xs rounded-full border border-border/50 text-muted-foreground px-3 py-1.5 hover:bg-accent/30 transition-colors">Cancel</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && <div className="p-12 text-center text-muted-foreground text-sm">No bookings match your filters.</div>}
        </div>
      </DataState>
    </div>
  );
}

// ── Ledger tab ────────────────────────────────────────────────────────────────
const ENTRY_COLOURS: Record<string, string> = {
  authorized: "bg-primary/10 text-primary",
  reserved:   "bg-[hsl(var(--platform-brass))/0.15] text-[hsl(var(--platform-brass))]",
  redeemed:   "bg-emerald-400/10 text-emerald-400",
  released:   "bg-muted text-muted-foreground",
  expired:    "bg-red-500/10 text-red-400",
};

function LedgerTab() {
  const { data, loading, error, refetch } = useFetchOnMount<LedgerEntry[]>("/v1/admin/ledger");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [refunding, setRefunding] = useState<number | null>(null);

  const filtered = (data ?? []).filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.employeeName.toLowerCase().includes(q) || (l.note ?? "").toLowerCase().includes(q);
    const matchType = !typeFilter || l.entryType === typeFilter;
    return matchSearch && matchType;
  });

  const totals = (data ?? []).reduce((acc, l) => { acc[l.entryType] = (acc[l.entryType] ?? 0) + l.amount; return acc; }, {} as Record<string, number>);

  async function handleRefund(id: number) {
    setRefunding(id);
    try { await apiFetch(`/v1/admin/ledger/${id}/refund`, { method: "POST" }); void refetch(); }
    catch { /* swallow */ } finally { setRefunding(null); }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        {[["Authorized", totals.authorized ?? 0, "text-primary"], ["Reserved", totals.reserved ?? 0, "text-[hsl(var(--platform-brass))]"], ["Redeemed", totals.redeemed ?? 0, "text-emerald-400"], ["Released", totals.released ?? 0, "text-muted-foreground"]].map(([label, val, cls]) => (
          <div key={label as string} className="glass-card rounded-2xl p-5 platform-reveal">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
            <p className={cn("font-serif text-2xl font-semibold", cls as string)}>AED {((val as number) || 0).toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 rounded-full border border-border/80 bg-background/60 px-4 py-2.5 text-sm focus-within:ring-2 focus-within:ring-primary transition-all">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search entries…" className="bg-transparent outline-none w-40 placeholder:text-muted-foreground" data-testid="input-search-ledger" />
        </label>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="rounded-full border border-border/80 bg-background/60 px-4 py-2.5 text-sm outline-none">
          <option value="">All types</option>
          {["authorized", "reserved", "redeemed", "released", "expired"].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="text-sm text-muted-foreground">{filtered.length} entries</span>
      </div>

      <DataState loading={loading} error={error} onRetry={() => void refetch()}>
        <div className="overflow-x-auto rounded-2xl border border-border/50 bg-background/30">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead><tr className="border-b border-border/60 bg-accent/20 text-xs uppercase tracking-[0.12em] text-muted-foreground">{["Employee", "Type", "Amount", "Reference", "Note", "Date", "Action"].map(h => <th key={h} className="px-5 py-4 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map((l, i) => (
                <tr key={l.id} className={cn("hover:bg-accent/30", i % 2 ? "bg-accent/10" : "")} data-testid={`row-ledger-${l.id}`}>
                  <td className="px-5 py-3 font-medium">{l.employeeName}</td>
                  <td className="px-5 py-3"><span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", ENTRY_COLOURS[l.entryType] ?? "bg-muted text-muted-foreground")}>{l.entryType}</span></td>
                  <td className="px-5 py-3 font-semibold tabular-nums">AED {l.amount}</td>
                  <td className="px-5 py-3 text-muted-foreground">{l.referenceType ? `${l.referenceType} #${l.referenceId}` : "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground max-w-[200px] truncate">{l.note ?? "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{new Date(l.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td className="px-5 py-3">
                    {l.entryType === "redeemed" && (
                      <button type="button" disabled={refunding === l.id} onClick={() => handleRefund(l.id)} className="text-xs rounded-full border border-border/50 text-muted-foreground px-3 py-1.5 hover:bg-accent/30 transition-colors" data-testid={`button-refund-${l.id}`}>
                        {refunding === l.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Refund"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && <div className="p-12 text-center text-muted-foreground text-sm">No ledger entries match your filters.</div>}
        </div>
      </DataState>
    </div>
  );
}

// ── Root page ─────────────────────────────────────────────────────────────────
export default function Operations() {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <PlatformShell role="admin">
      <PlatformHeader
        kicker="Internal operations"
        title="Loup control tower"
        description="Real-time platform health, institution governance, provider quality, and allowance ledger review — all in one place."
      />
      <div className="mb-8 flex flex-wrap gap-1 rounded-2xl bg-white/5 p-1.5 w-fit platform-reveal">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              data-testid={`tab-admin-${t.id}`}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                tab === t.id ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview"     && <OverviewTab />}
      {tab === "institutions" && <InstitutionsTab />}
      {tab === "providers"    && <ProvidersTab />}
      {tab === "catalog"      && <CatalogTab />}
      {tab === "bookings"     && <BookingsTab />}
      {tab === "ledger"       && <LedgerTab />}
    </PlatformShell>
  );
}
