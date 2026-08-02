---
name: Web Push setup
description: How Loup web push works — VAPID keys auto-generated and stored in DB, no env secrets needed.
---

The VAPID keypair is generated on first use by the API server and persisted in the `push_config` DB table, so no manual secret setup is required and subscriptions stay valid across restarts.

**Why:** avoids asking the user for keys and avoids regenerating keys (which would invalidate all existing browser subscriptions).

**How to apply:** never rotate/regenerate the row in `push_config` casually; deleting it invalidates every stored subscription. Stale endpoints (404/410) are auto-pruned on send. Push only works over the proxied HTTPS preview or the installed PWA; the in-app toggle registers the service worker on demand in dev.
