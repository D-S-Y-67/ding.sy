import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { requireEnv } from "../env";
import * as schema from "./schema";

/**
 * Postgres pool + Drizzle client. The pool is cached on globalThis so
 * Next.js dev-server hot reloads reuse connections instead of exhausting
 * the database's connection limit.
 */
const globalForDb = globalThis as unknown as { dbPool?: Pool };

const pool =
  globalForDb.dbPool ??
  new Pool({
    connectionString: requireEnv("DATABASE_URL"),
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.dbPool = pool;
}

export const db = drizzle(pool, { schema });
