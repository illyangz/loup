# Loup — "Altitude" Design Reference

The canonical spec for the app-wide dark editorial design system, distilled
from `artifacts/loup/src/pages/landing.tsx` (the homepage) as the reference
implementation. Every other page in `loup` and `loup-admin` should read as
if it were built by the same hand as the homepage — same palette, same
type rhythm, same hover language, same animation vocabulary. This file is
what to hand a fresh set of eyes (or a fresh agent) before touching any
other page, so nobody re-invents a slightly-different button.

Palette/typography values below are also live as CSS custom properties in
`artifacts/loup/src/index.css` and `artifacts/loup-admin/src/index.css` —
dashboards consume them via the semantic Tailwind classes
(`bg-background`, `text-foreground`, `bg-card`, `border-border`,
`bg-primary`, `text-muted-foreground`, etc.), so most pages inherit this
system automatically. This doc exists for everything the token system
*doesn't* automate: typography choices, hover behavior, component shape,
and the GSAP animation vocabulary.

## Palette

| Role | Dark value | Light value | Token |
|---|---|---|---|
| Canvas (page bg) | `#181818` | `#f6f4ef` | `bg-background` |
| Foreground (primary text) | `#eeeeee` | `#17171a` | `text-foreground` |
| Card / surface | `#1f1f1f` | `#ffffff` | `bg-card` |
| Secondary surface (hover/fill) | `#262626` | `#ece7dd` | `bg-secondary` |
| Muted foreground | `#a4a19b` | `#6b6862` | `text-muted-foreground` |
| Border (hairline) | `#292929`-ish | `#e3ded4`-ish | `border-border` |
| Accent — the *only* chromatic color | `#2b7fff` | same | `bg-primary` / `text-primary` |
| Destructive | muted red `0 55% 52%` | `0 55% 48%` | `bg-destructive` / `text-destructive` |
| Anchor (always-dark sections — footers, terminal chrome) | `#111111` fixed | fixed | `--platform-charcoal` |

Dark is the default everywhere (landing page and every dashboard). Light
is opt-in via a toggle that adds a `.light` class to `<html>` — see
`hooks/use-theme.tsx` in both apps, wired into `PlatformShell`'s
`ThemeButton` (loup) and `Sidebar`'s `ThemeButton` (loup-admin). The
landing page's toggle is separate/local (`pages/landing.tsx`'s own
`useState`), scoped to that page only, since it predates the app-wide
toggle — both use the identical `.light`-class mechanism underneath.

**Role/section color-coding is retired.** Employee/institution/provider/
admin used to get distinct accent hues (amber/indigo/emerald). Now every
role accent token (`--platform-brass`, `--platform-plum`, `--platform-mint`)
resolves to the same blue. Distinguish sections by icon + label text, not
hue — this is a deliberate reading of the spec's "reserve chromatic color
for functional punctuation only" rule.

## Typography

Three families, each with one job — never mix them outside their lane.

- **Libre Baskerville** (`font-serif`) — page/section headlines *only*.
  Weight 400, never bold. Used for: `<h1>`/`<h2>` on every page, the
  `PlatformHeader` title, `DataState`'s empty-state heading. Sizes in
  practice: 28px (small section headers), 36px (standard section
  headers), up to `clamp(2.5rem,6vw,4.5rem)` for hero display type.
  Letter-spacing `-0.025em`, line-height 1.1–1.15.
- **Inter** (`font-sans`, the default) — everything else: nav, buttons,
  body copy, table cells, badges, captions, stat numbers (`tabular-nums`,
  never serif — numbers are data, not headlines).
- **Fira Code** (`font-mono`) — terminal/console chrome and data
  identifiers only (transaction IDs, code snippets, the `LedgerTerminal`/
  `LedgerTable` components). Letter-spacing `+0.02em` to `+0.1em`.

## Shape

- **Cards**: 8px radius (`rounded-lg`, which resolves to `--radius-lg`
  = `--radius` = `0.5rem`).
