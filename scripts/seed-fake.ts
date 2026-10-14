import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { createOwnerDb, getDb } from "@/db";
import { households, persons, villages } from "@/db/schema";
import { assertFakeDataAllowed, generateFakeVillage } from "@/lib/fake-residents";
import { insertHouseholds } from "@/lib/residents-store";

// Creates a separate village of fake residents for trying search on staging.
// Refuses to run unless APP_ENV is development or staging.
async function main() {
  assertFakeDataAllowed(process.env.APP_ENV);

  const owner = createOwnerDb();
  try {
    const [village] = await owner
      .insert(villages)
      .values({
        name: "หมู่บ้านทดสอบ (ข้อมูลปลอม)",
        mooNo: "99",
        subdistrict: "ทดสอบ",
        district: "ทดสอบ",
        province: "ทดสอบ",
      })
      .returning({ id: villages.id });

    const fake = generateFakeVillage();
    const personIds = await insertHouseholds(village.id, fake.households);

    // Apply statuses, which a CSV import does not carry.
    const idOf = new Map<string, string>();
    let next = 0;
    fake.households.forEach((house, h) => house.members.forEach((_, m) => idOf.set(`${h}:${m}`, personIds[next++])));
    for (const status of ["moved_out", "deceased"] as const) {
      const ids = [...fake.statuses].filter(([, s]) => s === status).map(([key]) => idOf.get(key)!);
      if (ids.length > 0) await owner.update(persons).set({ status }).where(inArray(persons.id, ids));
    }
    // A house whose only member left has no head.
    const gone = [...fake.statuses.keys()].map((key) => idOf.get(key)!);
    await owner.update(households).set({ headPersonId: null }).where(inArray(households.headPersonId, gone));

    const counts = await owner.select({ id: persons.id }).from(persons).where(eq(persons.villageId, village.id));
    console.log(`Created fake village ${village.id} with ${fake.households.length} households, ${counts.length} people`);
    console.log(`Next: pnpm user:create --role admin --village ${village.id} --username <name> --name <ชื่อ>`);
  } finally {
    await owner.$client.end();
    await getDb().$client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
