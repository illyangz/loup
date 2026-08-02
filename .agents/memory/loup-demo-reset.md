---
name: Loup demo reset
description: How to restore pristine demo data after testing mutations
---

`pnpm --filter @workspace/scripts run seed` wipes and reseeds the entire Loup database. All seeded dates are computed **relative to now** (live en_route booking ~20 min out, in_progress physio session, open current-month statement), so the demo always looks alive regardless of when it runs.

**Why:** mutation testing (creating/advancing/cancelling bookings, paying the bill) permanently alters demo state; re-seeding is the intended reset, not manual cleanup.

**How to apply:** after exercising mutations via curl or UI experiments, re-run the seed before presenting to the user. Note: paying the open statement creates a fresh empty open statement — that is by design, not a bug.