- **Buttons, badges, inputs, icon chips**: 4px (`rounded` or
  `rounded-sm`) — *rectilinear, not pill-shaped*. This was a real
  correction made mid-build: the earlier "Professional" system used
  `rounded-full` pills everywhere (nav badges, sign-out button, retry
  button, kicker badge); Altitude's spec explicitly rejects pill shapes
  ("Don't round corners above 16px — pill shapes would look foreign").
  When touching a page, look for stray `rounded-full` on anything that
  isn't a literal circle (avatar, status dot) and flatten it to `rounded`.
- **Avatars / status dots**: circular (`rounded-full`) is correct here —
  circles aren't "pills," they're a different shape language entirely and
  the spec doesn't object to them.
- **Borders over shadows**: a 1px `border-border` hairline is the primary
  structural device. Shadows, when used at all, are near-invisible
  (`rgba(51,51,51,0.05)`-style whispers via `.glass-card`) — never a
  0.2+ opacity drop shadow.

## Hover language

Consistent, minimal, no bounce/scale gimmicks:

- **Text links / nav links**: `opacity-70` on hover, no underline, no
  color change (`transition-opacity`).
- **Ghost buttons** (bordered, transparent bg — the primary CTA voice):
  background fills to `bg-secondary` on hover, border/text stay put.
  See the `GhostLink` pattern in `landing.tsx`.
- **Cards / icon tiles / chips**: `hover:-translate-y-0.5` (a 2px lift)
  combined with `border-color` shifting toward `hsl(var(--primary)/0.4)`.
  No shadow growth, no scale.
- **Icon-only buttons** (theme toggle, nav collapse, etc.): background
  fills to `bg-secondary`, icon/text color shifts from `text-muted-
  foreground` to `text-foreground`.

## Component patterns (copy these, don't reinvent)

- **NavBar**: bordered square logo mark (`border border-foreground`,
  4px radius, letter "L") + uppercase tracked wordmark
  (`uppercase tracking-[0.08em]`), plain-text nav links, a theme-toggle
  icon button, and either a plain text "Login"/"Sign out" link or the
  `GhostLink` CTA — never both a filled *and* a ghost button competing
  for attention in the same nav.
- **Page header** (`PlatformHeader` in `platform-shell.tsx`): small
  bordered kicker badge → serif `<h1>` → muted description line →
  optional action slot. Every dashboard page should route its header
  through this component rather than hand-rolling one.
