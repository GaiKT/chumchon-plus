import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createOwnerDb, getDb, type Db } from "@/db";
import { households, persons, villages } from "@/db/schema";
import { searchResidents } from "@/lib/residents";
import { parseQuery } from "@/lib/search-query";

const hasDb = Boolean(process.env.DATABASE_URL && process.env.MIGRATION_DATABASE_URL);

describe.skipIf(!hasDb)("searchResidents", () => {
  let owner: Db;
  let villageId: string;

  async function names(raw: string) {
    const results = await searchResidents(villageId, parseQuery(raw));
    return results.map((r) => r.firstName);
  }

  beforeAll(async () => {
    owner = createOwnerDb();
    const [village] = await owner
      .insert(villages)
      .values({ name: "search-test", mooNo: "1", subdistrict: "ท", district: "ท", province: "ท" })
      .returning({ id: villages.id });
    villageId = village.id;
    const [house] = await owner
      .insert(households)
      .values({ villageId, houseNo: "12/1" })
      .returning({ id: households.id });
    for (const houseNo of ["123", "12", "45", "2/12"]) {
      const [h] = await owner
        .insert(households)
        .values({ villageId, houseNo })
        .returning({ id: households.id });
      await owner.insert(persons).values({ villageId, householdId: h.id, firstName: `บ้าน${houseNo}`, lastName: "ทดสอบ" });
    }
    await owner.insert(persons).values(
      [
        { title: "นาย", firstName: "สมชาย", lastName: "ใจดี", nickname: "แดง" },
        { title: "นาง", firstName: "สมศรี", lastName: "ใจดี", nickname: "ศรี" },
        { firstName: "สมปอง", lastName: "รักถิ่น", status: "moved_out" as const },
        { firstName: "สมหวัง", lastName: "ลบแล้ว", deletedAt: new Date() },
        { firstName: "ร้อยเปอร์", lastName: "เต็ม%" },
      ].map((p) => ({ villageId, householdId: house.id, ...p })),
    );
  });

  afterAll(async () => {
    await owner.delete(persons).where(eq(persons.villageId, villageId));
    await owner.delete(households).where(eq(households.villageId, villageId));
    await owner.delete(villages).where(eq(villages.id, villageId));
    await owner.$client.end();
    await getDb().$client.end();
  });

  it("matches first name, last name and nickname", async () => {
    expect(await names("สมชาย")).toEqual(["สมชาย"]);
    expect(await names("ใจดี")).toEqual(["สมชาย", "สมศรี"]);
    expect(await names("แดง")).toEqual(["สมชาย"]);
  });

  it("matches a substring", async () => {
    expect(await names("ชาย")).toEqual(["สมชาย"]);
  });

  it("ignores the title", async () => {
    expect(await names("นายสมชาย")).toEqual(await names("สมชาย"));
  });

  it("requires every word to match", async () => {
    expect(await names("สม ใจดี")).toEqual(["สมชาย", "สมศรี"]);
    expect(await names("สมชาย รักถิ่น")).toEqual([]);
  });

  it("excludes residents who moved out or were deleted", async () => {
    expect(await names("สม")).toEqual(["สมชาย", "สมศรี"]);
  });

  it("treats % literally", async () => {
    expect(await names("ม%")).toEqual(["ร้อยเปอร์"]);
    expect(await names("%%")).toEqual([]);
  });

  it("finds house numbers by prefix with the exact match first", async () => {
    const houses = async (raw: string) =>
      (await searchResidents(villageId, parseQuery(raw))).map((r) => r.houseNo);
    // House 12/1 has three current residents.
    expect(await houses("12")).toEqual(["12", "123", "12/1", "12/1", "12/1"]);
    expect(await houses("12/1")).toEqual(["12/1", "12/1", "12/1"]);
    expect(await houses("4")).toEqual(["45"]);
    expect(await houses("9")).toEqual([]);
  });

  it("returns the house number and birth date fields", async () => {
    const [result] = await searchResidents(villageId, parseQuery("แดง"));
    expect(result).toMatchObject({ houseNo: "12/1", nickname: "แดง", title: "นาย" });
  });
});
