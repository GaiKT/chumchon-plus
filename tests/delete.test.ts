import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createOwnerDb, getDb, type Db } from "@/db";
import { auditLogs, households, persons, users, villages } from "@/db/schema";
import { getHousehold } from "@/lib/households";
import { purgeDeleted } from "@/lib/purge";
import {
  deleteHousehold,
  deletePerson,
  listDeleted,
  restoreHousehold,
  restorePerson,
  type Actor,
} from "@/lib/resident-edits";
import { createUser } from "@/lib/users";

const hasDb = Boolean(process.env.DATABASE_URL && process.env.MIGRATION_DATABASE_URL);

describe.skipIf(!hasDb)("delete, restore and purge", () => {
  let owner: Db;
  let actor: Actor;
  let otherVillage: string;
  let house: string;
  let emptyHouse: string;
  let head: string;
  let otherHouse: string;
  const username = `del_${Date.now().toString(36)}`;

  async function clearVillages() {
    const ids = [actor.villageId, otherVillage];
    await owner.delete(auditLogs).where(inArray(auditLogs.villageId, ids));
    await owner.update(households).set({ headPersonId: null }).where(inArray(households.villageId, ids));
    await owner.delete(persons).where(inArray(persons.villageId, ids));
    await owner.delete(households).where(inArray(households.villageId, ids));
  }

  beforeAll(async () => {
    owner = createOwnerDb();
    const [a, b] = await owner
      .insert(villages)
      .values(["A", "B"].map((s) => ({ name: `delete-test-${s}`, mooNo: "1", subdistrict: "ท", district: "ท", province: "ท" })))
      .returning({ id: villages.id });
    otherVillage = b.id;
    const user = await createUser(owner, { role: "admin", villageId: a.id, username, name: "ผู้ลบ", password: "password-for-tests" });
    actor = { id: user.id, villageId: a.id };
  });

  beforeEach(async () => {
    await clearVillages();
    [house, emptyHouse] = (
      await owner
        .insert(households)
        .values([
          { villageId: actor.villageId, houseNo: "1" },
          { villageId: actor.villageId, houseNo: "2" },
        ])
        .returning({ id: households.id })
    ).map((h) => h.id);
    [{ id: head }] = await owner
      .insert(persons)
      .values({ villageId: actor.villageId, householdId: house, firstName: "ซ้ำ", lastName: "กรอกผิด" })
      .returning({ id: persons.id });
    await owner.update(households).set({ headPersonId: head }).where(eq(households.id, house));
    [{ id: otherHouse }] = await owner
      .insert(households)
      .values({ villageId: otherVillage, houseNo: "9", deletedAt: new Date() })
      .returning({ id: households.id });
  });

  afterAll(async () => {
    await clearVillages();
    await owner.delete(users).where(eq(users.username, username));
    await owner.delete(villages).where(inArray(villages.id, [actor.villageId, otherVillage]));
    await owner.$client.end();
    await getDb().$client.end();
  });

  it("requires the exact full name to delete a person", async () => {
    expect(await deletePerson(actor, head, "ซ้ำ")).toBe("wrongConfirmation");
    expect(await deletePerson(actor, head, " ซ้ำ กรอกผิด ")).toBe("deleted");
  });

  it("hides a deleted person, clears them as head, and audits it", async () => {
    await deletePerson(actor, head, "ซ้ำ กรอกผิด");
    const household = await getHousehold(actor.villageId, house);
    expect(household!.residents).toEqual([]);
    const [row] = await owner.select().from(households).where(eq(households.id, house));
    expect(row.headPersonId).toBeNull();
    const audit = await owner.select().from(auditLogs).where(eq(auditLogs.recordId, head));
    expect(audit.map((a) => a.action)).toEqual(["delete"]);
  });

  it("refuses to delete a house where someone still lives", async () => {
    expect(await deleteHousehold(actor, house, "1")).toBe("hasResidents");
    expect(await deleteHousehold(actor, emptyHouse, "1")).toBe("wrongConfirmation");
    expect(await deleteHousehold(actor, emptyHouse, "2")).toBe("deleted");
    expect(await getHousehold(actor.villageId, emptyHouse)).toBeNull();
  });

  it("restores a person, but only once their house is back", async () => {
    await deletePerson(actor, head, "ซ้ำ กรอกผิด");
    await owner.update(households).set({ deletedAt: new Date() }).where(eq(households.id, house));
    expect(await restorePerson(actor, head)).toBe("householdDeleted");

    expect(await restoreHousehold(actor, house)).toBe("restored");
    expect(await restorePerson(actor, head)).toBe("restored");
    const household = await getHousehold(actor.villageId, house);
    expect(household!.residents.map((m) => m.firstName)).toEqual(["ซ้ำ"]);
  });

  it("will not restore a house whose number was reused", async () => {
    await deleteHousehold(actor, emptyHouse, "2");
    await owner.insert(households).values({ villageId: actor.villageId, houseNo: "2" });
    expect(await restoreHousehold(actor, emptyHouse)).toBe("duplicateHouseNo");
  });

  it("lists only this village's records still within the restore window", async () => {
    await deleteHousehold(actor, emptyHouse, "2");
    await deletePerson(actor, head, "ซ้ำ กรอกผิด");
    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const [{ id: expired }] = await owner
      .insert(persons)
      .values({ villageId: actor.villageId, householdId: house, firstName: "เก่า", lastName: "มาก", deletedAt: old })
      .returning({ id: persons.id });

    const deleted = await listDeleted(actor.villageId);
    expect(deleted.households.map((h) => h.id)).toEqual([emptyHouse]);
    expect(deleted.persons.map((p) => p.id)).toEqual([head]);
    expect(await restorePerson(actor, expired)).toBe("notFound");
    expect(await restoreHousehold(actor, otherHouse)).toBe("notFound");
  });

  it("purges records deleted more than 30 days ago, with their former members", async () => {
    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    await owner.update(households).set({ deletedAt: old }).where(eq(households.id, emptyHouse));
    const [{ id: formerMember }] = await owner
      .insert(persons)
      .values({ villageId: actor.villageId, householdId: emptyHouse, firstName: "อดีต", lastName: "สมาชิก", status: "moved_out" })
      .returning({ id: persons.id });
    await deletePerson(actor, head, "ซ้ำ กรอกผิด"); // recent: must survive

    const removed = await purgeDeleted(owner);
    expect(removed.households).toBeGreaterThanOrEqual(1);

    const remaining = await owner.select({ id: persons.id }).from(persons).where(inArray(persons.id, [head, formerMember]));
    expect(remaining.map((r) => r.id)).toEqual([head]);
    const houses = await owner.select({ id: households.id }).from(households).where(eq(households.id, emptyHouse));
    expect(houses).toEqual([]);
  });
});
