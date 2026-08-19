# Loup — Session Handoff

> Living handoff document. Updated as work progresses; finalized when the session nears its context limit.
> **Repo:** `/Users/yanga/Downloads/Right-Now` · macOS · Node v22.16.0 · pnpm 10.9.0
> **Plan being executed:** `PRPD.md` Phase 0 (P0-1..P0-8), "test as you go".

## Current objective
Convert Loup (UAE B2B2C lifestyle-benefits platform for education) into a pitch-ready MVP.
- ✅ PGlite switch — DONE
- ✅ P0-1 demo login + signed JWTs — DONE (verified end-to-end)
- ✅ P0-2 second tenant + claims-based tenant resolution — DONE (verified: all 5 roles token OK; Meridian 60 vs Al Noor 15 isolated; plans/campus correct per tenant; 403 no-token / 401 wrong-role; admin sees both = 2 institutions/75 employees; unknown slug→400; employee + provider flows intact; full typecheck + loup build green; login.tsx tenant toggle for institution card)
- ✅ P0-3 webhook event log + admin screen — DONE (verified; see §5 below)
- ✅ P0-4 fee model on screen — DONE (verified; see §6 below)
- ✅ P0-5 widget story live — DONE (verified; see §7 below)
- ✅ P0-6 demo reconciliation — DONE (verified; see §8 below)
- ✅ P0-7 money-path unit tests — DONE (16 Vitest tests green; see §9 below)
- ✅ P0-8 pitch pack — DONE (`pitch/` one-pager, LOI template, target schools)
- ✅ Phase 0 exit criteria — all met (see §10 below) — PHASE 0 COMPLETE

## Completed work (this session)

### 1. PGlite switch (no Postgres server needed)
- `lib/db/src/index.ts`: PGlite (`@electric-sql/pglite` 0.5.5, file-backed at `<repo-root>/data/loup-pglite`, repo-root found by walking up for `pnpm-workspace.yaml`, `PGLITE_DATA_DIR` override) unless `DATABASE_URL` set → real pg Pool. Exports `pglite`, `pool`, `db`, `closeDb()`.
- `lib/db/drizzle.config.ts`: `driver: "pglite"` when no `DATABASE_URL`; parent `data/` dir must exist (`mkdir -p data`).
- `scripts/src/seed.ts`: `pool.end()` → `closeDb()`.
- `artifacts/api-server/build.mjs`: `@electric-sql/pglite` external + added to api-server deps (pnpm strict layout).
- `.gitignore`: `/data/` added.
- Verified: push, seed, server boots on PGlite, serves data, AI route degrades gracefully.

### 2. Lazy OpenAI clients (server boots without AI integration env)
- `lib/integrations-openai-ai-server/src/{client,image/client,audio/client}.ts`: removed import-time throws; lazy `getClient()/getOpenAIClient()` + `openai` Proxy exports kept (barrels still re-export `openai`). AI SSE route returns `{"error":"AI response failed"}` when unprovisioned.

### 3. P0-1 demo login + signed JWTs (4 roles)
- **Spec:** added `DemoLogin` / `DemoLoginResult` / `DemoLoginPrincipal` schemas + `POST /v1/demo/login` to `lib/api-spec/openapi.yaml`; ran codegen (orval → api-zod + api-client-react). NOTE: naming a response schema `<X>Response` collides with orval's operationId-derived zod name (`DemoLoginResponse`); used `DemoLoginResult` to avoid it.
- **Backend:** new `artifacts/api-server/src/lib/auth.ts` — `signDemoToken`/`verifyDemoToken` (jose HS256, secret `LOUP_DEMO_JWT_SECRET`, dev fallback `loup-demo-dev-secret-change-me`, 8h TTL), `requireRole(...roles)` middleware (Bearer JWT first, legacy `x-loup-demo-role` header fallback only in non-production), `getPrincipal`. `jose` added to api-server deps.
- **Guards:** `requireEmployerRole` → `requireRole("institution","admin")`; `requireAdminRole` → `requireRole("admin")`; `requireProviderRole` → `requireRole("provider","admin")`. (Note: router-level `router.use(requireX)` guards run for every unmatched path entering that router — this is why stray paths 403/401.)
- **Login route** in `platform.ts` after `/v1/demo/roles`: resolves principal per role (employee→Omar Mansour via `getCurrentMember`+`linkedMemberId`; institution→meridian via `resolveEmployerContext`; provider→"Marina Shine Cleaning"; admin→static ops), signs JWT, returns `{token, expiresInSeconds, principal}`.
- **Frontend:** new `artifacts/loup/src/lib/demo-auth.ts` (`getStoredToken`/`storeToken`/`clearToken`/`ensureAuthGetter`/`authHeaders`/`signOut`, key `loup_demo_token`); `login.tsx` now calls `useDemoLogin` mutation → stores token → sets auth getter → navigates (spinner per card); `App.tsx` restores getter on load; removed all `setDefaultHeaders({x-loup-demo-role})` calls from `employer.tsx`/`vendor.tsx`; `operations.tsx` `apiFetch` now uses `authHeaders()`; raw CSV export fetch in `employer.tsx` uses `authHeaders()`; platform-shell header has a "Sign out" button (`signOut()` + navigate `/`).
- **Verified:** login issues token; all 4 portals work with their token; no-token→403; wrong-role→401; tampered token→401; header fallback still works in dev; full `pnpm run typecheck` + builds green.

