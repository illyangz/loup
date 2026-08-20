import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Database selection:
 *  - If DATABASE_URL is set (Neon / any real Postgres), use Neon's HTTP
 *    driver. It's plain fetch() under the hood, so the exact same code path
 *    works whether this runs in Node (Render) or on Cloudflare Workers —
 *    unlike `pg`'s raw-TCP driver, which Workers can't use. Even against a
 *    non-Neon Postgres this driver still works over HTTP-via-Neon's proxy
 *    protocol only if the target *is* Neon; that's fine here since Neon is
 *    the only real-Postgres target this app deploys against.
 *  - Otherwise, lazily load PGlite: an embedded, file-backed Postgres that
 *    requires no server. Loaded dynamically (not statically imported) so
 *    its WASM bundle never ends up in the Workers build, which always sets
 *    DATABASE_URL and so never takes this branch.
 *
 * The PGlite data directory defaults to <repo-root>/data/loup-pglite so that
 * the seed script and the API server always share the same database
 * regardless of the package they run from. Override with PGLITE_DATA_DIR.
 */

const connUrl = process.env.DATABASE_URL;
const usePGlite = !connUrl;

export type Database = NeonHttpDatabase<typeof schema> | Awaited<ReturnType<typeof loadPglite>>["db"];

let pgliteCloser: (() => Promise<void>) | null = null;

async function loadPglite() {
  const [{ existsSync }, path, { PGlite }, { drizzle: drizzlePglite }] = await Promise.all([
    import("node:fs"),
    import("node:path"),
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
  ]);

  function findRepoRoot(start: string): string {
    let dir = start;
    for (let i = 0; i < 12; i++) {
      if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return start;
  }

  const repoRoot = findRepoRoot(process.cwd());
  const pgliteDataDir = process.env.PGLITE_DATA_DIR ?? path.join(repoRoot, "data", "loup-pglite");

  const pglite = new PGlite(pgliteDataDir);
  const db = drizzlePglite(pglite, { schema });
  pgliteCloser = () => pglite.close();
  return { db };
}

export const db: Database = usePGlite
  ? (await loadPglite()).db
  : drizzleNeon(neon(connUrl!), { schema });

export async function closeDb(): Promise<void> {
  if (pgliteCloser) await pgliteCloser();
}

export * from "./schema";
