# Loup

UAE-first B2B2C lifestyle-benefits platform for the education sector. Institutions (schools, universities) offer employees a monthly benefit allowance they spend on curated home and life services. Loup coordinates the full cycle: employee bookings, provider fulfilment, institution benefit governance, and Loup platform operations.

Demo seed: **Meridian Education Group** — one education group, Meridian International Schools, two Dubai campuses, three benefit tiers, 60 employees, 11 providers, 22 services across 7 broad categories.

## Architecture

pnpm monorepo:
- `artifacts/loup` — web app (React + Vite, wouter, TanStack Query, shadcn/ui). Dark 3D visual identity: near-black background, electric amber accent, Syne headings, Inter body, glass cards.
- `artifacts/loup-mobile` — Expo mobile app (React Native).
- `artifacts/api-server` — Express 5 + pino, serves `/api/*`. Routes in `src/routes/`.
- `lib/api-spec` — OpenAPI contract (`openapi.yaml`). Regenerate client: `pnpm --filter @workspace/api-spec run codegen`.
- `lib/db` — Drizzle schema in `src/schema/`. Push schema: `pnpm --filter @workspace/db run push`.
- `scripts/src/seed.ts` — re-runnable demo seed (wipes and reseeds everything with dates relative to now): `pnpm --filter @workspace/scripts run seed`.

## Schema domains

- `household.ts` — households, members, addresses
- `catalog.ts` — categories, providers, services, reviews
- `bookings.ts` — bookings, booking_events, messages
- `billing.ts` — statements, bill_items, payment_methods
- `pack.ts` — pack_messages, service_requests
- `push.ts` — push_subscriptions, push_config
- `education.ts` — education_groups, institutions, campuses, departments, benefit_plans, benefit_tiers, booking_status_history, support_incidents, provider_quality_flags, webhook_events
- `platform.ts` — employers (legacy), employees, allowance_ledger, routines, audit_events
- `conversations.ts` / `messages.ts` — AI advisor conversations and messages

## Demo routes & entry points

| Path | Portal | Role |
|------|--------|------|
| `/` | Demo landing | Brand panel + "Open my workspace" + embed snippet |
| `/login` | Demo login | Pick a role card; institution card offers Meridian / Al Noor tenant picker |
| `/employee` | Employee App | Omar Mansour — Faculty, Dubai Hills, AED 750/mo |
| `/institution` | Institution Portal | Meridian International Schools — 60 employees, 2 campuses, 3 tiers |
| `/provider` | Provider Portal | Marina Shine Cleaning — demand and performance |
| `/admin` | Loup Operations | Control tower — overview, institutions, providers, catalog, bookings, ledger, webhooks |
| `/embed/demo` | Widget preview | Standalone embeddable employee widget (auto-issues a demo token) |
| `/browse` | Service discovery | 7 categories, 22 services |
| `/bookings` | Booking management | Live status tracking |
| `/household` | Household hub | Loup Live map + Benefit Advisor AI |

Old paths `/employer`, `/vendor`, `/operations` redirect to the new canonical routes.

## Demo sign-in (simulated auth)

The pitch demo uses signed JWTs (jose HS256, 8h TTL) issued by `POST /api/v1/demo/login`. `/login` shows four role cards (Employee / Institution / Provider / Operations); the institution card first asks which tenant to sign in as (Meridian Education Group or Al Noor University — the second tenant proves isolation). The legacy `x-loup-demo-role` header fallback exists in dev only.

## 5-minute demo script

1. **Open `/`** — Meridian Education Group landing. See the two-line embed snippet (the widget is real: open "Live preview" to see it run standalone).
2. **Click "Open my workspace"** — the `/login` role cards appear. Click **Employee App**.
3. **Employee portal** — Omar's allowance hero (AED 750 authorized, ~AED 416 available). Scroll to the 7 active categories and the Benefit Advisor.
4. **Click the Institution card at login, pick Al Noor University** — see a *different* tenant: 15 employees, its own plans, and honest numbers (no phantom fallbacks like "218 staff" or AED 124,500). Switch back to Meridian and enter — 60 employees, 2 campuses, 3 tiers.
5. **Institution portal (Meridian)** — aggregate stats (60 employees, 75% activation), the "Loup platform fee" card (8% + AED 12/employee), roster, utilization chart.
6. **Provider portal** — Marina Shine Cleaning's day view with assigned jobs, capacity, and forecast.
7. **Loup Operations** — the control tower. Overview tab shows 2 institutions / 75 employees and the "Est. monthly platform revenue" KPI (AED 747). **Webhook Events tab** shows the full transaction lifecycle: `booking.created → accepted → completed → payment.completed → refund.processed`.
8. **From Employee app, "Services"** — browse the 7 categories. Pick a provider and tap "Book" — then watch the booking land in Operations → Webhook Events.
9. **Reset demo state** at any time: hit the "Reset demo" button on `/` (dev mode only), or run `pnpm --filter @workspace/scripts run seed`.

## User preferences

- Product name: **Loup** (not RightNow).
- Dark 3D visual identity is final: near-black `hsl(270 12% 4%)`, electric amber `hsl(38 100% 58%)`, Syne 800 headings, Inter body, glass cards with `backdrop-filter: blur`, ambient orb field.
- User is on the Replit iOS app — native mobile (Expo) builds can't be previewed there; the web app is mobile-first responsive. Native apps are a future option on replit.com.
- No emojis in the UI.
