---
name: Schema and codegen drift after branch merges
description: Symptoms and fix when the DB or generated API client lags behind the OpenAPI spec / drizzle schema
---

Rule: if the web app fails typecheck with "no exported member" from `@workspace/api-client-react`, or the API server 500s with a "Failed query ... column does not exist"-style drizzle error, the generated client or database is behind the source of truth.

**Why:** Task branches update the OpenAPI spec and drizzle schema, but generated client code and the dev database don't update themselves.

**How to apply:** Run `pnpm run codegen` in `lib/api-spec` to regenerate the client, and `pnpm run push` (drizzle-kit push) in `lib/db` to sync the database, then restart the api-server workflow.
