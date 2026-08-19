# PRPD — Loup Product Requirements & Product Development Plan

**Status:** Draft v1.0 · **Owner:** Product · **Date:** 2026-08-19 · **Next review:** after pitch (target week of 2026-08-26)
**Scope:** Next steps for Loup across (1) web app, (2) mobile app, (3) ERP/HRIS integration apps ("Shopify-style"), and (4) the API platform underneath all three.

> This document is deliberately exhaustive. It inventories what exists in the repo today (with file references), what is missing, the full requirements for each next step, decision records, and an explicit phased plan ending in a pilot. Nothing is hidden here; if a requirement is ambiguous or a decision is open, it is flagged as an **Open Question**.

---

## 1. Product Snapshot

### 1.1 What Loup is

Loup is a UAE-first B2B2C flexible lifestyle-benefits and service-orchestration platform. Its initial market is educational institutions in Dubai (schools, universities, colleges, nurseries, vocational and training institutions).

- Institutions configure **benefit plans** with **tiers** (e.g., Faculty AED 750/mo, Staff AED 500/mo, Admin AED 400/mo).
- Eligible **employees** receive a monthly **non-cash allowance** ("Loup Allowance", never framed as a withdrawable wallet).
- Employees spend the allowance on curated home/life services (7 categories, 22 seeded services) via discovery → booking → **split payment** (employer contribution + optional employee top-up).
- **Providers** fulfil orders through a provider portal (accept/reject, availability, analytics, quality flags).
- **Loup Operations** monitors everything (incidents, quality, audit, service-fit, revenue).
- **Institutions** see aggregate, privacy-safe utilization only (no employee PII leakage; small-group suppression).

**One-line pitch:** "Loup gives institutions controlled flexibility and gives employees benefits that adapt to their lives."

### 1.2 Relationship to "RightNow"

RightNow (see `attached_assets/RightNow_App_Development_Brief_v1.1_*.docx`) was the original B2C on-demand home-services marketplace: one ecosystem, one consolidated bill, multiple ways to pay. Loup is the evolved B2B2C model — the same booking/billing engine, but sold through employers/institutions who grant allowances. The repo has already been renamed; `employer`/`vendor`/`operations` routes are legacy aliases. The consumer-surface endpoints (`/bookings`, `/billing`, `/household`, `/pack`) remain in the API and still power the consumer flows; they should not be removed — they are the engine beneath the B2B2C story and are the future marketplace surface.

### 1.3 What exists in the repo today (inventory)

Monorepo (pnpm workspaces — `pnpm-workspace.yaml`):

| Path | What it is | State |
|---|---|---|
| `artifacts/api-server` | Express 5 + pino REST API, serves `/api/*` | Working demo API, ~5,200 LOC routes |
| `artifacts/loup` | React + Vite + wouter + TanStack Query + shadcn/ui web app (4 portals + consumer flows) | Working demo |
| `artifacts/loup-admin` | Separate Vite app (admin surface) | Present, thin |
| `artifacts/loup-mobile` | Expo 54 + expo-router app (tabs: book, booking, provider) | Skeleton only |
| `artifacts/mockup-sandbox` | Design preview harness | Present |
| `lib/db` | Drizzle + Postgres schema (11 schema files) | Working demo seed |
| `lib/api-spec` | OpenAPI 3.1 contract (`openapi.yaml`) + orval codegen | Working — this is the single source of truth |
| `lib/api-zod` | Zod request/response schemas (generated from spec) | Working |
| `lib/api-client-react` | Generated typed React Query client | Working |
| `lib/integrations-openai-ai-server` / `-react` / `openai_ai_integrations` | OpenAI chat, SSE streaming, audio/voice | Working demo (Benefit Advisor AI) |
| `scripts/src/seed.ts` | Re-runnable demo seed (wipes + reseeds, dates relative to now) | Working |

**API route inventory (`artifacts/api-server/src/routes/`):**

