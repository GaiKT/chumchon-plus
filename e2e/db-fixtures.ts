import { and, eq, inArray } from "drizzle-orm";
import { createOwnerDb } from "@/db";
import { households, persons, users, villages } from "@/db/schema";
import { createUser } from "@/lib/users";
import { E2E, E2E_PASSWORD } from "./fixtures";

const usernames = [E2E.admin.username, E2E.superadmin.username];
const villageNames = [E2E.villageName, E2E.otherVillageName];

export async function removeFixtures() {
  const db = createOwnerDb();
  try {
    await db.delete(users).where(inArray(users.username, usernames));
    const ids = (
      await db.select({ id: villages.id }).from(villages).where(inArray(villages.name, villageNames))
    ).map((v) => v.id);
    if (ids.length > 0) {
      await db.update(households).set({ headPersonId: null }).where(inArray(households.villageId, ids));
      await db.delete(persons).where(inArray(persons.villageId, ids));
      await db.delete(households).where(inArray(households.villageId, ids));
      await db.delete(villages).where(inArray(villages.id, ids));
    }
  } finally {
    await db.$client.end();
  }
}

export async function createFixtures() {
  await removeFixtures();
  const db = createOwnerDb();
  try {
    const [a, b] = await db
      .insert(villages)
      .values(
        villageNames.map((name) => ({ name, mooNo: "9", subdistrict: "ทดสอบ", district: "ทดสอบ", province: "ทดสอบ" })),
      )
      .returning({ id: villages.id });

    for (const [villageId, resident] of [
      [a.id, E2E.resident],
      [b.id, E2E.otherResident],
    ] as const) {
      const [house] = await db
        .insert(households)
        .values({ villageId, houseNo: "1" })
        .returning({ id: households.id });
      await db.insert(persons).values({ villageId, householdId: house.id, ...resident });
    }

    const [emptyHouse] = await db
      .insert(households)
      .values({ villageId: a.id, houseNo: "2" })
      .returning({ id: households.id });
    await db.insert(persons).values({ villageId: a.id, householdId: emptyHouse.id, ...E2E.movedOut });

    await createUser(db, { role: "admin", villageId: a.id, ...E2E.admin, password: E2E_PASSWORD });
    await createUser(db, { role: "superadmin", ...E2E.superadmin, password: E2E_PASSWORD });
  } finally {
    await db.$client.end();
  }
}

/** Household id of a fixture resident, looked up as the owner (bypasses RLS). */
export async function householdIdOf(resident: { firstName: string; lastName: string }) {
  const db = createOwnerDb();
  try {
    const [row] = await db
      .select({ householdId: persons.householdId })
      .from(persons)
      .where(and(eq(persons.firstName, resident.firstName), eq(persons.lastName, resident.lastName)));
    return row.householdId;
  } finally {
    await db.$client.end();
  }
}
