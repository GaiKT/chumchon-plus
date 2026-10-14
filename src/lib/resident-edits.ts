import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { withVillage, type Tx } from "@/db";
import { auditLogs, households, persons } from "@/db/schema";
import type { HouseholdFormValues, PersonFormValues } from "./resident-fields";

export type Actor = { id: string; villageId: string };

const isUuid = (id: string) => z.uuid().safeParse(id).success;

type AuditEntry = {
  action: "create" | "update" | "delete" | "restore";
  tableName: "households" | "persons";
  recordId: string;
  changes: Record<string, [unknown, unknown]>;
};

/** Fields whose value differs, as { field: [old, new] }. */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, [unknown, unknown]> {
  const changes: Record<string, [unknown, unknown]> = {};
  for (const [field, value] of Object.entries(after)) {
    const oldValue = before[field] ?? null;
    const newValue = value ?? null;
    if (oldValue !== newValue) changes[field] = [oldValue, newValue];
  }
  return changes;
}

/** Writes an audit row in the same transaction as the change it describes. */
export async function recordAudit(tx: Tx, actor: Actor, entry: AuditEntry) {
  await tx.insert(auditLogs).values({ villageId: actor.villageId, userId: actor.id, ...entry });
}

export type HouseholdUpdateResult = "saved" | "notFound" | "duplicateHouseNo";

export async function updateHousehold(
  actor: Actor,
  id: string,
  values: HouseholdFormValues,
): Promise<HouseholdUpdateResult> {
  if (!isUuid(id)) return "notFound";
  return withVillage(actor.villageId, async (tx) => {
    const [before] = await tx
      .select({ houseNo: households.houseNo, zone: households.zone, note: households.note })
      .from(households)
      .where(and(eq(households.id, id), isNull(households.deletedAt)));
    if (!before) return "notFound";

    const [duplicate] = await tx
      .select({ id: households.id })
      .from(households)
      .where(
        and(eq(households.houseNo, values.houseNo), ne(households.id, id), isNull(households.deletedAt)),
      );
    if (duplicate) return "duplicateHouseNo";

    const changes = diffFields(before, values);
    if (Object.keys(changes).length === 0) return "saved";

    await tx.update(households).set(values).where(eq(households.id, id));
    await recordAudit(tx, actor, { action: "update", tableName: "households", recordId: id, changes });
    return "saved";
  });
}

export type PersonUpdateResult = "saved" | "notFound" | "householdNotFound";

export async function updatePerson(
  actor: Actor,
  id: string,
  values: PersonFormValues,
): Promise<PersonUpdateResult> {
  if (!isUuid(id)) return "notFound";
  return withVillage(actor.villageId, async (tx) => {
    const [before] = await tx
      .select({
        householdId: persons.householdId,
        title: persons.title,
        firstName: persons.firstName,
        lastName: persons.lastName,
        nickname: persons.nickname,
        relationToHead: persons.relationToHead,
        birthDate: persons.birthDate,
        phone: persons.phone,
        note: persons.note,
      })
      .from(persons)
      .where(and(eq(persons.id, id), isNull(persons.deletedAt)));
    if (!before) return "notFound";

    const moved = values.householdId !== before.householdId;
    if (moved) {
      const [target] = await tx
        .select({ id: households.id })
        .from(households)
        .where(and(eq(households.id, values.householdId), isNull(households.deletedAt)));
      if (!target) return "householdNotFound";
    }

    const changes = diffFields(before, values);
    if (Object.keys(changes).length === 0) return "saved";

    await tx.update(persons).set(values).where(eq(persons.id, id));
    if (moved) {
      // Someone who moves out of a house can no longer be its head.
      await tx
        .update(households)
        .set({ headPersonId: null })
        .where(and(eq(households.id, before.householdId), eq(households.headPersonId, id)));
    }
    await recordAudit(tx, actor, { action: "update", tableName: "persons", recordId: id, changes });
    return "saved";
  });
}

export async function getHouseholdForEdit(villageId: string, id: string) {
  if (!isUuid(id)) return null;
  return withVillage(villageId, async (tx) => {
    const [row] = await tx
      .select({ id: households.id, houseNo: households.houseNo, zone: households.zone, note: households.note })
      .from(households)
      .where(and(eq(households.id, id), isNull(households.deletedAt)));
    return row ?? null;
  });
}

export async function getPersonForEdit(villageId: string, id: string) {
  if (!isUuid(id)) return null;
  return withVillage(villageId, async (tx) => {
    const [row] = await tx
      .select({
        id: persons.id,
        householdId: persons.householdId,
        title: persons.title,
        firstName: persons.firstName,
        lastName: persons.lastName,
        nickname: persons.nickname,
        relationToHead: persons.relationToHead,
        birthDate: persons.birthDate,
        phone: persons.phone,
        note: persons.note,
      })
      .from(persons)
      .where(and(eq(persons.id, id), isNull(persons.deletedAt)));
    return row ?? null;
  });
}

/** Households a person can be moved to, by house number. */
export async function listHouseholdOptions(villageId: string) {
  return withVillage(villageId, (tx) =>
    tx
      .select({ id: households.id, houseNo: households.houseNo })
      .from(households)
      .where(isNull(households.deletedAt))
      .orderBy(asc(households.houseNo)),
  );
}
