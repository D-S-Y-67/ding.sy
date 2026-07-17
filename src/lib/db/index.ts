import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { requireEnvAtRuntime } from "../env";
import * as schema from "./schema";

/**
 * Postgres pool + Drizzle client. The pool is cached on globalThis so
 * Next.js dev-server hot reloads reuse connections instead of exhausting
 * the database's connection limit. Pool construction doesn't connect —
 * connections open lazily on first query — so the build-time placeholder
 * URL is never dialled.
 */
const globalForDb = globalThis as unknown as { dbPool?: Pool };

const pool =
  globalForDb.dbPool ??
  new Pool({
    connectionString: requireEnvAtRuntime(
      "DATABASE_URL",
      "postgresql://build:build@localhost:5432/build",
    ),
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.dbPool = pool;
}

export const db = drizzle(pool, { schema });
