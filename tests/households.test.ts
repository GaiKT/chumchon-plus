import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createOwnerDb, getDb, type Db } from "@/db";
import { households, persons, villages } from "@/db/schema";
import { getHousehold } from "@/lib/households";

const hasDb = Boolean(process.env.DATABASE_URL && process.env.MIGRATION_DATABASE_URL);

describe.skipIf(!hasDb)("getHousehold", () => {
  let owner: Db;
  let villageA: string;
  let villageB: string;
  let houseA: string;
  let houseB: string;

  beforeAll(async () => {
    owner = createOwnerDb();
    [villageA, villageB] = (
      await owner
        .insert(villages)
        .values(["A", "B"].map((s) => ({ name: `household-test-${s}`, mooNo: "1", subdistrict: "ท", district: "ท", province: "ท" })))
        .returning({ id: villages.id })
    ).map((v) => v.id);
    [houseA, houseB] = (
      await owner
        .insert(households)
        .values([
          { villageId: villageA, houseNo: "7", zone: "คุ้มใต้" },
          { villageId: villageB, houseNo: "7" },
        ])
        .returning({ id: households.id })
    ).map((h) => h.id);

    const [, head] = await owner
      .insert(persons)
      .values([
        { villageId: villageA, householdId: houseA, firstName: "ลูก", lastName: "ก", birthDate: "2010-01-01", relationToHead: "บุตร" },
        { villageId: villageA, householdId: houseA, firstName: "พ่อ", lastName: "ก", birthDate: "1975-01-01" },
        { villageId: villageA, householdId: houseA, firstName: "ปู่", lastName: "ก", birthDate: "1940-01-01", status: "deceased" },
        { villageId: villageA, householdId: houseA, firstName: "ลบ", lastName: "ก", deletedAt: new Date() },
      ])
      .returning({ id: persons.id });
    await owner.update(households).set({ headPersonId: head.id }).where(eq(households.id, houseA));
  });

  afterAll(async () => {
    const ids = [villageA, villageB];
    await owner.update(households).set({ headPersonId: null }).where(inArray(households.villageId, ids));
    await owner.delete(persons).where(inArray(persons.villageId, ids));
    await owner.delete(households).where(inArray(households.villageId, ids));
    await owner.delete(villages).where(inArray(villages.id, ids));
    await owner.$client.end();
    await getDb().$client.end();
  });

  it("lists current residents head first, and former members separately", async () => {
    const household = await getHousehold(villageA, houseA);
    expect(household).toMatchObject({ houseNo: "7", zone: "คุ้มใต้" });
    expect(household!.residents.map((m) => [m.firstName, m.isHead])).toEqual([
      ["พ่อ", true],
      ["ลูก", false],
    ]);
    expect(household!.former.map((m) => [m.firstName, m.status])).toEqual([["ปู่", "deceased"]]);
  });

  it("returns null for another village's household", async () => {
    expect(await getHousehold(villageA, houseB)).toBeNull();
  });

  it("returns null for a malformed id without querying", async () => {
    expect(await getHousehold(villageA, "1 or 1=1")).toBeNull();
  });
});
