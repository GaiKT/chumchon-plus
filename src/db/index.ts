import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { z } from "zod";
import * as schema from "./schema";

function createDb(connectionString: string | undefined) {
  if (!connectionString) {
    throw new Error("Database connection string is not set");
  }
  return drizzle({
    client: new Pool({ connectionString }),
    schema,
    casing: "snake_case",
  });
}

export type Db = ReturnType<typeof createDb>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// Reuse the pool across dev hot reloads.
const globalForDb = globalThis as unknown as { appDb?: Db };

/**
 * Connects as the application role, which is subject to row-level security.
 * Resident data is only visible inside withVillage.
 */
export function getDb(): Db {
  globalForDb.appDb ??= createDb(process.env.DATABASE_URL);
  return globalForDb.appDb;
}

/**
 * Connects as the table owner, which bypasses row-level security.
 * Only for CLI scripts that manage villages; never import from app code.
 */
export function createOwnerDb(): Db {
  return createDb(process.env.MIGRATION_DATABASE_URL);
}

const villageIdSchema = z.uuid();

/** Runs fn in a transaction scoped to one village via row-level security. */
export async function withVillage<T>(
  villageId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  const id = villageIdSchema.parse(villageId);
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.village_id', ${id}, true)`);
    return fn(tx);
  });
}