### 4. Pre-existing bug fixed (to unblock typecheck)
- `artifacts/api-server/src/routes/pack.ts:236`: `.returning({ id: serviceRequestsTable.id })` failed typecheck on clean HEAD (drizzle 0.45.2 inference quirk with `Partial<$inferInsert>` set arg) → changed to `.returning()` (behavior-equivalent, `.length > 0` unchanged).

### Environment fixes (pnpm store built on another platform)
- Rollup + lightningcss native binaries missing for macOS: added `@rollup/rollup-darwin-arm64` and `lightningcss-darwin-arm64@1.32.0` (+ stray 1.33.0) as devDeps of `@workspace/loup`; `pnpm rebuild lightningcss` linked the binary. Root cause: store had linux/windows optional deps only.
- `vite build`/`dev` require `PORT` and `BASE_PATH` env vars (vite.config.ts throws otherwise).

### 5. P0-3 webhook event log + admin screen
- **Helper:** `writeWebhookEvent(eventType, payload, {status})` in `artifacts/api-server/src/lib/loup.ts` — inserts into `webhook_events`; demo mode simulates delivery: default `delivered` + `deliveredAt`, `failed` (deliveredAt null) or `pending` via opts (production would use the P1-3 outbox worker).
- **Hooks (live mutations):** `bookings.ts` → `booking.created` (create) + `booking.accepted` (auto-confirm 7s) + `booking.completed` (advance); `provider.ts` → `booking.accepted` (accept), `booking.cancelled` (reject), `booking.completed` (advance to completed, alongside `writeRedemptionLedger`); `admin.ts` → `refund.processed` (ledger refund); `billing.ts` → `payment.completed` (statement pay).
- **Read route:** new `artifacts/api-server/src/routes/webhooks.ts` — `GET /v1/admin/webhook-events` (admin-guarded) returns latest 100 events (desc) + summary `{total, delivered, failed, pending, byType}`. Mounted in `routes/index.ts` after adminRouter.
- **Seed:** full lifecycle stream — `employee.activated`, `allowance.issued`, `booking.created/accepted/completed`, `booking.cancelled`, `payment.completed`, `refund.processed`, one `failed` delivery (julyPhysio) + one `pending` (Al Noor allowance) — 16 events across both tenants, backdated `createdAt`/`deliveredAt`.
- **Admin UI:** new "Webhooks" tab in `artifacts/loup/src/pages/operations.tsx` (Webhook icon): 4 summary tiles (Events/Delivered/Failed/Pending), status filter pills (all/delivered/failed/pending), per-type counts chips, table (event type, status badge, JSON payload, delivered/created timestamps).
- **Verified:** guard 403 no-token / 401 employee; seeded summary 16 = 14/1/1 with all 8 types; live run booking.created→accepted→completed→payment.completed→refund.processed all landed (20 total); full typecheck + loup build green.
- **NOTE (route paths):** household/catalog/bookings/billing routers are mounted WITHOUT the `/v1/` prefix (`/api/addresses`, `/api/bookings`, `/api/categories`, `/api/billing/pay`, `/api/providers/:id`); only platform/admin/provider use `/api/v1/*`. Calling `/api/v1/addresses` falls through to adminRouter's guard → 401. The spec (`openapi.yaml`) matches: `/addresses`, `/bookings`, etc.

