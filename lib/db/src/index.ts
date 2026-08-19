import { existsSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { Pool } from "pg";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

/**
 * Database selection:
 *  - If DATABASE_URL is set (Replit / Neon / production), use real Postgres via node-postgres.
 *  - Otherwise use PGlite: an embedded, file-backed Postgres that requires no server.
 *
 * The PGlite data directory defaults to <repo-root>/data/loup-pglite so that the
 * seed script and the API server always share the same database regardless of the
 * package they run from. Override with PGLITE_DATA_DIR.
 */

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
const pgliteDataDir =
  process.env.PGLITE_DATA_DIR ??
  path.join(repoRoot, "data", "loup-pglite");

const connUrl = process.env.DATABASE_URL;
const usePGlite = !connUrl;

export const pglite: PGlite | null = usePGlite
  ? new PGlite(pgliteDataDir)
  : null;

export const pool: Pool | null = connUrl ? new Pool({ connectionString: connUrl }) : null;

export type Database = NodePgDatabase<typeof schema> | PgliteDatabase<typeof schema>;

export const db: Database = usePGlite
  ? (drizzlePglite(pglite!, { schema }) as Database)
  : (drizzlePg(pool!, { schema }) as Database);

export async function closeDb(): Promise<void> {
  if (pool) await pool.end();
  if (pglite) await pglite.close();
}

export * from "./schema";