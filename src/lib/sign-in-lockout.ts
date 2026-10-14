import { eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { users } from "@/db/schema";

export const MAX_FAILED_SIGN_INS = 5;
export const LOCK_MINUTES = 15;

// Note: only existing usernames get locked, so a locked response reveals that
// a username exists. Acceptable here: accounts are a handful of village staff
// and per-IP rate limiting still applies to every attempt.

/** Whether password sign-in is currently refused for this username. */
export async function isLocked(db: Db, username: string, now = new Date()): Promise<boolean> {
  const [user] = await db
    .select({ lockedUntil: users.lockedUntil })
    .from(users)
    .where(eq(users.username, username.trim().toLowerCase()));
  return Boolean(user?.lockedUntil && user.lockedUntil > now);
}

/**
 * Counts a wrong password. The fifth in a row locks the account for
 * LOCK_MINUTES and starts the count again. Done in one statement so
 * concurrent attempts cannot slip past the limit.
 */
export async function recordFailedSignIn(db: Db, username: string) {
  await db
    .update(users)
    .set({
      failedSignIns: sql`case when ${users.failedSignIns} + 1 >= ${MAX_FAILED_SIGN_INS} then 0 else ${users.failedSignIns} + 1 end`,
      lockedUntil: sql`case when ${users.failedSignIns} + 1 >= ${MAX_FAILED_SIGN_INS}
        then now() + make_interval(mins => ${LOCK_MINUTES}) else ${users.lockedUntil} end`,
    })
    .where(eq(users.username, username.trim().toLowerCase()));
}

export async function recordSuccessfulSignIn(db: Db, username: string) {
  await db
    .update(users)
    .set({ failedSignIns: 0, lockedUntil: null })
    .where(eq(users.username, username.trim().toLowerCase()));
}
