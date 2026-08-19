# Loup — One-Pager

**Loup** is a UAE-first B2B2C lifestyle-benefits platform for the education sector. Schools and universities give staff a monthly allowance they spend on curated home and life services — childcare, physio, home cleaning, tutoring, elder care — coordinated end-to-end by Loup.

## The problem
- Teachers and school staff carry the emotional load of running a home while teaching. "Wellbeing" perks are posters, not help.
- Institutions waste budget on one-off wellness days that don't move retention.
- Existing benefit platforms are B2C marketplaces or HR perks — none coordinate **fulfilment** for the education sector in the UAE.

## The product
- **Employees** get an allowance (AED 400–750/mo by tier) and one tap to book vetted services; a personal coordinator confirms, a provider shows up.
- **Institutions** get governance: plans, tiers, roster sync, utilization analytics, and a single monthly invoice.
- **Providers** (DHA-licensed, vetted) get demand, scheduling, and settlement — Loup handles invoicing and payment.
- **Loup** earns a **hybrid fee**: a small SaaS base per eligible employee per month + a % of benefit spend (default 8%), configurable per benefit plan.

## The demo (Phase 0, working today)
- **Two tenants** live in one install: Meridian Education Group (60 employees, 3 tiers, 2 campuses) and Al Noor University (15 employees) — data fully isolated.
- **Signed-token login** across four portals: Employee, Institution, Provider, Loup Operations.
- **Full transaction lifecycle** in the webhook log: booking created → accepted → completed → payment → refund.
- **Fee line on screen**: "Loup platform fee" card in the institution portal; "Est. monthly platform revenue" (AED 747 for Meridian) in the ops console.
- **Embeddable widget**: two lines of HTML drops the employee benefit widget into any intranet or HR page.

## Business model
| Line | Mechanics |
|------|-----------|
| Platform fee | 8% of benefit spend redeemed + per-employee monthly fee (configurable per plan) |
| Example | Meridian: AED 334 monthly spend × 8% + 60 employees × AED 12 = **AED 747/mo per 60-employee school** |
| Top-ups (later) | Transaction margin on employee-funded top-ups (premium tier plan) |

## Pilot offer
Free 90-day pilot for 20–50 employees. Loup funds and coordinates provider fulfilment during the pilot; institution funds the allowance. Pilot goals: ledger reconciliation, provider quality, one full monthly cycle.

## Ask
A pilot with 2–3 UAE schools and an introductory network of vetted providers, in exchange for product feedback and a letter of intent (template provided).