- **Terminal window** (`TrafficLights` + `LedgerTerminal`/`LedgerTable`
  in `landing.tsx`): traffic-light dots, a Fira Code title bar, dark
  chrome that stays dark in both themes (it's chrome, not page content).
  Reuse this exact pattern anywhere the product needs to show "real
  system output" — API responses, webhook payloads, CLI-style summaries.
- **FAQ / accordion rows**: numbered index in Fira Code (`01`, `02`, …),
  serif-free question text, GSAP-animated height (see below), hairline
  `border-t` between rows, chevron rotates 180° on open.
- **Bottom CTA bar**: a single bordered card, serif headline left, one
  `GhostLink` right — the "one more nudge before the footer" pattern.
- **Footer**: always the fixed-dark anchor color regardless of the page
  theme (this is deliberate — mirrors a print masthead or a code
  terminal not following the reader's OS theme). Multi-column link
  layout: brand + social icons, then 2–3 link columns, then a copyright
  line with the dev-only "Reset demo data" button.

## GSAP animation vocabulary

`gsap` (with `gsap/ScrollTrigger`, registered once per app) is the
sitewide animation engine — no other animation library. Patterns already
built, reuse rather than inventing new ones.

### ⚠️ Never use `gsap.from()` / `tl.from()` — use `gsap.fromTo()` instead

A real, confirmed bug: `gsap.from(target, {opacity: 0, y: 18, ...})`
left elements with `opacity` correctly resolved to `1` but the
`transform` (the `y`/`x` offset) **permanently stuck at its start
value** — e.g. every card in a grid sitting at `translateY(18px)`
forever, never animating back to `0`. This is invisible by eye in most
cases (elements still fade in, so it *looks* like it worked) but it
silently shifted every "revealed" element from its true layout
position, which is what was breaking padding/gap symmetry across
several sections before it was traced to its root cause. It reproduced
consistently with `gsap.from()` and was fully fixed by switching to
`gsap.fromTo()` with an **explicit end state** (`{opacity: 1, y: 0}`).

**Rule: every tween in this app must be `gsap.fromTo()` (or
`tl.fromTo()` inside a timeline) with both the start AND end state
spelled out. Never `gsap.from()`. Never `tl.from()`.** If you're
reviewing or writing GSAP code anywhere in this app and see a bare
`.from(`, that's a bug — fix it before moving on.

### The shared hook — use this, don't hand-roll a new one

**`useReveal(ref, opts)`**, in `src/hooks/use-reveal.ts` (present in both
`loup` and `loup-admin` — identical file, kept in sync manually). Import
it (`import { useReveal } from "@/hooks/use-reveal"`) rather than
writing a local copy — landing.tsx and whitepaper.tsx used to each have
their own near-identical copy; that duplication is why the app.from()
bug had to be fixed in four places instead of one. Options:
- `opts.y` / `opts.x` — offset distance (px) for the fade+slide.
- `opts.stagger: true` — staggers the direct children instead of
  animating the wrapper as one block (grids: category tiles, integration
  icons, stat tiles).
- `opts.immediate: true` — fires on mount, no ScrollTrigger. Use for
  chrome that's always visible on load (a sidebar nav, a page header) —
  scroll-gating doesn't make sense there. Default (no `immediate`) is
  scroll-triggered, firing once the first time the element crosses 85%
  of the viewport — use for content further down a page.
- `opts.deps` — effect dependency array, for when the animation should
  re-run (e.g. `PlatformShell`'s nav re-plays its stagger when `role`
  changes).

Already wired in via this hook: `PlatformHeader` and `StatTile`
(`immediate: true`, a lighter on-mount version), `PlatformShell`'s and
`loup-admin`'s `Sidebar`'s nav stagger (`x: -8, stagger: true, immediate:
true`), `loup-admin`'s `Layout` main-content fade (`immediate: true`,
re-runs on route change).

### Other patterns (not covered by the shared hook — still `fromTo`, always)

- **Hero/page entrance**: a `gsap.timeline()` on mount staggering
  headline → subhead → CTA with ~0.4–0.5s overlap (`"-=0.4"` style
  offsets), `power2.out` easing, using `tl.fromTo()` for every step.
- **Accordion height**: never conditionally render/unmount the answer —
  always render it, animate `height` between `0` and `"auto"` with GSAP
  (GSAP resolves `"auto"` to the real measured height internally, no
  plugin needed) plus an `opacity` fade in parallel. See `FaqRow`. This
  is a `gsap.to()` call (single target state, not from/to), which is
  fine — the from/to rule is specifically about entrance reveals with an
  implicit "current" end state.
- **Bar/data-viz grow-in**: animate a bar's `height` (or `width`) from
  `"0%"` to its real value with `gsap.fromTo()`, staggered, gated by
  `ScrollTrigger`. See the Governance chart in `landing.tsx` — a function
  value per index (`height: (i) => \`${values[i]}%\``) is the clean way
  to map an array of real data values onto a staggered tween without
  duplicating the data.
- **Decorative SVG draw-in** (the hero ridge line): `getTotalLength()` +
  `strokeDasharray`/`strokeDashoffset` animated to `0` via `gsap.to(...,
  {strokeDashoffset: 0, ease: "power2.inOut"})` — this one's a plain
  `gsap.to()` since the "from" state (full dasharray offset) is set
  manually via `el.style` right before the tween, not inferred by GSAP.

## What this means when touching another page

1. Confirm the page already inherits the palette via semantic token
   classes (it almost certainly does — this was true before Altitude,
   true after). If you find a literal hex color, a `dark:` variant, or
   anything assuming a light background, fix it to a token.
2. Hunt for `rounded-full` on non-circular elements (buttons, badges,
   chips) and flatten to `rounded`/`rounded-sm`.
3. Route the page's title through `PlatformHeader` if it isn't already —
   that's where the serif treatment lives, you shouldn't need to add
   `font-serif` by hand elsewhere except a genuine one-off section
   header.
4. Add at least one `useReveal` on the page's main content block (and
   `stagger: true` on any grid/list) so the page doesn't feel static
   next to the homepage's motion.
5. Re-check every hover state against the language above — no bounce,
   no scale, no colored shadow glow.