| File | Surface | Key endpoints |
|---|---|---|
| `health.ts` | ops | `GET /healthz` |
| `home.ts` | consumer | `GET /home/summary` |
| `catalog.ts` | consumer | categories, providers, reviews |
| `household.ts` | consumer | household, activity, addresses |
| `bookings.ts` | consumer | bookings CRUD, status advance, chat |
| `billing.ts` | consumer | statement, payment methods, pay, history |
| `pack.ts` | consumer | household thread, service requests (approve/decline) |
| `push.ts` | consumer | VAPID key, web-push subscriptions |
| `platform.ts` (1,487 LOC) | **core** | `/v1/employee/*`, `/v1/employer/*`, `/v1/vendor/*`, `/v1/provider/*`, `/v1/operations/*`, `/v1/admin/*` |
| `provider.ts` | core | provider dashboard, orders, availability, analytics |
| `admin.ts` | core | incidents, audit, quality flags, revenue |
| `openai/index.ts` | AI | conversations + SSE streaming chat |

**DB domains (`lib/db/src/schema/`):** `platform.ts` (employers legacy, employees, allowance_ledger, routines, audit_events), `education.ts` (education_groups, institutions, campuses, departments, benefit_plans, benefit_tiers, booking_status_history, support_incidents, support_incident_notes, provider_quality_flags, webhook_events), `household.ts`, `catalog.ts`, `bookings.ts`, `billing.ts`, `pack.ts`, `push.ts`, `conversations.ts`, `messages.ts`.

**Demo seed:** Meridian Education Group — 2 Dubai campuses, 3 benefit tiers, ~60 employees (institution portal displays "218 staff" — a known inconsistency, see Risks), 11 providers, 22 services, 7 categories, historical/upcoming/completed/cancelled/disputed bookings, ledger history, quality incidents, forecast data.

**Auth state (critical):** There is **no real authentication anywhere**. All role checks read a demo header (`x-loup-demo-role`) and return HTTP 403 in `NODE_ENV=production` with "requires authentication (production mode)" — see `platform.ts:50-61`, `admin.ts:27-33`, `provider.ts:33`. Tenant resolution is hardcoded to the `meridian` employer (`resolveEmployerContext`, `platform.ts:64-74`).

**Integration stubs that exist today (valuable, unfinished):**
- `GET /v1/employer/integrations` returns `ssoLabel`, `ssoUrl`, `widgetScript`, `widgetSnippet`, `apiMode` — including `<script src="/embed/loup-widget.js"></script><loup-benefits employer-id="meridian" employee-token="DEMO_SIGNED_TOKEN">` (`platform.ts:948`).
- `/embed/demo` page (`artifacts/loup/src/pages/embed-demo.tsx`) — simulated embeddable employee widget.
- `webhook_events` table exists in the DB (`education.ts:137`) with **zero dispatch/delivery code**.
- `allowance_ledger` has idempotency-key and entry-type fields; **idempotency is not enforced** anywhere.
- CSV employee import is implemented (`/v1/employer/employees` POST, `EmployeeImportInput.csv`).
- `/api-docs` page serves the OpenAPI spec in-app.

---

## 2. Current-State Gap Analysis (what we're missing)

Ranked by impact on the pitch (1 week out) and then on pilot readiness (4–12 weeks out).

### G1. No real authentication / authorization (CRITICAL for pilot; blocker for ERP)
- All four role surfaces gate on demo headers; production returns 403.
- No user table abstraction for login, no session, no JWT, no OIDC.
- Implication: cannot pilot a real institution, cannot ship any ERP integration, cannot claim RBAC.
- **Pitch-week requirement:** mock-but-plausible login (per-role demo accounts issuing signed tokens) so the demo shows "sign in as Faculty / HR Admin / Provider / Loup Ops".
- **Pilot requirement:** OIDC/OAuth 2.0 (recommend managed IdP, see Decision D1).

### G2. Single-tenant, hardcoded demo context (CRITICAL for B2B2C credibility)
- `resolveEmployerContext` and related helpers assume `slug = "meridian"`; employee lookup assumes `isCurrentUser` flag on a member row; institution id is derived from a single employer row.
- Cannot demo a second institution; cannot demo cross-tenant isolation (the very thing the brief promises).
- **Pitch-week requirement:** seed a second fictional institution (e.g., "Al Noor University") and make tenant resolution read from the session principal instead of constants.

