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
| `/` | Demo landing | Pick a workspace |
| `/employee` | Employee App | Omar Mansour — Faculty, Dubai Hills, AED 750/mo |
| `/institution` | Institution Portal | Meridian International Schools — 218 staff, 3 tiers |
| `/provider` | Provider Portal | Marina Shine Cleaning — demand and performance |
| `/admin` | Loup Operations | Control tower — matching, quality, audit |
| `/browse` | Service discovery | 7 categories, 22 services |
| `/bookings` | Booking management | Live status tracking |
| `/household` | Household hub | Loup Live map + Benefit Advisor AI |

Old paths `/employer`, `/vendor`, `/operations` redirect to the new canonical routes.

## Demo credentials (no auth — simulated)

All workspaces are open in demo mode. Current user is set via `isCurrentUser` flag on the member row (Omar Mansour). No passwords required.

| Role | Entry | Allowance |
|------|-------|-----------|
| Employee (Faculty) | `/employee` | AED 750/month |
| Employee (Staff) | `/employee` | AED 500/month |
| Employee (Admin) | `/employee` | AED 400/month |
| Institution admin | `/institution` | — |
| Provider manager | `/provider` | — |
| Loup operations | `/admin` | — |

## 5-minute demo script

1. **Open `/`** — see the Meridian Education Group landing. Note the three tier badges (Faculty 750, Staff 500, Admin 400).
2. **Click "Employee App"** — see Omar's allowance hero (AED 750 authorized, AED 416 available). Scroll to see the 7 active categories and benefit advisor.
3. **Click "Institution Portal"** — see Meridian's aggregate stats (218 staff, 75% activation). Scroll to the roster and utilization chart.
4. **Click "Provider Portal"** — see Marina Shine Cleaning's day view with assigned jobs, capacity, and forecast.
5. **Click "Loup Operations"** — see the control tower: forecast demand, matching scores, quality flags.
6. **From Employee app, click "Services"** — browse the 7 categories. Pick a provider and tap "Book".
7. **Check "Bookings"** — the live AC Repair booking (en route) shows ETA and chat history.
8. **Check "Household"** — the Loup Live map shows the live provider dot; the Benefit Advisor AI panel answers allowance questions.
9. **Reset demo state** at any time: hit the "Reset demo" button on `/` (dev mode only), or run `pnpm --filter @workspace/scripts run seed`.

## User preferences

- Product name: **Loup** (not RightNow).
- Dark 3D visual identity is final: near-black `hsl(270 12% 4%)`, electric amber `hsl(38 100% 58%)`, Syne 800 headings, Inter body, glass cards with `backdrop-filter: blur`, ambient orb field.
- User is on the Replit iOS app — native mobile (Expo) builds can't be previewed there; the web app is mobile-first responsive. Native apps are a future option on replit.com.
- No emojis in the UI.
