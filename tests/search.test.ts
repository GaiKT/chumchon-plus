import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createOwnerDb, getDb, type Db } from "@/db";
import { households, persons, villages } from "@/db/schema";
import { searchResidents } from "@/lib/residents";
import { parseQuery } from "@/lib/search-query";

const hasDb = Boolean(process.env.DATABASE_URL && process.env.MIGRATION_DATABASE_URL);

afterAll(async () => {
  if (hasDb) await getDb().$client.end();
});

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

  it("includes people who moved out when asked", async () => {
    const results = await searchResidents(villageId, parseQuery("สมปอง"), { includeFormer: true });
    expect(results.map((r) => [r.firstName, r.status])).toEqual([["สมปอง", "moved_out"]]);
    expect(await names("สมปอง")).toEqual([]);
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

  it("tolerates a one-character typo", async () => {
    expect(await names("สมชาญ")).toContain("สมชาย");
  });

  it("ranks exact, then prefix, then substring, then typo matches", async () => {
    // "ใจดี" is an exact last name; "ใจ" is a prefix; "ดี" a substring.
    expect((await names("ใจดี")).slice(0, 2)).toEqual(["สมชาย", "สมศรี"]);
    const typo = await names("สมชาญ");
    expect(typo[0]).toBe("สมชาย");
  });

  it("does not match unrelated names by similarity", async () => {
    expect(await names("ประเสริฐ")).toEqual([]);
  });

  it("returns the house number and birth date fields", async () => {
    const [result] = await searchResidents(villageId, parseQuery("แดง"));
    expect(result).toMatchObject({ houseNo: "12/1", nickname: "แดง", title: "นาย" });
  });
});

describe.skipIf(!hasDb)("searchResidents performance", () => {
  let owner: Db;
  let villageId: string;
  const firstNames = ["สมชาย", "สมศรี", "ประเสริฐ", "บุญมา", "มะลิ", "สุดา", "วิชัย", "อำนวย", "จันทร์เพ็ญ", "ทองดี"];
  const lastNames = ["ใจดี", "สุขใจ", "รักถิ่น", "มั่นคง", "ศรีสุข", "บุญเรือง", "แก้วมณี", "ทองคำ", "พรมมา", "สายบุญ"];

  beforeAll(async () => {
    owner = createOwnerDb();
    const [village] = await owner
      .insert(villages)
      .values({ name: "search-perf-test", mooNo: "1", subdistrict: "ท", district: "ท", province: "ท" })
      .returning({ id: villages.id });
    villageId = village.id;
    const houses = await owner
      .insert(households)
      .values(Array.from({ length: 150 }, (_, i) => ({ villageId, houseNo: String(i + 1) })))
      .returning({ id: households.id });
    await owner.insert(persons).values(
      Array.from({ length: 500 }, (_, i) => ({
        villageId,
        householdId: houses[i % houses.length].id,
        firstName: `${firstNames[i % 10]}${i}`,
        lastName: lastNames[Math.floor(i / 10) % 10],
        nickname: i % 3 === 0 ? `เล่น${i}` : null,
      })),
    );
  });

  afterAll(async () => {
    await owner.delete(persons).where(eq(persons.villageId, villageId));
    await owner.delete(households).where(eq(households.villageId, villageId));
    await owner.delete(villages).where(eq(villages.id, villageId));
    await owner.$client.end();
  });

  it("answers within 300ms on 500 residents", async () => {
    await searchResidents(villageId, parseQuery("สมชาย")); // warm up the connection
    for (const raw of ["สมชาญ", "ใจดี", "สม ใจ", "12"]) {
      const start = performance.now();
      await searchResidents(villageId, parseQuery(raw));
      expect(performance.now() - start).toBeLessThan(300);
    }
  });
});
