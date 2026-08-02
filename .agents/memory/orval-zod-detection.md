---
name: Orval Zod version detection
description: Why codegen emitted Zod v4 calls against the v3 package, and the fix
---

Orval's zod plugin decides between Zod v3 and v4 output by resolving the installed `zod` version **from the package where orval runs** (`lib/api-spec`). If that package has no `zod` dependency, detection fails and Orval defaults to v4-style output (`zod.int()`, etc.), which does not typecheck against the workspace's zod 3.25.x (whose plain `zod` entry is the v3 API; the v4 API lives at `zod/v4`).

**Rule:** keep `"zod": "catalog:"` in `lib/api-spec/package.json` devDependencies. With it present, Orval detects 3.25.x and emits v3-compatible code.

**Why:** first codegen run failed typecheck with many TS2339 `.int` errors in `lib/api-zod/src/generated/api.ts`; adding the dep fixed it with zero config changes.

**How to apply:** if generated zod code ever shows `zod.int(` or fails typecheck after an orval upgrade, check zod resolution from `lib/api-spec` first — do not hand-edit generated files or add tsconfig path hacks.