### G3. Webhooks are a table, not a feature (HIGH for ERP story)
- `webhook_events` schema exists (employee activated / allowance issued / booking created / accepted / completed / cancelled / payment completed / refund processed are the brief's required events).
- No outbox writer, no delivery worker, no signing, no retries, no replay UI.
- **Pitch-week requirement:** write the events from key mutations + an admin "Webhook Events" screen showing the timeline; delivery engine can be simulated (mark as sent/delivered/failed in demo mode).
- **Pilot requirement:** real outbox → delivery worker → signed payloads (HMAC) → retries with backoff → replay UI → idempotent delivery.

### G4. No business model / fee logic (HIGH for investor pitch)
- Nothing in code models Loup revenue. `EmployerOverview.invoiceEstimate` and admin `revenueByCategory` exist but no fee/margin math.
- The brief's own language distinguishes "Authorized funds / Redeemed funds / Loup platform fees / Employee top-ups" — only the first two exist.
- **Pitch-week requirement:** fee-model display (see Decision D2 for options): a config-driven platform fee (e.g., % of employer contribution or per-employee/month) surfaced in institution + admin overviews, with the estimated monthly revenue line in the Loup ops console.
- **Pilot requirement:** fee config persisted per benefit plan; settlement math in provider/admin views (estimated settlement = revenue − platform fee).

### G5. No idempotency enforcement (MEDIUM for financial trust)
- Ledger and booking mutations are not idempotent; duplicate redemption is only prevented by "don't call twice" (brief §9 explicitly requires duplicate-redemption prevention).
- **Requirement:** `Idempotency-Key` header support on `POST /bookings`, `/billing/pay`, service-request approve, and all ledger-writing endpoints; store key on ledger rows (field exists).

### G6. Demo data inconsistencies (LOW but pitch-hazardous)
- `replit.md` says 60 employees; institution portal copy says 218 staff; allowance totals in employer overview have fallback constants (e.g., `authorizedMaximum || 124500`, `forecastRedemptions` hardcoded `0.8` factor, `platform.ts:517`).
- **Requirement:** reconcile every number displayed against ledger-derived values or remove fallbacks; single source of truth in seed.

### G7. No test suite (MEDIUM)
- Zero automated tests. Brief §20 lists required tests: allowance validation, split-payment calc, duplicate-redemption prevention, expiration rules, tenant isolation, role permissions, booking status transitions, cancellation reversal, CSV validation.
- **Requirement:** introduce a test runner (see Decision D4) and cover the six Flow-1..6 scenarios + the listed unit tests. This is also a pitch artifact if it's green ("we have tests on money paths").

### G8. AI advisor is not user-scoped (LOW for now)
- `openai/index.ts:15` — "In a real deployment this data would be fetched per-authenticated-user." Works as demo flair; wire to session principal after G1.

---

## 3. Target Architecture: One Engine, Three Surfaces

```
                     ┌──────────────────────────────────────────────┐
                     │              LOUp CLOUD (our engine)         │
                     │  api-server (Express) · Postgres · Webhooks  │
                     │  Ledger · Catalog · Bookings · Billing · AI  │
                     └───────▲───────────────▲───────────────▲──────┘
                             │               │               │
                     Web app │         Mobile apps │    ERP apps / widgets
              ┌──────────────┴───┐   ┌───────────┴───┐  ┌──────────┴─────────────┐
              │ loup (web portals)│   │ loup-mobile   │  │ Embedded admin app     │
              │ employee/institution│  │ (Expo:       │  │ (iframe/OAuth install) │
              │ provider/ops +     │   │  employee +  │  │ Intranet widget        │
              │ consumer flows     │   │  provider)   │  │ API + webhooks sync    │
              └────────────────────┘   └───────────────┘  └────────────────────────┘
```

- **One API, one contract.** All surfaces consume `lib/api-spec/openapi.yaml` via the generated typed client. Any new endpoint must be added to the spec first, then regenerated (`pnpm --filter @workspace/api-spec run codegen`). No surface may bypass the API.
- **Web app is the reference surface** and the pitch surface. Mobile is a thin client over the same API.
- **ERP apps are install-time integrations** (OAuth + webhooks + embedded UI), not separate databases or separate business logic.

---

## 4. ERP / HRIS Integration Strategy ("Shopify-style apps")

### 4.1 The pattern to copy

Shopify's app model, mapped to Loup:

| Shopify concept | Loup equivalent |
|---|---|
| OAuth install flow (install app → grant scopes → merchant approves) | Institution admin installs "Loup Benefits" in their HRIS/ERP admin: OIDC/OAuth consent, per-tenant client credentials |
| App store listing + scopes manifest | Connector listing per ERP (Oracle HCM, SAP SuccessFactors, Workday, iSAMS, Veracross, PowerSchool, Zoho People, Bayan) + a scopes/manifest doc (what data we read: employee roster; what we write: none — we only receive) |
| Embedded admin app (iframe in merchant admin) | Institution Portal embedded in the HR system's admin UI (or standalone portal — both offered) |
| Webhooks (orders/fulfillments) | Outbound webhooks: employee activated, allowance issued, booking created/accepted/completed/cancelled, payment completed, refund processed — with HMAC signing + retries |
| REST/GraphQL API with access tokens | Our existing OpenAPI + per-tenant access tokens (JWT) |
| App billing (recurring/usage) | Platform fee billing (Decision D2) |
| Uninstall → cleanup | Deactivation flow: tenant disabled, widgets removed, data export |

### 4.2 Why this fits Loup specifically

- The B2B2C model *is* an integration model: institutions will not re-key employee data; the roster comes from HR. CSV import (exists) is the fallback; API sync + webhooks is the product.
- We already have the widget stub (`widgetSnippet`, `/embed/demo`). The pitch claim "installs like a Shopify app, embeds like a widget, syncs like an API" is currently **60% code, 40% story** — the story dies without auth + webhooks + second tenant (G1–G3).
- Realistic UAE 2026 target ERPs for education: **iSAMS / Veracross / PowerSchool (school MIS), Oracle HCM & SAP SuccessFactors (admin staff), Zoho People, Bayan (payroll)**. Do NOT build ERP connectors yet — build the **connector platform** (auth, webhooks, embeddable widget SDK) and prove it with one named ERP + one school MIS in the pilot. Connectors are then configuration, not bespoke builds.

### 4.3 The embeddable widget (short-term wedge)

- A `<loup-benefits>` web component (already sketched in the widget snippet) delivered as a static JS asset: reads an `employee-token` (short-lived JWT minted by the ERP via our API), renders the employee's allowance + book action, and deep-links to the full employee app.
- **Pitch-week deliverable:** the `/embed/demo` page + a live "widget preview" on the landing page showing the snippet + token flow, so the pitch includes the ERP story in 60 seconds.

### 4.4 Integration surface requirements (spec-level)

| # | Requirement | Notes |
|---|---|---|
| INT-1 | OIDC/OAuth 2.0 authorization code flow for institution admins | Managed IdP or self-hosted (D1); demo tokens signed in-app |
| INT-2 | Per-tenant client credentials + scopes | `education_groups.integration_scopes` or a new `tenant_clients` table |
| INT-3 | Employee roster sync endpoints (pull + push) | `GET/POST /v1/employer/employees` exist; add `updatedSince`, bulk upsert, delta webhooks |
| INT-4 | Webhook delivery: outbox, HMAC signing, retries, replay UI | G3; events per brief §13 |
| INT-5 | Widget SDK: static JS, token auth, deep links | Extend stub in `platform.ts` + `/embed` route |
| INT-6 | Idempotent financial endpoints | G5 |
| INT-7 | Tenant isolation on every query | G2; authorization middleware derived from token claims |
| INT-8 | API key management for provider/settlement integrations | `provider_clients` table |
| INT-9 | Webhook event log visible in admin console | Pitch-week deliverable |
| INT-10 | Uninstall/deactivation + data export | GDPR/PDPL posture; PDPL compliance is a stated NFR |

---

## 5. Mobile App Strategy

### 5.1 Current state
- `artifacts/loup-mobile`: Expo 54, expo-router, tabs for `book`, `booking`, `provider` — a skeleton, not a product. Can't be previewed on the Replit iOS app; native builds are a "future option" per `replit.md`.

### 5.2 Decision (recommendation)
**Do not build native mobile before the pilot.** Rationale:
- Employees in schools use the web app on their phones; the web app is mobile-first responsive already.
- The pitch is B2B2C: institutions buy, employees adopt. Adoption proof can be web-only.
- Two native apps (employee + provider) is ~3–6 months of work that competes with pilot readiness.

**What to do instead:**
1. Keep `loup-mobile` as the roadmap placeholder; commit to it **after the pilot** (target: employee app in pilot extension phase, provider app second).
2. Make the web app installable as a **PWA** (manifest + service worker + web push — push infra already exists in `push.ts`). This gives "app-like" presence (home-screen icon, push notifications) at ~1–2 days of work and is a strong demo during the pitch ("teachers get push updates without downloading anything").
3. In Phase 2, revive `loup-mobile` for the **provider** surface first (field workers benefit most from native) and the employee surface second, both consuming the same OpenAPI client that already has a React client — the Expo app already depends on `@workspace/api-client-react`.

### 5.3 Mobile requirements (Phase 2+)
- MOB-1: Employee app — allowance dashboard, browse/book, bookings, push, household, AI advisor (reuse all endpoints).
- MOB-2: Provider app — order feed, accept/reject, start/complete, availability, earnings, chat.
- MOB-3: Offline-first for provider status transitions (queue + retry, idempotency keys).
- MOB-4: Localization (Arabic RTL) — a stated NFR from the RightNow brief; iOS/Android store compliance.

---

## 6. Phased Plan

### Phase 0 — Pitch Week (Days 1–7). Goal: credibility + a pitch-proof demo.

| # | Work item | Details | Files |
|---|---|---|---|
| P0-1 | Demo login + signed tokens | Add `/v1/demo/login` issuing signed JWT for 4 roles; front-end login screen replaces role header buttons; middleware verifies token and sets principal; keep demo header as fallback only when `NODE_ENV !== production` | `artifacts/api-server/src/routes/platform.ts` (new `auth` route), new `lib/auth.ts` middleware, `artifacts/loup/src/pages/login.tsx`, shell components |
| P0-2 | Second tenant + real tenant resolution | Seed "Al Noor University" (1 institution, 1 campus, 2 tiers, ~15 employees, its own provider set optional); change `resolveEmployerContext`/employee lookups to derive from principal claims; land a `GET /v1/employer/overview` for the second tenant and prove isolation on `/v1/employer/employees` and `/v1/operations/*` | `scripts/src/seed.ts`, `platform.ts` (replace hardcoded `meridian`), `lib/db/src/schema/education.ts` (no change needed) |
| P0-3 | Webhook event log | Write events from mutations: booking created/accepted/completed/cancelled, employee activated, allowance issued, payment completed, refund processed; admin "Webhook Events" table page; simulated delivery (sent/failed) in demo mode | new `routes/webhooks.ts` (read-side), `routes/admin.ts`, `lib/loup.ts` helper, admin page `artifacts/loup/src/pages/operations.tsx` |
| P0-4 | Fee model on screen | Configurable fee (decision D2) — default e.g. 8% of employer contribution per redemption or per-employee/month; show "Loup platform fee" + "estimated monthly platform revenue" in institution overview and ops console | `platform.ts`, `admin.ts`, seed, institution/ops pages |
| P0-5 | Widget story live | `/embed/demo` polished; landing page includes a real snippet + token demo; `GET /v1/employer/integrations` returns working `widgetSnippet` | `embed-demo.tsx`, `landing.tsx`, `platform.ts:948` |
| P0-6 | Demo reconciliation | Fix 60 vs 218 staff; remove fallback constants or make them ledger-derived; verify all 9 demo-script steps; record a 3-min fallback video | `seed.ts`, `platform.ts` constants, `replit.md` |
| P0-7 | Money-path unit tests | Split-payment calc, ledger authorization/redemption math, tenant isolation (the two-tenant diff), duplicate redemption prevention | new `artifacts/api-server/test/` (see D4) |
| P0-8 | Pitch pack | 5-min script (exists in `replit.md`), one-pager (fee model, pilot offer: free 90-day, 20–50 employees), LOI template, 2–3 target schools | non-code |

**Phase 0 exit criteria:** two tenants demo end-to-end; login demonstrated; webhook log shows a full transaction lifecycle; fee line visible; widget embeddable in any static page; tests green; no console errors.

### Phase 1 — Pilot Readiness (Weeks 2–6). Goal: safe to run a real institution.

| # | Work item | Details |
|---|---|---|
| P1-1 | Real auth (OIDC) | Wire D1 IdP; institution SSO for admin; employee email+password or SSO; provider + ops separate realms; token claims carry `tenantId`, `role`, `employeeId`; production no longer 403s |
| P1-2 | Tenant isolation hardening | Middleware enforces tenant from claims on every route; cross-tenant queries impossible (audit test); institution admins scoped to own group |
| P1-3 | Webhook delivery engine | Outbox pattern on `webhook_events`; delivery worker (in-process setInterval for MVP, later queue), HMAC-SHA256 signing with per-tenant secret, retries with exponential backoff + max attempts, replay UI, idempotent delivery (`event_id` in headers) |
| P1-4 | Idempotency enforcement | `Idempotency-Key` middleware on booking/pay/approve/ledger writes; duplicate rejection; ledger dedupe |
| P1-5 | Fee model persisted + settlement | Fee config per benefit plan; provider settlement = net of fee; admin revenue dashboard consistent with ledger |
| P1-6 | Roster sync APIs | `GET /v1/employer/employees?updatedSince=`, bulk upsert (max 500/batch), delta webhooks (employee activated, tier changed, deactivated) |
| P1-7 | Widget v1 | Real `/embed/loup-widget.js` static asset; token exchange endpoint for short-lived employee tokens; deep link to `/book/:serviceId` |
| P1-8 | CSV import hardening | Template download endpoint, per-row validation errors, atomic import, dedupe on `externalEmployeeId` |
| P1-9 | Test suite expansion | Full brief §20 matrix: expiration rules, role permissions, booking status transitions, cancellation reversal, CSV validation, webhook signing |
| P1-10 | PWA | Manifest + service worker + push for web employee app |
| P1-11 | PDPL posture | Consent records, data export per institution, deletion workflow, retention on webhook logs |

**Phase 1 exit criteria:** pilot institution on-boarded with real SSO + roster sync; a real booking completes with a real provider; ledger reconciles; institution sees fee-bearing reports; incident flow works; webhook delivery verified against a test endpoint.

### Phase 2 — Integration Platform & Distribution (Weeks 6–12). Goal: "installs like a Shopify app."

| # | Work item | Details |
|---|---|---|
| P2-1 | Named ERP connector (pick ONE): Oracle HCM or SAP SuccessFactors or school MIS (iSAMS/Veracross) | OIDC provider config, roster mapping, webhook targets, embedded admin iframe; documented install guide |
| P2-2 | School MIS connector (pick ONE) | Same pattern; this is the highest-probability early pilot surface (schools run on MIS, not HCM) |
| P2-3 | Connector SDK docs + public API docs site | Swagger UI hosted; sandbox credentials; sample curl + webhook receivers |
| P2-4 | Provider API keys | `provider_clients`; signed requests; rate limits; settlement reporting |
| P2-5 | Mobile (post-pilot): provider app first, employee app second | Per §5.3 |
| P2-6 | Marketplace expansion controls | Category/service CRUD already DB-driven; add per-institution catalog visibility (which categories a plan can include — `benefit_plans.permittedCategoryIds` exists) |
| P2-7 | Billing integration (Stripe) | Replace mock card top-up; payment status reconciliation to ledger (design already anticipates this) |
| P2-8 | AI advisor hardening | Scope to authenticated user; token budget; optional per-institution enable flag |

**Phase 2 exit criteria:** a second and third institution onboarded (at least one via API sync + webhooks, not CSV); widget embedded in a real intranet; provider pays out; documented connector kit.

### Phase 3 — Scale (Months 4+). Goal: product-market fit in UAE education, expansion options.

- BNPL/installments on employee top-ups (Tabby/Tamara) — brief Phase 2–3.
- WhatsApp Business messaging for booking notifications (UAE norm).
- Arabic + RTL.
- Consumer marketplace reopening (RightNow engine) as a funnel for non-employer users.
- Multi-country (GCC) tenant support.

---

## 7. Decisions (recorded)

| ID | Decision | Options | Recommendation | Rationale |
|---|---|---|---|---|
| D1 | Identity provider | (a) Managed IdP (Auth0/Clerk/WorkOS) (b) self-hosted Keycloak (c) DIY JWT | **(a) Managed for pilot; (c) mock JWT now for pitch** | Speed + security; don't build identity in a benefits platform with financial flows |
| D2 | Revenue model | (a) % of employer contribution per redemption (b) per-employee/month SaaS (c) transaction margin on employee top-ups (d) hybrid | **(d) Hybrid: SaaS base + % of contribution**, configurable per plan | Matches brief's fee language; hedge on adoption vs usage; can A/B in pilot |
| D3 | ERP strategy | (a) connector platform + 1 named ERP (b) build many connectors (c) API-only | **(a)** | Connectors are configuration once the platform exists; over-investing early is the classic B2B mistake |
| D4 | Test runner | Vitest (already-adjacent TS stack) vs Jest | **Vitest** | Zero-config TS, fast, no new toolchain |
| D5 | Webhook delivery | (a) in-process worker (b) BullMQ/Redis (c) serverless queue | **(a) for pilot, (c) at scale** | MVP has one instance; queue adds ops burden too early |
| D6 | Mobile priority | (a) PWA first, native post-pilot (b) native now | **(a)** | See §5.2 |
| D7 | Public API docs | (a) hosted Swagger UI (b) in-app `/api-docs` only (c) Stoplight/readme.io | **(a) for pilot; (c) before public launch** | In-app page is a demo nicety, not a developer experience |

---

## 8. Open Questions (need answers, in priority order)

1. **Revenue model preference** — do the founders lean SaaS-per-employee, % of contribution, or top-up margin? (D2 — blocks fee math in P0-4.)
2. **Target pilot institution(s)** — which 1–3 schools/groups? Are there warm intros? (Blocks LOI work in P0-8.)
3. **Target ERP/MIS for the first named connector** — school MIS (iSAMS/Veracross) vs HCM (Oracle/SAP) changes Phase 2 scoping. (Recommendation: school MIS — it's the employee roster source of truth in education.)
4. **Pilot economics** — free pilot terms, who covers top-up payment processing, who pays providers during the pilot (Loup-funded vs school-funded allowances)?
5. **Brand** — "Loup" is final per `replit.md`; confirm the widget/embedded surfaces carry the same brand.
6. **AI advisor in pilot** — include or gate behind institution opt-in? (Token cost + school data concerns; default recommendation: opt-in, per-plan flag.)
7. **Settlement/payout mechanics for providers** — who invoices whom (Loup bills institution; Loup pays provider net of fee)? Confirm this model in pilot terms.
8. **PDPL data processing agreement** — does the pilot require a DPA template before school sign-off?
9. **CSV vs API-first for the pilot** — plan to demo CSV (fast) but land API sync (product); confirm pilot schools accept the API path.

---

## 9. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Demo breaks during pitch | High | P0-6 (run script twice daily, fallback video), freeze code after day 5 |
| "It's a demo with fake auth" objection | High | P0-1 (real-looking login + tokens), P0-2 (two tenants) — removes the two biggest credibility gaps |
| Revenue model undefined | High | P0-4 — put a fee line on screen, even if configurable |
| Pilot schools demand ERP integration on day 1 | Medium | P0-5 widget + CSV import as fallback; P1-6 roster sync; set expectations in LOI |
| Data inconsistencies found by evaluators | Medium | P0-6 reconciliation; ledger-derived numbers everywhere |
| Scope creep into native mobile / payments | Medium | Phase discipline: nothing outside Phase 0–1 until pilot signed |
| Webhook/API claims oversold | Medium | Never demo webhook delivery as real until P1-3; label simulated in demo mode |
| Money-path bugs (ledger drift) | High | P0-7 tests + P1-9 matrix; reconciliation report in admin |

---

## 10. Definition of Done (for this PRPD)

- [ ] Phase 0 items P0-1..P0-8 complete and demoed
- [ ] Phase 1 exit criteria met (real pilot institution onboarded)
- [ ] Phase 2 exit criteria met (2+ institutions, one via API/webhooks, widget live)
- [ ] Every endpoint in `openapi.yaml` implemented and typed (no orphan spec paths)
- [ ] No hardcoded `meridian` outside seed data
- [ ] Fee math reconciles with ledger; settlement reports match
- [ ] Test suite green in CI (see D4)
- [ ] This document updated with decisions on all §8 Open Questions