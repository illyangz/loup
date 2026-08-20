# Loup — Design System Redesign Notes (P1-12)

> Written 2026-08-20 mid-session as a safety net in case the session runs out
> of budget before this is finished. If you're picking this up cold: read
> this whole file before touching CSS. It has both target design specs
> verbatim, the plan, and exactly what's done vs not.

## The ask

User does not like the current dark-mode design across the app (`loup` +
`loup-admin`). Wants a **global** redesign, not just landing/login. Two
design systems, verbatim specs from the user below:

1. **"Zelt" (Warm beige canvas with yellow accents)** — the **primary/default**
   theme. Full-page reference screenshot the user called "how the full page
   must look, with proper sizing, padding, everything — the older designs
   were not good" is a real Zelt.com landing page screenshot (light beige bg,
   floating white pill nav, huge black sans headline, amber pill CTA, amber
   alert bar, dark charcoal footer, FAQ accordion, logo cloud). Match spacing/
   sizing generously — this was called out explicitly as a complaint about
   the first draft.
2. **"Swap" (Crisp AI Canvas)** — a **second theme reachable via a toggle**.
   White/mint-green, thin Playfair-Display headings + Inter body, pill
   buttons, dark forest-green (`#083a26`) content cards, "agentic gradient"
   text effect (teal→green→yellow-green gradient fill on big display type).

**Both must be implemented; user wants a working toggle between them.**
This is a big ask — two complete token systems, both applied across every
page of two separate apps (`loup`: landing/login/employee/institution/
provider/admin portals + consumer flows; `loup-admin`: overview/institutions/
providers/catalog/bookings/ledger/incidents/analytics).

## Design spec 1 — Zelt (primary/default)

### Palette
| Name | Hex | Use |
|---|---|---|
| Amber Glow | `#ffcd6d` | Primary action buttons, active nav indicators, interactive highlights |
| Soft Amber | `#ffe2aa` | Header alert bg, secondary accent |
| Midnight Graphite | `#121718` | Primary text, icon fills, strong borders, dark surfaces |
| Deep Charcoal | `#2f2f2f` | Footer bg, elevated dark card variant |
| Utility Gray | `#444444` | Ghost button bg, subtle link bg |
| Soft Stone | `#e4e0dd` | Page background, hero sections |
| Warm Mist | `#f6f3ef` | Subtle section bg, alt card surface, dividers |
| Canvas Cloud | `#ffffff` | Card bg, main content fills |

### Type scale (sans-serif throughout, system-ui/Inter-like)
| Token | Size | Weight | Line-height |
|---|---|---|---|
| display | 76px | 400 | 0.95 |
| heading-lg | 58px | 400 | 0.95 |
| heading | 43px | 400 | 1.02 |
| subheading | 23px | 400 | 1.2 |
| body | 16px | 400 | 1.6 |
| caption | 12px | 400 | 1.4 |

Weights available: 300, 400, 500, 700. Letter-spacing tightens as size grows
(roughly -0.043 at largest down to -0.003 at smallest — tighter tracking for
headlines, normal for body). Fallback stack: `system-ui, -apple-system,
BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`.

### Components
- **Primary button**: bg Amber Glow, text Midnight Graphite, radius 12px, padding ~14px h / 5-8px v, pill-ish but not full pill.
- **Ghost button**: transparent bg, text Midnight Graphite, border 1px Midnight Graphite, radius 12px (or 0 for text links).
- **Soft card**: bg Canvas Cloud (white), radius 12px, **no box-shadow**, padding ~43px.
- **Alt card (mist)**: bg Warm Mist, radius 12px, no shadow.
- **Alt card (charcoal)**: bg Deep Charcoal (dark section), radius 12px, generous padding (43px v / 72px h).
- **Nav link**: text Midnight Graphite, minimal padding, no bg unless active.
- **Header alert bar**: bg Soft Amber, text Midnight Graphite, height 48px, dismissible.

### Layout / imagery notes
- Full-bleed hero, centered dominant headline + supporting text.
- Sections demarcated by **background color changes** (Stone → Mist → White → Charcoal), not borders/dividers.
- Sticky top nav, centered, contained width, primary CTA on the far right — **floats as a pill/rounded card**, not a full-width bar (confirmed in the full-page reference: white rounded-full nav sitting on the beige page bg with a soft shadow).
- Decorative abstract 3D-ish soft blobs/spheres in neutral tones, diffused lighting — no photography, minimal monochrome outlined icons.
- **Do**: 12px radius everywhere (cards + primary buttons), 43.2px card padding, body line-height 1.6, generous vertical rhythm between sections, Canvas Cloud/Warm Mist for most content blocks, Charcoal reserved for distinct dark sections (footer etc).
- **Don't**: no harsh borders/heavy shadows, no colors outside Amber Glow/Soft Amber as accents, no tight spacing, no script/decorative fonts, no dark backgrounds for general content (only the reserved charcoal blocks), nothing under 8px radius except 0px text links.

