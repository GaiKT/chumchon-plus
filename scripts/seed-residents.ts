import "dotenv/config";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { eq } from "drizzle-orm";
import { getDb, withVillage } from "@/db";
import { households, persons } from "@/db/schema";
import {
  HEAD_RELATION,
  groupIntoHouseholds,
  parseResidentsCsv,
  type RowError,
} from "@/lib/residents-import";

const usage = "Usage: pnpm seed:residents --village <village-id> <file.csv>";

function printErrors(errors: RowError[]) {
  const sorted = [...errors].sort((a, b) => a.rowNumber - b.rowNumber);
  for (const e of sorted) console.error(`แถวที่ ${e.rowNumber}: ${e.message}`);
  console.error(`\nพบข้อผิดพลาด ${errors.length} รายการ ไม่ได้บันทึกข้อมูลใดๆ`);
}

async function main() {
  const { values, positionals } = parseArgs({
    options: { village: { type: "string" } },
    allowPositionals: true,
  });
  const file = positionals[0];
  if (!values.village || !file) {
    console.error(usage);
    process.exit(1);
  }

  const { rows, errors: rowErrors } = parseResidentsCsv(await readFile(file, "utf8"));
  const { households: imports, errors: groupErrors } = groupIntoHouseholds(rows);
  const errors = [...rowErrors, ...groupErrors];
  if (errors.length > 0) {
    printErrors(errors);
    process.exit(1);
  }

  // Runs as the restricted role, so row-level security rejects any row
  // that does not belong to the given village.
  await withVillage(values.village, async (tx) => {
    for (const house of imports) {
      const [household] = await tx
        .insert(households)
        .values({ villageId: values.village!, houseNo: house.houseNo, zone: house.zone })
        .returning({ id: households.id });

      for (const member of house.members) {
        const [person] = await tx
          .insert(persons)
          .values({
            villageId: values.village!,
            householdId: household.id,
            title: member.title,
            firstName: member.firstName,
            lastName: member.lastName,
            nickname: member.nickname,
            relationToHead: member.relationToHead,
            birthDate: member.birthDate,
            phone: member.phone,
            note: member.note,
          })
          .returning({ id: persons.id });

        if (member.relationToHead === HEAD_RELATION) {
          await tx
            .update(households)
            .set({ headPersonId: person.id })
            .where(eq(households.id, household.id));
        }
      }
    }
  });

  const total = imports.reduce((n, h) => n + h.members.length, 0);
  console.log(`บันทึกแล้ว ${imports.length} ครัวเรือน ${total} คน`);
  await getDb().$client.end();
}

main().catch((err) => {
  const cause = err?.cause;
  if (cause?.code === "23505" && cause.constraint === "households_village_house_no_key") {
    console.error("บ้านเลขที่ในไฟล์ซ้ำกับที่มีในระบบแล้ว ไม่ได้บันทึกข้อมูลใดๆ");
  } else {
    console.error(err);
  }
  process.exit(1);
});
