# Loup

On-demand home & lifestyle services marketplace for Dubai households ("wolf" in French — the household is the pack). Families summon vetted professionals (cleaning, AC, handyman, beauty, home health, pest control, laundry, pool care), track jobs live, chat with providers, and settle everything on one consolidated household bill in AED.

Based on the "RightNow" development brief (attached_assets/), renamed to Loup per user request. Current build: **customer surface only** — provider app and admin console are planned follow-ups.

## Architecture

pnpm monorepo:
- `artifacts/loup` — customer web app (React + Vite, wouter, TanStack Query, shadcn/ui, framer-motion). Mobile-first with bottom tab bar; desktop gets a sidebar. Light/dark mode. Design theme: "Midnight Champagne" (midnight navy + champagne gold, Fraunces + Plus Jakarta Sans).
- `artifacts/api-server` — Express 5 + pino, serves `/api/*`. Routes in `src/routes/` (home, catalog, household, bookings, billing), shared helpers in `src/lib/loup.ts`.
- `lib/api-spec` — OpenAPI contract (`openapi.yaml`). `pnpm --filter @workspace/api-spec run codegen` regenerates the react-query client (`lib/api-client-react`) and Zod schemas (`lib/api-zod`).
- `lib/db` — Drizzle schema in `src/schema/` (household, catalog, bookings, billing domains). `pnpm --filter @workspace/db run push` to sync.
- `scripts/src/seed.ts` — re-runnable demo seed: `pnpm --filter @workspace/scripts run seed`. Wipes and reseeds everything with dates relative to now (always looks alive). Safe way to reset demo state.

## Demo model (no auth yet)

- Single seeded household: the Mansour family (5 members, roles head/owner/member, spend limits). Current user = `isCurrentUser` flag on members; resolved in `getCurrentMember()` (`artifacts/api-server/src/lib/loup.ts`) — the single seam to replace with real sessions later.
- Payments are simulated (card/wallet/cash rows, no gateway). Paying the open statement marks it paid and opens a fresh one.
- Live feel is simulated server-side: new bookings auto-confirm ~7s after placement; chat messages get a canned provider reply ~3s later; the booking detail page has a "simulate provider progress" control that advances status (completing a job adds it to the open bill).
- Booking status chain: pending → confirmed → en_route → arrived → in_progress → completed (cancelled is terminal).

## User preferences

- Product name: **Loup** (not RightNow).
- User is on the Replit iOS app — native mobile (Expo) builds can't be previewed there; this build is a mobile-first responsive web app instead. Native apps are a future option on replit.com.
- No emojis in the UI.
