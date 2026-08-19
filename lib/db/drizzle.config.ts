import { defineConfig } from "drizzle-kit";
import path from "path";

const schemaPath = path.join(__dirname, "./src/schema/index.ts");

// Prefer a real Postgres connection when provided (Replit / Neon / production).
// Otherwise push against the embedded PGlite database — no server required.
const url = process.env.DATABASE_URL ?? process.env.PGLITE_DATA_DIR ?? path.join(__dirname, "../../data/loup-pglite");

export default defineConfig({
  schema: schemaPath,
  dialect: "postgresql",
  ...(process.env.DATABASE_URL ? {} : { driver: "pglite" as const }),
  dbCredentials: {
    url,
  },
});