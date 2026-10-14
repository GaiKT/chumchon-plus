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

async function findHousehold(tx: Tx, id: string) {
  const [row] = await tx
    .select({
      houseNo: households.houseNo,
      zone: households.zone,
      note: households.note,
      headPersonId: households.headPersonId,
    })
    .from(households)
    .where(and(eq(households.id, id), isNull(households.deletedAt)));
  return row ?? null;
}

async function houseNoTaken(tx: Tx, houseNo: string, exceptId?: string) {
  const [row] = await tx
    .select({ id: households.id })
    .from(households)
    .where(
      and(
        eq(households.houseNo, houseNo),
        isNull(households.deletedAt),
        exceptId ? ne(households.id, exceptId) : undefined,
      ),
    );
  return Boolean(row);
}

/** Current residents of a household, optionally leaving one person out. */
async function residentIds(tx: Tx, householdId: string, exceptId?: string) {
  const rows = await tx
    .select({ id: persons.id })
    .from(persons)
    .where(
      and(
        eq(persons.householdId, householdId),
        eq(persons.status, "resident"),
        isNull(persons.deletedAt),
        exceptId ? ne(persons.id, exceptId) : undefined,
      ),
    );
  return rows.map((r) => r.id);
}

async function setHead(tx: Tx, actor: Actor, householdId: string, from: string | null, to: string | null) {
  if (from === to) return;
  await tx.update(households).set({ headPersonId: to }).where(eq(households.id, householdId));
  await recordAudit(tx, actor, {
    action: "update",
    tableName: "households",
    recordId: householdId,
    changes: { headPersonId: [from, to] },
  });
}

export async function createHousehold(
  actor: Actor,
  values: Omit<HouseholdFormValues, "headPersonId">,
): Promise<{ id: string } | "duplicateHouseNo"> {
  return withVillage(actor.villageId, async (tx) => {
    if (await houseNoTaken(tx, values.houseNo)) return "duplicateHouseNo";
    const [created] = await tx
      .insert(households)
      .values({ villageId: actor.villageId, ...values })
      .returning({ id: households.id });
    await recordAudit(tx, actor, {
      action: "create",
      tableName: "households",
      recordId: created.id,
      changes: diffFields({}, values),
    });
    return created;
  });
}

export type HouseholdUpdateResult = "saved" | "notFound" | "duplicateHouseNo" | "invalidHead";

export async function updateHousehold(
  actor: Actor,
  id: string,
  values: HouseholdFormValues,
): Promise<HouseholdUpdateResult> {
  if (!isUuid(id)) return "notFound";
  return withVillage(actor.villageId, async (tx) => {
    const before = await findHousehold(tx, id);
    if (!before) return "notFound";
    if (await houseNoTaken(tx, values.houseNo, id)) return "duplicateHouseNo";
    if (values.headPersonId && !(await residentIds(tx, id)).includes(values.headPersonId)) {
      return "invalidHead";
    }

    const changes = diffFields(before, values);
    if (Object.keys(changes).length === 0) return "saved";

    await tx.update(households).set(values).where(eq(households.id, id));
    await recordAudit(tx, actor, { action: "update", tableName: "households", recordId: id, changes });
    return "saved";
  });
}

export async function createPerson(
  actor: Actor,
  values: PersonFormValues,
): Promise<{ id: string } | "householdNotFound"> {
  return withVillage(actor.villageId, async (tx) => {
    const household = await findHousehold(tx, values.householdId);
    if (!household) return "householdNotFound";

    const [created] = await tx
      .insert(persons)
      .values({ villageId: actor.villageId, ...values })
      .returning({ id: persons.id });
    await recordAudit(tx, actor, {
      action: "create",
      tableName: "persons",
      recordId: created.id,
      changes: diffFields({}, values),
    });
    return created;
  });
}

export type PersonUpdateResult = "saved" | "notFound" | "householdNotFound" | "needsNewHead";

/**
 * Saves a person. When the household head moves out, dies or changes house,
 * another current resident of that house must be named as the new head
 * (newHeadPersonId); if nobody else lives there, the house is left headless.
 */
export async function updatePerson(
  actor: Actor,
  id: string,
  values: PersonFormValues,
  newHeadPersonId: string | null = null,
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
        status: persons.status,
      })
      .from(persons)
      .where(and(eq(persons.id, id), isNull(persons.deletedAt)));
    if (!before) return "notFound";

    const moved = values.householdId !== before.householdId;
    if (moved && !(await findHousehold(tx, values.householdId))) return "householdNotFound";

    const oldHousehold = await findHousehold(tx, before.householdId);
    const leavesHousehold = moved || values.status !== "resident";
    if (oldHousehold?.headPersonId === id && leavesHousehold) {
      const remaining = await residentIds(tx, before.householdId, id);
      if (remaining.length > 0 && !(newHeadPersonId && remaining.includes(newHeadPersonId))) {
        return "needsNewHead";
      }
      await setHead(tx, actor, before.householdId, id, remaining.length > 0 ? newHeadPersonId : null);
    }

    const changes = diffFields(before, values);
    if (Object.keys(changes).length === 0) return "saved";

    await tx.update(persons).set(values).where(eq(persons.id, id));
    await recordAudit(tx, actor, { action: "update", tableName: "persons", recordId: id, changes });
    return "saved";
  });
}

export async function getHouseholdForEdit(villageId: string, id: string) {
  if (!isUuid(id)) return null;
  return withVillage(villageId, async (tx) => {
    const household = await findHousehold(tx, id);
    if (!household) return null;
    const residents = await tx
      .select({ id: persons.id, title: persons.title, firstName: persons.firstName, lastName: persons.lastName })
      .from(persons)
      .where(and(eq(persons.householdId, id), eq(persons.status, "resident"), isNull(persons.deletedAt)))
      .orderBy(asc(persons.firstName));
    return { id, ...household, residents };
  });
}

export async function getPersonForEdit(villageId: string, id: string) {
  if (!isUuid(id)) return null;
  return withVillage(villageId, async (tx) => {
    const [person] = await tx
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
        status: persons.status,
      })
      .from(persons)
      .where(and(eq(persons.id, id), isNull(persons.deletedAt)));
    if (!person) return null;

    // If this person is the head, offer the other residents as successors.
    const household = await findHousehold(tx, person.householdId);
    const successors =
      household?.headPersonId === id
        ? await tx
            .select({ id: persons.id, title: persons.title, firstName: persons.firstName, lastName: persons.lastName })
            .from(persons)
            .where(
              and(
                eq(persons.householdId, person.householdId),
                eq(persons.status, "resident"),
                isNull(persons.deletedAt),
                ne(persons.id, id),
              ),
            )
            .orderBy(asc(persons.firstName))
        : null;
    return { person, successors };
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
