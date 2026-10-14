import { and, inArray, isNotNull, lt, or } from "drizzle-orm";
import type { Db } from "@/db";
import { households, persons } from "@/db/schema";
import { RESTORE_DAYS } from "./resident-edits";

/**
 * Permanently removes records soft-deleted more than RESTORE_DAYS ago, in
 * every village. A purged household takes its remaining (former) members
 * with it. Runs as the table owner from a scheduled job, never from the app.
 */
export async function purgeDeleted(ownerDb: Db, now = new Date()) {
  const cutoff = new Date(now.getTime() - RESTORE_DAYS * 24 * 60 * 60 * 1000);

  return ownerDb.transaction(async (tx) => {
    const expiredHouseholds = (
      await tx
        .select({ id: households.id })
        .from(households)
        .where(and(isNotNull(households.deletedAt), lt(households.deletedAt, cutoff)))
    ).map((h) => h.id);

    const personFilter = or(
      and(isNotNull(persons.deletedAt), lt(persons.deletedAt, cutoff)),
      expiredHouseholds.length > 0 ? inArray(persons.householdId, expiredHouseholds) : undefined,
    );
    const expiredPersons = (await tx.select({ id: persons.id }).from(persons).where(personFilter)).map(
      (p) => p.id,
    );

    if (expiredPersons.length > 0) {
      // A household may still name a purged person as its head.
      await tx
        .update(households)
        .set({ headPersonId: null })
        .where(inArray(households.headPersonId, expiredPersons));
      await tx.delete(persons).where(inArray(persons.id, expiredPersons));
    }
    if (expiredHouseholds.length > 0) {
      await tx.delete(households).where(inArray(households.id, expiredHouseholds));
    }
    return { persons: expiredPersons.length, households: expiredHouseholds.length };
  });
}