### Full-page reference (what "done right" looks like — from the user's screenshot)
Top to bottom: amber alert bar (dismissible, small badge + text) → floating
white pill nav (logo left, links center, 2 CTAs — "Sign in" ghost text +
"Book a Demo"/pill-accent-button right) → huge centered headline ("All-in-one
HR Software" style, ~90-120px, tight leading) → amber pill primary CTA → FAQ
accordion section (white cards, plus-icon expanders, generous padding) →
**Deep Charcoal footer** with a big light headline, amber CTA button, a
hairline divider, then a 4-column link footer (brand wordmark + social icons,
Product/Resources/Legal columns, QR code block on the right). The whole page
is airy — lots of whitespace, generous section padding (feels like 96-160px
vertical section padding, not 24-48px).

## Design spec 2 — Swap ("Crisp AI Canvas", toggle-only second theme)

### Palette
| Name | Hex | Use |
|---|---|---|
| Mint Accent | `#a3fda7` | Primary action backgrounds, active states, decorative accents |
| Agentic Gradient | `#82ff87` (one stop of a teal→green→yellow-green gradient) | Hero text / prominent graphical elements only — never backgrounds or small UI |
| Text Black | `#000000` | Primary text, headings, icon fill |
| Deep Forest BG | `#083a26` | Rich content block / section card backgrounds |
| Graphite Inset | `#2d3637` | Dark rich card backgrounds |
| Shadow Green BG | `#0d5b3b` | Rich content block backgrounds (alt to Deep Forest) |
| Subtle Gray Card | `#838676` | Specific content card backgrounds, cool gray |
| Muted Ash | `#999999` | Tertiary text, subtle link bg |
| Subtle Sage | `#9cb0a8` | Ghost button outline, soft borders |
| Outline Gray | `#cccccc` | Hairline borders, dividers |
| Stone Beige | `#e9e7e2` | Ghost button fill, secondary bg |
| Canvas White | `#ffffff` | Primary page/card background |

### Type scale — **two font families, this is the key differentiator**
- **Body font** ("mainFont", effectively Inter): weights 400/500/700, sizes 9-30px, tight letter-spacing (-0.01). Used for body, buttons, system UI.
- **Display font** ("secondaryFont", Playfair Display or similar thin serif): weights **100 and 300 only** (never bold — "its characteristic is its lightness"), sizes 72/80/120px, line-height 0.95-1.0, letter-spacing -0.017. Used **only** for hero/display headlines.

| Token | Size | Weight | Line-height |
|---|---|---|---|
| display | 72px | 400 (but see above — real hero type uses the *display font* at weight 100/300, huge) | 0.95 |
| heading-lg | 30px | 400 | 1.2 |
| heading | 24px | 400 | 1.4 |
| subheading | 18px | 400 | 1.5 |
| body | 15px | 400 | 1.4 |

### Components
- **Ghost text button**: transparent, Text Black, no border/radius, minimal padding — used for nav links.
- **Pill accent button**: bg Mint Accent, text Text Black, border Mint Accent, radius 200px (full pill), padding 0 v / ~19px h.
- **Pill ghost button**: bg Stone Beige, text Text Black, radius full pill, padding ~7px v / ~10px h.
- **Card with shadow**: bg Canvas White, radius 24px, shadow `rgba(0,0,0,0.09) 0px 0px 28px 0px`, padding 20px.
- **Dark content card**: bg Graphite Inset, radius 24px, no shadow, no fixed padding (content manages its own).
- **Accent gradient card**: bg Deep Forest BG, radius 24px, no shadow.
- **Minimal input**: transparent bg, border 1px Outline Gray, radius 100px (pill), padding 12px v / ~19px h.

### Layout / imagery notes
- Product-focused, custom abstract gradient typography as hero centerpiece (the "AGENTIC Storefront" huge gradient-fill text block in the reference).
- Moderate density, generous negative space around key text/interactive elements.
- Icons: minimal, outlined, Text Black only.
- **Do**: Canvas White as primary bg for most sections, Text Black for all text, Mint Accent reserved for primary CTAs only, secondaryFont (thin Playfair-ish) at weight 100/300 for ALL big display headlines, 24px radius on all cards, generous section gaps (~30px+ token, but visually sections have much more breathing room than that in the reference — treat 30px as a minimum, not the section gap itself), Agentic Gradient used only for hero text/graphics.
- **Don't**: no heavy shadows except the one defined card shadow, no saturated colors outside Mint Accent for general UI, never bold-weight the display font, no decorative borders/heavy bg on inputs (keep pill + hairline only), no square buttons — always full pill or heavily rounded, minimum 8px gap between discrete UI elements.

### Full-page reference notes (Swap)
White top nav (serif "Swap" wordmark, dropdown nav links, "Sign in" ghost +
mint pill "Book a Demo" CTA) → very pale mint-tinted hero bg → huge thin-serif
headline ("The first agentic storefront") centered → body copy → two CTAs
(mint pill primary + black pill secondary) → large rounded-corner light-gray
placeholder/media block → logo cloud ("Powering 1000+ Global Businesses") →
3-up white "Card with shadow" feature grid → big stat row (2x / 3x / 20% in
huge thin numerals) → alternating dark Deep-Forest and photo cards with
testimonial quotes → blog card row → **dark Deep-Forest CTA block** ("Book a
free 15-minute demo" + a real-looking form) → footer with hand-drawn
illustration strip at the very bottom, dark bg, multi-column links.

## Decisions made

1. **Sequencing**: apply Zelt globally FIRST (it's the default/primary
   theme and was explicitly what needs fixing everywhere), THEN build Swap as
   a togglable second theme once Zelt is solid everywhere. Don't try to do
   both simultaneously per-page — too easy to half-finish both.
2. **Token architecture**: promote the new palette into the SHARED CSS custom
   properties in `artifacts/loup/src/index.css` (`:root`) rather than keeping
   it landing/login-scoped like the first draft — user wants it global. This
   WILL require touching every page that currently hardcodes dark-theme
   classes (`text-white/60`, `bg-black/25`, `border-white/10`, `.glass-card`,
   `.ambient-field`, etc.) since a token-only swap breaks them (white text on
   light bg = invisible). Each page needs an actual pass, not just a global
   variable flip.
3. **Theme toggle**: implement via a `data-theme` attribute on `<html>` (or a
   class), with `ThemeProvider` (`src/hooks/use-theme.tsx` already exists —
   check/extend it) driving three states: zelt (default) / swap. Store choice
   in localStorage. Swap needs its OWN token block gated behind
   `[data-theme="swap"]` selectors, loaded alongside Zelt's `:root` defaults.
4. **Fonts to load**: Zelt needs nothing new (Inter, already loaded, covers
   it — just drop Syne). Swap needs Playfair Display added (Google Fonts) for
   the thin display headlines, weights 100+300 specifically (may need to
   check availability — Playfair Display's variable/thin weights should be
   fine via `wght@100;300`).
5. **loup-admin**: same two-theme treatment applies there too per "global" —
   lower priority than the main `loup` app's portal pages, do last.

## Status as of last update in this file

- ✅ `App.tsx`: fixed `/login` route (was a dead `<Redirect to="/" />` that
  silently broke the P1-1 SSO callback flow — `?token=` was never read
  anywhere). Now routes to the real `Login` component.
- ✅ `landing.tsx`: rewritten in Zelt style (light, amber pills, alert bar,
  floating nav, hero, how-it-works cards, institution/widget section, dark
  charcoal footer) — but this was the FIRST draft the user said needs
  more/better sizing and padding to match the real reference screenshot.
  **Needs a revisit pass** once global tokens exist, to match the full-page
  reference more closely (bigger headline, more generous section padding,
  proper floating-pill nav shadow, FAQ-style section, etc.)
- ✅ `login.tsx`: rewritten in Zelt style, functionally intact (role picker,
  SSO tenant sub-picker, error handling). Same "needs a revisit for spacing"
  caveat.
- ❌ Global tokens in `index.css`: NOT YET promoted — Zelt colors are still
  only hardcoded inline in landing.tsx/login.tsx via arbitrary Tailwind
  values, not real shared CSS variables yet. This is the next real step.
- ❌ Swap theme: not started at all.
- ❌ Theme toggle: not started (need to check `src/hooks/use-theme.tsx` for
  what already exists to build on).
- ❌ Every other page (`employee.tsx`, `employer.tsx`/institution,
  `vendor.tsx`/provider, `operations.tsx`/admin, `home.tsx`, `browse.tsx`,
  `book.tsx`, `bookings.tsx`, `household.tsx`, `billing.tsx`,
  `provider-profile.tsx`, `booking-detail.tsx`, `embed-demo.tsx`,
  `api-docs.tsx`, `support.tsx`, `not-found.tsx`) and all of `loup-admin`
  (`overview.tsx`, `institutions.tsx`, `providers.tsx`, `catalog.tsx`,
  `bookings.tsx`, `ledger.tsx`, `incidents.tsx`, `analytics.tsx`, shared
  `layout.tsx`/`sidebar.tsx` which I DID already lightly reskin toward a dark
  glass look earlier this session — that work is now superseded by this
  light-redesign direction and will need redoing) — none of these have been
  touched for the redesign yet. They're all still on the old dark theme.

## Explicit scope reiteration from the user (2026-08-20, second time)

> "remember this must be done for all pages. not just the main marketing
> landing page. and i mean all pages. plus the routes and the layout of the
> other pages must be professional and pristine."

Do not stop at landing/login. Every page listed in the "Status" section
above as untouched needs the same redesign treatment, AND their routing/
layout structure should be cleaned up to be "professional and pristine" —
this may mean more than a color swap on some pages (e.g. the duplicated
`providerRouter` mount in `artifacts/api-server/src/routes/index.ts` noted
elsewhere, or any page whose route nesting/shell structure is awkward)
should be tidied up as part of this pass, not just restyled in place.

## Confirmed structural bug: two competing navigation shells

User reported: clicking "Services" mid-session flips the whole page from a
sidebar layout to a top navbar layout. Root cause confirmed by inspection —
**this is not a one-off, it's systemic**:

- `artifacts/loup/src/components/platform-shell.tsx` — `PlatformShell`, a
  **left sidebar** layout, used by the four portal pages (`employee.tsx`,
  `employer.tsx`, `vendor.tsx`, `operations.tsx`).
- `artifacts/loup/src/components/shell.tsx` — `Shell`, a **top navbar**
  layout (nav items: Home/Catalog/Bookings/The Pack/Billing), used by the
  original consumer/"RightNow" pages (`home.tsx`, `browse.tsx`, `book.tsx`,
  `bookings.tsx`, `household.tsx`, `billing.tsx`, `provider-profile.tsx`,
  `booking-detail.tsx` — see the `*Route` wrapper functions in `App.tsx`,
  each hand-wraps its page in `<Shell>...</Shell>`).
- The Employee portal's "Services" link (`employee.tsx`, multiple places,
  e.g. line 88/189/342) points to `/browse`, which is a `Shell`-wrapped
  (navbar) page — so a user in the sidebar-based Employee portal clicks one
  link and the entire chrome swaps to a different layout system. Same
  applies to any other portal→consumer-flow link (booking flows, etc.).

**This is precisely the "two navigation systems never merged after the
RightNow→Loup B2B2C pivot" issue the PRPD alludes to (§1.2: "the
consumer-surface endpoints... remain in the API and still power the consumer
flows"** — but their FRONTEND shell was apparently never reconciled with the
newer portal shell when the product pivoted). Fixing this properly means
picking ONE shell system (almost certainly `PlatformShell`, sidebar, since
it's the newer/primary one used by all 4 real portals) and either:
(a) making the consumer flow pages (`browse`, `book`, `bookings`,
`household`, `billing`, `provider-profile`, `booking-detail`) render inside
`PlatformShell` instead of the legacy `Shell` when reached from the employee
portal, or (b) merging `Shell`'s nav items into `PlatformShell` as the
employee role's nav set and retiring `Shell` entirely. **(b) is almost
certainly correct** — there's no real product reason for the employee's own
booking/catalog/household/billing pages to look different from their own
dashboard. This is a **required fix**, not just a restyle — same underlying
change needed regardless of which visual theme (Zelt or Swap) ends up on
top.

## `Shell` component detail (for the merge-into-`PlatformShell` fix)

Read in full: `artifacts/loup/src/components/shell.tsx` (107 lines). Exact
structure to fold into `PlatformShell`'s employee nav when doing the merge:

- Nav items: `Home /`, `Catalog /browse`, `Bookings /bookings`, `The Pack
  /household`, `Billing /billing` (icons: Home, Search, Calendar, Users,
  FileText from lucide-react).
- Has its own `ThemeToggle` sub-component (sun/moon icon button using
  `useTheme()` from `@/hooks/use-theme` — **this hook exists and already
  drives a working light/dark toggle mechanism**; worth checking whether it's
  reusable/extendable for the Zelt/Swap toggle instead of building a new one
  from scratch).
- Unread "Pack" badge count sourced from `useGetHomeSummary().packUnreadCount`
  — this badge behavior needs to carry over into `PlatformShell`'s merged nav.
- Desktop: top bar, h-20, logo left + inline nav with active-state
  bottom-border, theme toggle right. Mobile: separate top header (logo +
  toggle only) AND a separate fixed bottom tab bar (icon+label, active state
  colored). `PlatformShell` should be checked for whether it already has
  equivalent responsive mobile nav — if not, that needs building too as part
  of "professional and pristine," not just merging desktop nav items.
- Content width logic: `max-w-[1600px]` on `/` and `/bookings*` routes, else
  `max-w-3xl` — this per-route width variance should probably be preserved
  or intentionally simplified (not silently dropped) when merged.
- Uses `.ambient-field` and `.glass-nav` utility classes (dark-theme-era —
  will need Zelt-appropriate replacements per the token work above).

**Next concrete step**: read `platform-shell.tsx` in full (was read earlier
this session during the P1-12 loup-admin work but not re-read since) to see
its current nav-item model per role, then design the merge: add an
`employee` nav-item set to `PlatformShell` covering Home/Catalog/Bookings/
Household/Billing, update `App.tsx`'s `*Route` wrapper functions
(`HomeRoute`, `BrowseRoute`, `BookRoute`, `BookingsRoute`,
`BookingDetailRoute`, `HouseholdRoute`, `BillingRoute`,
`ProviderProfileRoute`) to wrap with `PlatformShell` instead of `Shell`, then
delete `shell.tsx` once nothing imports it. Grep
`from "@/components/shell"` / `from '@/components/shell'` across
`artifacts/loup/src` to find every remaining usage before deleting.

## `platform-shell.tsx` detail — read in full, merge plan now concrete

Read `artifacts/loup/src/components/platform-shell.tsx` (177 lines). Key findings:

1. **`navByRole.employee` already lists `/browse`, `/bookings`, `/household`
   as nav targets** (`{ href: "/employee", label: "My benefit" }, { href:
   "/browse", label: "Services" }, { href: "/bookings", label: "Bookings" },
   { href: "/household", label: "Household" }`). So `PlatformShell`'s own
   sidebar ALREADY assumes these pages render inside it — the bug is purely
   that `App.tsx` wraps those pages in the wrong shell (`Shell` instead of
   `PlatformShell`). **This confirms the fix is exactly**: in `App.tsx`,
   change `BrowseRoute`, `BookRoute`, `BookingsRoute`, `BookingDetailRoute`,
   `HouseholdRoute`, `BillingRoute`, `ProviderProfileRoute` to wrap with
   `<PlatformShell role="employee">...</PlatformShell>` instead of
   `<Shell>...</Shell>`.
2. **Missing nav item**: `navByRole.employee` has no "Billing" entry (Shell's
   nav did: `/billing`). Add `{ href: "/billing", label: "Billing", icon:
   FileText }` to `navByRole.employee` as part of the merge.
3. `PlatformShell` already has its own `ThemeButton` (duplicate of `Shell`'s
   `ThemeToggle`, same `useTheme()` hook from `@/hooks/use-theme` — confirms
   one real shared toggle mechanism already exists app-wide; only one copy of
   the button needs to survive after `Shell` is deleted).
4. `PlatformShell` takes a `role: "employee"|"institution"|"provider"|"admin"`
   prop and picks nav items + role-accent color from `roleMeta`/`navByRole`
   — the merge just needs the consumer-flow pages to pass `role="employee"`.
5. **High-leverage shared components in this same file, also exported and
   used across every portal detail page**: `PlatformHeader` (page title/
   kicker/description header), `StatTile` (the stat-card grid unit used
   everywhere), `DataState` (loading/error/empty wrapper used everywhere).
   All three are heavily dark-theme-hardcoded (`text-white/40`, `glass-card`,
   `platform-reveal` glow effects, etc.) — **fixing these 3 components' theme
   once cascades the redesign to every portal page that uses them**, same
   leverage trick already used successfully on `loup-admin`'s shared `Card`
   component earlier this session. Do this BEFORE hand-redesigning individual
   portal pages one by one — much higher leverage.

**Concrete next steps, in order:**
1. In `App.tsx`: swap `Shell` → `PlatformShell role="employee"` on the 7
   `*Route` wrapper functions listed above. Remove the now-unused `Shell`
   import once done. Add the Billing nav item to `navByRole.employee` in
   `platform-shell.tsx`.
2. Grep `from "@/components/shell"` across `artifacts/loup/src` to confirm
   nothing else imports the old `Shell` — then delete
   `artifacts/loup/src/components/shell.tsx` entirely.
3. Full `pnpm run typecheck` + build, then live-check in browser that
   clicking "Services"/"Bookings"/"Household"/Billing from the employee
   portal now stays inside the sidebar shell (this was the user's literal
   bug report — verify it's actually fixed before moving on).
4. Only then move to re-theming `PlatformShell` + `PlatformHeader` +
   `StatTile` + `DataState` to Zelt (after tokens are promoted per the
   earlier section) — this is the high-leverage redesign step that cascades
   to every portal page at once.

## Shell merge — DONE, verified live

Executed exactly per the plan above: `App.tsx`'s 8 route wrapper functions
now use `<PlatformShell role="employee">` instead of `<Shell>` (including the
two `BookServiceDeepLink` fallback renders); added `Billing` to
`navByRole.employee` in `platform-shell.tsx` (with the `FileText` icon
import added); confirmed no remaining imports of `@/components/shell`
anywhere; deleted `artifacts/loup/src/components/shell.tsx`. Full repo
typecheck clean, both `loup` and `api-server` build clean. **Live-verified in
a real browser (Playwright)**: logged in as employee, clicked
Services→Bookings-adjacent nav items (Services, Household, Billing) from the
sidebar — shell stays consistent the whole time, correct active-state
highlighting, real data loads on each page, zero console errors. The
literal bug the user reported ("I press on services... whole layout changes
from sidebar to navbar") is confirmed fixed.

## Token promotion — DONE (loup + loup-admin), platform-shell.tsx — DONE

`artifacts/loup/src/index.css` `:root`/`.dark` now carry the full Zelt
palette (Soft Stone bg, Canvas Cloud cards, Amber Glow primary, 12px
radius, Inter-only). `artifacts/loup-admin/src/index.css` was rewritten to
mirror it exactly (same HSL values, same utility classes), replacing its
old dark-glassmorphism `:root` — this was still fully dark before this
pass, confirmed by reading the file. Both `.dark` blocks intentionally
mirror `:root` (no divergence) so a stray `dark` class can't reintroduce
the old black theme.

`artifacts/loup/src/components/platform-shell.tsx` — all 4 exported
components (`PlatformShell`, `PlatformHeader`, `StatTile`, `DataState`)
re-themed: every `text-white/*`, `bg-white/*` / `bg-[hsl(0_0%_100%/...)]`,
`border-white/*` / `border-[hsl(0_0%_100%/...)]` literal replaced with the
semantic tokens (`text-foreground`, `text-muted-foreground`, `bg-card`,
`bg-secondary`, `border-border`). `StatTile`'s white neon `drop-shadow`
glow removed (doesn't make sense on a light card). Retry button in
`DataState` changed from `bg-white text-black` to `bg-primary
text-primary-foreground`. Verified: `grep` for the literal patterns in
this file now returns nothing; full `loup` typecheck clean; `loup` build
clean (`PORT=3001 BASE_PATH=/ pnpm run build`); live Playwright screenshot
of `/`, `/login`, `/employee` — shell, header, nav, login role cards, and
landing all render correctly in Zelt light style, zero console errors.

**Confirmed real bug found via the `/employee` screenshot**: the page
*content* (not the shell) is still full of the same hardcoded
`text-white`/`bg-white/5`/`border-white/10` literals — e.g. the allowance
progress bar and the "next booking" card render as invisible white-on-white
against the new light card background. This is `employee.tsx` specifically
but the same literal patterns are near-certainly present in every other
untouched page (confirmed via grep count below). This is the same class of
bug as the shell, just page-by-page instead of shared-component — expect
every one of these pages to look broken until fixed:

`artifacts/loup/src/pages/`: api-docs, billing, book, booking-detail,
bookings, browse, embed-demo, employee, employer, home, household,
operations, provider-profile, support, vendor, not-found — 16 files, all
still on the old dark literals as of this note. (`landing.tsx` and
`login.tsx` were rewritten clean earlier and are NOT in this list.)

`artifacts/loup-admin/src/`: `card.tsx`, `layout.tsx`, `sidebar.tsx` were
touched in an earlier *dark* glassmorphism polish pass (pre-Zelt-pivot) —
now that `index.css` tokens are light, these need the same literal-class
sweep. Pages: analytics, bookings, catalog, incidents, institutions,
ledger, overview, providers, not-found — all still dark-styled.

## If continuing this cold in a new session

1. Read this file fully first — token promotion and shell are DONE, do not
   redo them.
2. The remaining work is the mechanical page-by-page sweep listed above:
   for each file, replace `text-white/NN` → `text-foreground` (bare) or
   `text-muted-foreground` (dimmed variants, roughly `/60` and below),
   `bg-white/NN` → `bg-secondary` (or `bg-muted` for skeletons),
   `border-white/NN` → `border-border`, `hover:text-white` →
   `hover:text-foreground`, `hover:bg-white/NN` → `hover:bg-secondary` or
   `hover:bg-muted`, drop any `drop-shadow-[...rgba(255,255,255...)]` glow
   entirely. Use the diff already applied to `platform-shell.tsx` as the
   canonical reference for the mapping — do not reinvent it per file.
   Preserve every `data-testid`, all logic, all conditional rendering —
   this is a class-literal swap only, never a structural change.
3. After each batch of files, `grep -rn "text-white/\|bg-white/\|border-white/\|hsl(0_0%_100%/" <paths>` to confirm zero remaining hits, then run a full-repo `pnpm run typecheck` and both apps' builds before considering it done.
4. Re-verify landing/login against the full-page reference for sizing/padding
   before calling either fully done — don't repeat the "not good enough"
   miss twice.
5. Build the theme toggle + Swap theme only after Zelt is solid everywhere
   (all pages in both apps pass the grep in step 3).

## Full page-by-page sweep — DONE, verified live (all pages, both apps)

Dispatched 7 parallel forks (each inheriting this file's context) to sweep
every remaining file in the "expect broken" list above. Summary of what
they found/fixed:

- **loup pages A** (employee, home, browse, book, booking-detail): fixed.
  `employee.tsx` was the worst offender (the one visibly broken in the
  earlier screenshot) — allowance progress bar, upcoming-booking card,
  allocation section, services grid, routines all swept. One
  intentional literal left: `bg-white/20` icon chip inside a solid
  `bg-primary` ETA card in `booking-detail.tsx:153` — correct as-is
  (white-on-amber, same exception class as gradient badges).
- **loup pages B** (bookings, household, billing, provider-profile): fixed.
  `household.tsx` was the largest (~35 replacements — Benefit Advisor
  chat, notifications toggle, activity feed). `provider-profile.tsx`
  was already clean.
- **loup pages C** (employer, vendor, operations — the 3 big portal
  dashboards): fixed, ~35/~35/~7 replacements respectively. Two
  bugs the blanket mapping would have introduced, caught and fixed
  manually by the fork: (1) `vendor.tsx` Submit button — orange solid
  bg, `text-white` needed to stay `text-white`, not become
  `text-foreground`; (2) `employer.tsx` allowance bar track vs. fill
  segment both mapped to `bg-muted` would have made the fill invisible
  against its own track — fixed to `border` (track) / `muted-foreground/25`
  (fill) for real contrast. **Note for later**: `--primary` and
  `--platform-brass` are the same HSL value in `index.css`, so
  "Redeemed" vs "Reserved" bars in the employer allowance breakdown
  render identically — cosmetic, not urgent, token-file decision from
  an earlier step.
- **loup pages D** (api-docs, embed-demo, support, not-found): already
  clean, zero edits — these were built on tokens from the start.
  `embed-demo.tsx:49` has a near-Soft-Stone-but-not-exact hardcoded
  `bg-[#e9dfcf]` — minor, not fixed, noted for later. Also:
  `platform-grid`/`platform-surface` classes referenced in 3 files
  aren't defined anywhere in `index.css` — dead/no-op classes from an
  earlier pass, noted for later, not touched.
- **loup-admin shared components** (card.tsx, layout.tsx, sidebar.tsx):
  `sidebar.tsx` had real dark literals (nav text/hover, footer user
  info, 3× border) — fixed. `card.tsx`/`layout.tsx` already clean.
- **loup-admin pages A** (overview, analytics, bookings, catalog):
  already all clean (shadcn/ui token-based from the start via
  Card/Badge/Button/Table). Flagged for a future visual spot-check,
  not touched: `analytics.tsx`'s Recharts stroke colors are saturated
  brand hex (not white/dark literals, should be fine on light).
- **loup-admin pages B** (incidents, institutions, ledger, providers,
  not-found): `not-found.tsx` used raw Tailwind grays
  (`bg-gray-50`/`text-gray-900`/`text-gray-600`/`text-red-500`) instead
  of tokens — fixed to `bg-background`/`text-foreground`/
  `text-muted-foreground`/`text-destructive` (would've broken under
  Swap). The other 4 were already clean.

**Central verification after all forks finished**: full-repo
`pnpm run typecheck` clean (6/6 workspace projects), `loup` build clean,
`loup-admin` build clean (`PORT=... BASE_PATH=/ pnpm run build` in each),
repo-wide grep for the literal patterns returns only the one intentional
exception noted above. Live Playwright pass across **all 4 `loup` roles**
(employee, household, institution, provider) **plus `loup-admin`
overview** — every page renders correctly in Zelt light style, real
data, zero console errors on any of them. Screenshots confirmed by eye:
employee dashboard, household requests/members, institution allowance
breakdown + campus cards, provider dashboard, admin platform overview —
all clean, consistent shell, no white-on-white anywhere found.

**Zelt rollout across both apps is now complete and verified.**

## PIVOT (2026-08-20): themes are landing-page-only; dashboards get a new neutral "Professional" system

User feedback after seeing the Zelt/Swap toggle live on the dashboards:
doesn't like either theme for the app chrome, wants a genuinely
professional dashboard look (Linear/Vercel/Stripe-style) across **every**
portal/dashboard page in both apps, and wants Zelt/Swap kept **only** on
the marketing landing page. Direct quote: "i would like a more
professional dashboard template across all pages. i only want the themes
on the landing pages."

**Architecture after the pivot:**
- `:root`/`.dark` in both `index.css` files are now the **Professional**
  palette — neutral cool-gray canvas (`--background: 240 5% 97%`), white
  cards, near-black text, one confident amber accent (`--primary: 32 95%
  44%`, darker/more saturated than Zelt's pale `#ffcd6d`), 8px radius
  (`--radius: 0.5rem`), no decorative serif (`--app-font-serif` aliases to
  Inter). Role accents desaturated to fit: `--platform-plum` is now a
  muted indigo (`243 47% 54%`), `--platform-mint` a muted emerald
  (`162 47% 40%`). This is the **only** look every dashboard page gets,
  permanently, no toggle.
- The former Zelt `:root` content was renamed to a `.theme-zelt` class;
  Swap's `.theme-swap` class is unchanged in content but is now applied to
  a **local wrapper div inside `landing.tsx` only** — never to
  `<html>`/`<body>`. Confirmed via Playwright:
  `document.documentElement.className` stays `""` while the toggle is
  clicked on the landing page.
- `landing.tsx` was rewritten from hardcoded hex constants (`STONE`,
  `INK`, `AMBER`, etc. + inline `style={{}}`) to fully token-driven
  Tailwind classes (`bg-background`, `bg-primary`, `text-foreground`,
  `rounded-lg`, etc.) — this was necessary because the old hex-literal
  version would have been completely unaffected by the theme classes.
  Local `useLandingTheme()` hook (in the same file) holds `"zelt" |
  "swap"` state, persists to `localStorage["loup-landing-theme"]`, and a
  small pill toggle sits in the nav (`data-testid="button-landing-theme-
  zelt"` / `-swap`). Headline/section headings use `font-serif`, which
  resolves to Inter in `.theme-zelt` and Playfair Display in
  `.theme-swap` — the Swap "key differentiator" (thin serif display type)
  comes for free from the existing font-alias mechanism built during the
  Zelt rollout, no extra markup needed. The Zelt-only decorative background
  orb is conditionally rendered (`theme === "zelt"`); Swap deliberately
  omits it for a cleaner, more product-focused hero per its spec. Footer
  uses `bg-[hsl(var(--platform-charcoal))]`, which is Deep Charcoal in
  Zelt and Deep Forest Green in Swap — both specs' dark accent-section
  color, automatically correct per theme via the same token.
- The global `ThemeProvider`/`useTheme` hook (`artifacts/loup/src/hooks/
  use-theme.tsx`) was **deleted** — no longer needed now that the toggle
  is local state in one component. `App.tsx`'s `<ThemeProvider>` wrap was
  removed. The stale pre-hydration FOUC script in `index.html` (which had
  a live bug — see below) was deleted entirely rather than updated, since
  a landing-only local toggle doesn't need document-level FOUC prevention.
- `ThemeButton` was removed from `platform-shell.tsx`'s dashboard header
  entirely — dashboards no longer expose a theme control.
- `loup-admin` has no landing page, so it was reverted to carrying
  **only** the Professional palette, permanently: deleted its
  `use-theme.tsx`, removed `<ThemeProvider>` from `App.tsx`, removed the
  `ThemeButton` from `sidebar.tsx`'s footer, removed the `.theme-swap`
  block from its `index.css` entirely (kept only `:root`/`.dark` =
  Professional).

**Bug found and fixed along the way**: `index.html`'s pre-hydration
inline script was a leftover from *before* the Zelt redesign — it read
the old `localStorage["loup-theme"]` key (which nothing writes to
anymore) and, critically, defaulted to **adding a `dark` class on every
single page load** (`var dark = stored !== "light"` — true whenever the
key is unset, which after the P1-12 key rename was always). This was
invisible today only because `.dark` mirrors `:root`'s colors, but it was
a live landmine: any future `.dark`-keyed style would have silently
reactivated a dark theme for every visitor by default. Caught via a
Playwright assertion (`document.documentElement.className` was `"dark"`
even after explicitly toggling back to Zelt). Fixed by deleting the
script outright as part of the pivot (see above) rather than patching it,
since it's no longer needed at all.

**Verified after the pivot**: full-repo `pnpm run typecheck` clean, both
apps' builds clean, zero remaining references to the deleted hooks
(grepped), live Playwright pass with zero console errors across all 4
dashboard roles (employee, household, institution, provider) + admin
overview + landing in both Zelt and Swap. Screenshots confirm the
dashboards now look like a coherent neutral SaaS admin (white cards,
gray canvas, amber accent used sparingly) with no theme toggle visible
anywhere in the chrome, and the landing page toggle genuinely reskins
(color, font, radius, shadow) between the two specs with the same
markup.

**Not yet done / possible follow-ups**: the Swap variant of the landing
page currently reuses the *same* section structure as Zelt (alert bar →
nav → hero → 3-card how-it-works → institution/widget → footer) restyled
via tokens, rather than building Swap's spec-distinct content blocks
(the huge gradient hero text, stat row, testimonial cards, dark CTA
form block, illustration-strip footer). That would be a substantially
larger, separate landing-page build — flag to the user if they want that
level of fidelity pursued further. Also not done: pixel-matching either
theme against the original reference screenshots (not available to
re-view in this session, worked from the written spec notes above
instead) — worth a direct side-by-side comparison with the user if they
still have those images handy.

## P1-14 (2026-08-20): landing pages built out fully + dashboard-wide frontend elevation

Two follow-up asks: "build out the Swap landing page fully. and the other
one too. all dashboards need to have a better frontend than their
existing."

### Landing pages — both now fully spec-distinct, not token-reskins of each other

Split `landing.tsx` into three files:
- `landing.tsx` — thin orchestrator: `theme` state (`"zelt" | "swap"`,
  persisted to `localStorage["loup-landing-theme"]`), renders
  `<LandingZelt>` or `<LandingSwap>`. Exports `LandingTheme` type.
- `landing-zelt.tsx` — full Zelt spec, extended beyond the earlier P1-13
  version: added an FAQ accordion section (using the existing
  `@/components/ui/accordion.tsx`) and rebuilt the footer to the full
  spec — big light headline + amber CTA, hairline divider, 4-column link
  footer (brand+social icons, Product/Resources/Legal), and a decorative
  (non-scanning, clearly labeled) QR-pattern block. Section padding
  bumped to `py-28` to read "airy" per spec's 96-160px note.
- `landing-swap.tsx` — genuinely different content, built by a fork
  against a full written brief: white nav with theme toggle → pale-mint
  hero with a thin serif headline (one span uses the spec's "Agentic
  Gradient" teal→green via `background-clip: text`) → a browser-chrome-
  framed illustrative dashboard mock (not a fake `<img>`) → logo cloud
  (the app's 2 real seeded tenants + 3 plausible fictional UAE schools,
  text-only wordmarks) → 3-up shadow-card feature grid → thin-numeral
  stat row (22 categories / 90-day pilot / 100% vetted) → alternating
  Deep-Forest/light testimonial cards (fictional personas at the real
  tenants, gradient-block "avatars" instead of fake photos) → blog card
  row → dark Deep-Forest CTA block with a real non-submitting demo-
  request form (`useToast` confirmation on submit) → footer with a
  decorative SVG wave (stand-in for the spec's illustration strip) +
  the same 4-column link structure as Zelt's footer.
- Both variants share the toggle pill component (`data-testid="button-
  landing-theme-zelt"` / `-swap"`) and the two hero CTA testids
  (`button-hero-get-started`, `link-hero-widget-preview`) so automation
  hooks are consistent across themes.

### Dashboard-wide frontend elevation

Dispatched parallel forks (employee/browse/book · bookings/booking-
detail/household/billing · employer/provider-profile · vendor/operations
· loup-admin overview/analytics/bookings/catalog · loup-admin
incidents/institutions/ledger/providers) across both apps' dashboard
pages, all constrained to presentation-layer-only changes (no new API
calls, no dropped data-testids, no design-token changes) using the
existing `recharts` + `@/components/ui/chart.tsx` (shadcn wrapper),
`table.tsx`, `badge.tsx`, `progress.tsx`, `tabs.tsx` — all already
dependencies, no new packages added. Highlights:
- **Real charts replacing hand-rolled `<div style={{width}}>` bars**:
  employee.tsx's allowance progress (now a segmented bar with tooltips),
  employer.tsx's Redeemed/Reserved/Remaining (now a donut + legend) and
  Category mix (now a horizontal bar chart — this also fixed the
  card-width overflow bug flagged in an earlier screenshot review),
  billing.tsx's Spend-by-Member/Category (now bar charts + a real
  `Table` for line items), vendor.tsx's Demand-by-service/day, admin's
  Ledger tab (Authorized/Reserved/Redeemed/Released comparison bar).
- **Real tables**: employer.tsx's roster, billing.tsx's line items —
  migrated from loose divs to `@/components/ui/table.tsx` + `Badge`.
- **loup-admin's `analytics.tsx`** already had solid recharts usage but
  ran an unrelated indigo/violet/fuchsia palette — retinted to the
  platform's actual amber/indigo/emerald role-accent tokens for
  cohesion. `catalog.tsx` migrated from raw `@radix-ui/react-tabs` to
  the shared `Tabs` wrapper; added a missing empty state.
- **Filled real content gaps**: vendor.tsx had a large empty area below
  the Performance card (flagged in an earlier screenshot review) — now
  shows a "Needs your attention" pending-orders list using data already
  fetched via an existing hook (no new API calls).
- Not touched, by design: `operations.tsx`'s and other pages' raw
  `<table>` markup in several tabs — a fork judged migrating those a
  cosmetic-only swap with real regression risk (custom padding/zebra-
  striping) rather than genuine improvement, so left as-is; flagged for
  a future pass if wanted. `catalog.tsx` has `useCreateService`/
  `useUpdateService` imported but no UI wired to them — a real
  functionality gap, not a presentation one, intentionally not built
  (out of scope for a presentation-layer pass).

### Shared shell components (done directly, not via fork)

- `artifacts/loup/src/components/platform-shell.tsx`: tightened radii
  from the friendly marketing-page scale (`rounded-xl`/`rounded-2xl`,
  12-16px) down to `rounded-lg`/`rounded-md` (driven by `--radius`,
  8px in the Professional palette) throughout the sidebar, nav items,
  and cards — this was still using Zelt-era chunky radii even after the
  P1-13 token pivot. `StatTile` gained an optional `trend` prop (small
  colored up/down delta badge, e.g. "+12%") — additive, not used by any
  existing caller yet, available for future pages. `StatTile`'s value
  now renders `font-sans font-semibold tabular-nums` instead of
  `font-serif` (decorative serif has no place in the dashboard chrome
  now that Zelt/Swap are landing-only).
- `artifacts/loup-admin/src/components/sidebar.tsx`: same radius
  tightening; exported `navLinks` (was previously a local const) so
  `layout.tsx` could reuse it.
- `artifacts/loup-admin/src/components/layout.tsx`: **added a header
  bar** — this app previously had none at all (just sidebar + raw
  `<main>`), a real parity gap vs. `loup`'s `PlatformShell` header. New
  sticky header shows the date + current page label (derived from
  `navLinks`) and an admin avatar, mirroring `loup`'s header pattern.
  (First attempt included a "Read the API" link pointing at `/api-docs`
  — caught in typecheck that no such route exists in this app's router,
  that's a `loup`-only route; removed rather than link somewhere fake.)

### Verified

Full-repo `pnpm run typecheck` clean (6/6 workspace projects), both
apps' builds clean (`loup`'s JS bundle grew ~717KB → ~1.17MB from
recharts now being used across many pages — a one-time cost, expected,
not per-page-additive). Live Playwright sweep across employee, browse,
bookings, household, billing, institution, provider (+ Analytics tab),
admin/operations, loup-admin overview + analytics + catalog, and landing
in both Zelt and Swap (scrolled through the full page) — zero console
errors on every single page.
