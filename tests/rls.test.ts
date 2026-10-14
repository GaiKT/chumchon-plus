import { eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createOwnerDb, getDb, withVillage, type Db } from "@/db";
import { households, villages } from "@/db/schema";

// Integration test against the database from docker compose.
// Requires DATABASE_URL and MIGRATION_DATABASE_URL (see .env.example).
const hasDb = Boolean(process.env.DATABASE_URL && process.env.MIGRATION_DATABASE_URL);

describe.skipIf(!hasDb)("row-level security", () => {
  let owner: Db;
  let villageA: string;
  let villageB: string;

  beforeAll(async () => {
    owner = createOwnerDb();
    const created = await owner
      .insert(villages)
      .values(
        ["A", "B"].map((suffix) => ({
          name: `rls-test-${suffix}`,
          mooNo: "1",
          subdistrict: "ทดสอบ",
          district: "ทดสอบ",
          province: "ทดสอบ",
        })),
      )
      .returning({ id: villages.id });
    [villageA, villageB] = created.map((v) => v.id);
    await owner.insert(households).values([
      { villageId: villageA, houseNo: "1" },
      { villageId: villageB, houseNo: "1" },
    ]);
  });

  afterAll(async () => {
    const ids = [villageA, villageB];
    await owner.delete(households).where(inArray(households.villageId, ids));
    await owner.delete(villages).where(inArray(villages.id, ids));
    await owner.$client.end();
    await getDb().$client.end();
  });

  it("connects as a role that cannot bypass row-level security", async () => {
    const result = await getDb().execute<{ rolbypassrls: boolean; rolsuper: boolean }>(
      sql`select rolbypassrls, rolsuper from pg_roles where rolname = current_user`,
    );
    expect(result.rows[0]).toEqual({ rolbypassrls: false, rolsuper: false });
  });

  it("returns no rows when no village is set", async () => {
    expect(await getDb().select().from(households)).toEqual([]);
    expect(await getDb().select().from(villages)).toEqual([]);
  });

  it("returns only the current village's rows even without a filter", async () => {
    const rows = await withVillage(villageA, (tx) => tx.select().from(households));
    expect(rows.map((r) => r.villageId)).toEqual([villageA]);
  });

  it("rejects writing a row for another village", async () => {
    await expect(
      withVillage(villageA, (tx) =>
        tx.insert(households).values({ villageId: villageB, houseNo: "2" }),
      ),
    ).rejects.toThrow();
  });

  it("cannot update another village's rows", async () => {
    await withVillage(villageA, (tx) =>
      tx.update(households).set({ note: "hacked" }).where(eq(households.villageId, villageB)),
    );
    const [row] = await owner
      .select({ note: households.note })
      .from(households)
      .where(eq(households.villageId, villageB));
    expect(row.note).toBeNull();
  });
});
