---
name: Orval hooks need explicit queryKey with query options
description: Passing query options to generated react-query hooks requires supplying queryKey
---
When passing `{ query: { ... } }` options (refetchInterval, enabled, etc.) to orval-generated hooks, TypeScript requires an explicit `queryKey` — use the generated `get<Name>QueryKey()` helper.

**Why:** the generated types make queryKey required once options are provided; omitting it is a compile error.
**How to apply:** any `useX(params, { query: {...} })` call in artifacts/loup — add `queryKey: getXQueryKey(params)` inside the query options.