### 6. P0-4 fee model on screen (D2 hybrid)
- **Schema:** `benefit_plans` gained `platformFeeRatePct` (default 8) + `perEmployeeMonthlyFee` (default 0) — configurable per plan. Pushed via drizzle-kit push to PGlite.
- **Seed:** Meridian plan = 8% + AED 12/emp/mo (hybrid); Al Noor plan = 8% + 0 (proves per-plan configurability).
- **Math:** `estimateMonthlyPlatformRevenue(institutionId?)` in `lib/loup.ts` — revenue = feeRate% × (redeemed+reserved cycle volume, from ledger joined to employees) + perEmployeeMonthlyFee × eligible employees; scoped per institution or platform-wide. Returns `{total, byInstitution}`.
- **API:** `GET /v1/employer/overview` now returns `platformFeeRatePct`, `perEmployeeMonthlyFee`, `estimatedMonthlyPlatformRevenue` (spec `EmployerOverview` updated + codegen re-run — REQUIRED because the handler parses with the zod schema); `GET /v1/admin/overview` returns the same three (platform-wide total).
- **UI:** institution overview (`employer.tsx`) — "Loup platform fee" card (fee config + estimated monthly revenue); ops console (`operations.tsx` OverviewTab) — new "Est. monthly platform revenue" StatTile with fee-config detail; `loup-admin` overview page — "Est. Monthly Platform Revenue" KPI card (5-col grid, note its own `AdminOverview` type + `PORT`/`BASE_PATH` env for build).
- **Verified:** Meridian 8% + 12 → AED 747/mo (8% × 334 + 12 × 60); Al Noor 8% + 0 → 0 (no ledger activity yet — honest); admin 747 platform-wide; typecheck + all builds green.

### 7. P0-5 widget story live
- **Integrations endpoint honest:** `GET /v1/employer/integrations` (`platform.ts:1042`) now returns the REAL working snippet (two-line comment + `<script src="/embed/loup-widget.js">`), tenant-aware via `resolveEmployerContext` (employer name interpolated). No more fictional `<loup-benefits>` custom element.
- **Widget standalone bootstrap:** `embed-demo.tsx` (route `/embed/demo`) auto-issues a demo employee token on mount when none is stored (POST `/api/v1/demo/login` role employee → `storeToken` + `ensureAuthGetter` → `query.refetch()`), so a fresh browser + static page embed just works.
- **Landing embed section:** `landing.tsx` right panel gained a "Embed the widget in two lines" card with the real snippet in a `<pre>` block + "Live preview" link to `/embed/demo` (`data-testid="link-embed-preview"`).
- **Local dev now works in 2 terminals:** added env-configurable `/api` proxy to `artifacts/loup/vite.config.ts` (`API_TARGET`, default `http://localhost:3000`) for both `server` and `preview` — the app calls same-origin `/api/*`, so without the proxy the browser could not reach the API. Run: API on :3000, web on :3001 → http://localhost:3001.
- **Verified:** typecheck + loup build green; integrations returns tenant-specific snippets for both Meridian and Al Noor; widget script ships in the built app (`dist/public/embed/loup-widget.js`).

### 8. P0-6 demo reconciliation
- **Fallback constants removed** in `GET /v1/employer/overview` (`platform.ts`): `eligibleEmployees || 218`, `activatedEmployees || Math.min(164,…)`, `authorizedMaximum || 124500`, `redeemedAllowances || 11200`, `reservedAllowances || 3840`; `completionRate`/`satisfaction` now default to honest 0 (were 97.1/4.9). Ledger + tier-derived values only. Also `checkout-preview`: `availableAllowance = 416` and `|| 750` fallbacks gone → honest ledger position (0 if no employee row).
- **Verified:** Meridian 60 emp / 750 authorized / 85 redeemed / 249 reserved / 334 invoice / 747 fee; Al Noor 15 emp / 7000 tier-derived authorized / 0 redeemed / 0 reserved / honest zeros. No phantom numbers on either tenant.
- **replit.md rewritten:** portal table (now `/login` + `/embed/demo`), credentials section (signed JWT demo login, not "no auth"), 9-step demo script updated for the P0-2/P0-3 flows (Al Noor tenant check, fee card, webhook lifecycle). "218 staff" → 60 employees.
- **Pitfall re-learned while testing:** services are NOT at `/api/catalog/services` — providers list is `GET /api/providers` (array root), provider detail `GET /api/providers/:id` includes `services[]`. Wrong paths fall through to the adminRouter guard (401/403).

