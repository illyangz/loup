# Memory Index

- [Orval Zod version detection](orval-zod-detection.md) — codegen emits Zod v4 API unless the api-spec package itself declares zod; keep `zod: catalog:` in its devDependencies.
- [Loup demo reset](loup-demo-reset.md) — re-run the seed to restore pristine demo state; all seed dates are relative to now.
- [Orval query options](orval-query-options.md) — generated hooks require an explicit queryKey whenever query options (enabled, refetchInterval) are passed.
- [Web Push setup](web-push-setup.md) — VAPID keys auto-generated & stored in push_config table; don't regenerate or all subscriptions break.
- [Schema/codegen drift](schema-and-codegen-drift.md) — "no exported member" or missing-column 500s mean run codegen in lib/api-spec and drizzle push in lib/db.
