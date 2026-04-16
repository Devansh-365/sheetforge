import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

// No singleton: callers (apps/api, apps/worker, tests) own the lifecycle.
// Pass a test-scoped connection string in integration tests so each test
// suite gets its own isolated Postgres client.
export function createDb(connectionString: string) {
  const sql = postgres(connectionString);
  return drizzle(sql, { schema });
}

export type Db = ReturnType<typeof createDb>;