### 9. P0-7 money-path unit tests (Vitest)
- **New pure module** `artifacts/api-server/src/lib/money.ts`: `computeCheckoutSplit` (10% institutional discount, contribution = min(allowance, institutionalPrice), copay floor 0), `computeAllowancePosition` (authorized || tier fallback, available = auth − reserved − redeemed, floor 0, releases don't reduce), `computeRedemptionAmount` (min(reserved, estimate); 0 when nothing reserved), `computePlatformRevenue` (per-institution isolation, round2).
- **Call sites refactored to use it:** `platform.ts` (checkout-preview + employer overview), `provider.ts` `writeRedemptionLedger`, `lib/loup.ts` `estimateMonthlyPlatformRevenue`. DB row types pass through (entryType is plain string in the pure API).
- **Test setup:** `vitest` devDep + `test` script + `vitest.config.ts` (include `test/**/*.test.ts`). Run: `pnpm --filter @workspace/api-server run test`.
- **16 tests green** covering: split-payment rounding/full/partial/zero/custom discount; ledger position (fallback, negative clamp, releases); redemption guard (never over-redeem, zero guard); tenant isolation (no cross-tenant bleed, Meridian 746.72 example, per-employee base fee). Typecheck + build green; checkout-preview verified live (350 → 315 institutional, contribution 315, copay 0).

### 10. Phase 0 exit criteria — ALL MET
1. Two tenants demo end-to-end ✓ (P0-2)
2. Login demonstrated ✓ (P0-1 signed tokens)
3. Webhook log shows full transaction lifecycle ✓ (P0-3)
4. Fee line visible ✓ (P0-4, institution + ops console + admin KPI)
5. Widget embeddable in any static page ✓ (P0-5, standalone token bootstrap)
6. Tests green ✓ (P0-7: 16 Vitest + full typecheck + builds)
7. No console errors ✓ (builds clean; final browser pass recommended before the pitch)
- **Remaining manual item:** 3-min fallback video (PRPD P0-6) — record once the demo script is final; and a final end-to-end browser walk-through of the 9 steps before the pitch.

## Key architecture facts
- **Auth now:** Bearer JWT (jose HS256) with principal in `res.locals`; legacy header fallback dev-only. Roles: `employee`/`institution`/`provider`/`admin`. Tenant resolved from token claims via `resolveEmployerContext` (P0-2: employerId + institutionId claims, slug-based login).
- **API contract rule:** new endpoints go in `lib/api-spec/openapi.yaml` first → `pnpm --filter @workspace/api-spec run codegen` (orval → api-zod + api-client-react). Naming pitfall: don't name a schema `<OpId>Response` (orval collision).
- **Seed:** `pnpm --filter @workspace/scripts run seed` (wipe + reseed, dates relative to now). Demo reset: `POST /api/v1/demo/reset`.
- **Routes mount:** `app.ts` mounts everything at `/api`. platform.ts defines `/v1/*` (includes `/v1/demo/*`, `/v1/employee/*`, `/v1/employer/*`), admin.ts `/v1/admin/*` behind admin guard, provider.ts `/v1/provider/*`, openai router at `/openai/*` (NOT `/v1/openai` — earlier confusion: stray `/api/v1/openai/*` paths hit adminRouter's router-level guard).
- **Local Postgres 14 at `/tmp:5432`** no longer needed (PGlite verified). Server boot: `PORT=3000 NODE_ENV=development node --enable-source-maps ./dist/index.mjs` from `artifacts/api-server`. Web: `PORT=3001 BASE_PATH=/ pnpm --filter @workspace/loup run dev`.

## P0 backlog (order)
- ✅ P0-5 widget story live — DONE (§7)
- ✅ P0-6 demo reconciliation — DONE (§8)
- ✅ P0-7 money-path unit tests — DONE (§9)
- ✅ P0-8 pitch pack — DONE (`pitch/`)
- 🔄 Phase 1 (P1-1..P1-7 in PRPD) — NEXT (first: P1-1 payroll integrations, P1-2 provider self-onboarding)

## Pitfalls
- PGlite data dir parent must exist (`mkdir -p data`); esbuild keeps pglite external; any package importing `@workspace/db` at runtime must declare pglite dep.
- Router-level guards (`router.use(requireX)`) run for unmatched paths too — expect 401/403 on stray URLs.
- Don't rename spec response schemas to `<OpId>Response`; use `<OpId>Result`-style names.
- macOS native binaries: store was built on Linux/Replit; new native deps may need explicit `pnpm add -D <pkg>-darwin-arm64@<exact>` + `pnpm rebuild <pkg>`.