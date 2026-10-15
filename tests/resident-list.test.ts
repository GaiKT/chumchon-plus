import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createOwnerDb, getDb, type Db } from "@/db";
import { households, persons, villages } from "@/db/schema";
import { NO_FILTERS, type ResidentFilters } from "@/lib/resident-filters";
import { listResidents, listZones } from "@/lib/residents";

const hasDb = Boolean(process.env.DATABASE_URL && process.env.MIGRATION_DATABASE_URL);
const TODAY = "2026-10-15";

afterAll(async () => {
  if (hasDb) await getDb().$client.end();
});

describe.skipIf(!hasDb)("listResidents", () => {
  let owner: Db;
  let villageId: string;
  let otherVillageId: string;

  async function names(filters: Partial<ResidentFilters>) {
    const { rows } = await listResidents(villageId, { ...NO_FILTERS, ...filters }, TODAY);
    return rows.map((r) => r.firstName);
  }

  beforeAll(async () => {
    owner = createOwnerDb();
    const village = (name: string) => ({ name, mooNo: "1", subdistrict: "ท", district: "ท", province: "ท" });
    const [a, b] = await owner
      .insert(villages)
      .values([village("list-test-A"), village("list-test-B")])
      .returning({ id: villages.id });
    villageId = a.id;
    otherVillageId = b.id;

    const house = async (vid: string, houseNo: string, zone: string | null = null) =>
      (await owner.insert(households).values({ villageId: vid, houseNo, zone }).returning({ id: households.id }))[0].id;
    const h12 = await house(villageId, "12", "คุ้มกลาง");
    const h2 = await house(villageId, "2", "คุ้มใต้");
    const h103 = await house(villageId, "103");

    const add = (householdId: string, firstName: string, birthDate: string | null, extra = {}) =>
      owner
        .insert(persons)
        .values({ villageId, householdId, firstName, lastName: "ทดสอบ", birthDate, ...extra })
        .returning({ id: persons.id });

    await add(h12, "ลูกสิบสอง", "2010-05-01");
    const [head12] = await add(h12, "หัวหน้าสิบสอง", "1966-10-15"); // turns 60 today
    await owner.update(households).set({ headPersonId: head12.id }).where(eq(households.id, h12));
    await add(h2, "จะครบหกสิบ", "1966-12-01"); // turns 60 later this year
    await add(h2, "ครบปีหน้า", "1967-01-01");
    await add(h103, "เด็กสิบเจ็ด", "2008-10-16"); // 17, turns 18 tomorrow
    await add(h103, "ไม่มีวันเกิด", null);
    await add(h103, "ย้ายออกแล้ว", "1940-01-01", { status: "moved_out" });
    await add(h103, "ลบแล้ว", "1940-01-01", { deletedAt: new Date() });

    const hOther = await house(otherVillageId, "1", "คุ้มกลาง");
    await owner
      .insert(persons)
      .values({ villageId: otherVillageId, householdId: hOther, firstName: "หมู่บ้านอื่น", lastName: "ทดสอบ", birthDate: "1930-01-01" });
  });

  afterAll(async () => {
    for (const id of [villageId, otherVillageId]) {
      await owner.update(households).set({ headPersonId: null }).where(eq(households.villageId, id));
      await owner.delete(persons).where(eq(persons.villageId, id));
      await owner.delete(households).where(eq(households.villageId, id));
      await owner.delete(villages).where(eq(villages.id, id));
    }
    await owner.$client.end();
  });

  it("lists current residents by house number, head first, without former or deleted people", async () => {
    expect(await names({})).toEqual([
      "ครบปีหน้า",
      "จะครบหกสิบ",
      "หัวหน้าสิบสอง",
      "ลูกสิบสอง",
      "เด็กสิบเจ็ด",
      "ไม่มีวันเกิด",
    ]);
  });

  it("marks the household head", async () => {
    const { rows } = await listResidents(villageId, NO_FILTERS, TODAY);
    expect(rows.filter((r) => r.isHead).map((r) => r.firstName)).toEqual(["หัวหน้าสิบสอง"]);
  });

  it("counts someone whose 60th birthday is today as 60 or older", async () => {
    expect(await names({ minAge: 60 })).toEqual(["หัวหน้าสิบสอง"]);
  });

  it("finds people who turn 60 later this year, but not those already 60 or turning next year", async () => {
    expect(await names({ turning: 60 })).toEqual(["จะครบหกสิบ"]);
  });

  it("treats under 18 as up to the day before the 18th birthday", async () => {
    expect(await names({ maxAge: 17 })).toEqual(["ลูกสิบสอง", "เด็กสิบเจ็ด"]);
  });

  it("counts people left out of an age filter for having no birth date", async () => {
    const result = await listResidents(villageId, { ...NO_FILTERS, minAge: 60 }, TODAY);
    expect(result.withoutBirthDate).toBe(1);
    expect((await listResidents(villageId, NO_FILTERS, TODAY)).withoutBirthDate).toBe(0);
    expect(await names({ noBirthDate: true })).toEqual(["ไม่มีวันเกิด"]);
  });

  it("filters by zone", async () => {
    expect(await names({ zone: "คุ้มใต้" })).toEqual(["ครบปีหน้า", "จะครบหกสิบ"]);
  });

  it("includes people who moved out when asked to", async () => {
    expect(await names({ minAge: 80, includeFormer: true })).toEqual(["ย้ายออกแล้ว"]);
  });

  it("never lists another village's residents or zones", async () => {
    expect(await names({ minAge: 90, includeFormer: true })).toEqual([]);
    expect(await listZones(villageId)).toEqual(["คุ้มกลาง", "คุ้มใต้"]);
  });
});
