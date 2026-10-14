import "dotenv/config";
import { parseArgs } from "node:util";
import { z } from "zod";
import { createOwnerDb } from "@/db";
import { villages } from "@/db/schema";

const usage =
  "Usage: pnpm village:create --name <ชื่อหมู่บ้าน> --moo <หมู่ที่> --subdistrict <ตำบล> --district <อำเภอ> --province <จังหวัด>";

const argsSchema = z.object({
  name: z.string().trim().min(1),
  moo: z.string().trim().min(1),
  subdistrict: z.string().trim().min(1),
  district: z.string().trim().min(1),
  province: z.string().trim().min(1),
});

async function main() {
  const { values } = parseArgs({
    options: {
      name: { type: "string" },
      moo: { type: "string" },
      subdistrict: { type: "string" },
      district: { type: "string" },
      province: { type: "string" },
    },
  });
  const parsed = argsSchema.safeParse(values);
  if (!parsed.success) {
    console.error(usage);
    process.exit(1);
  }
  const { name, moo, subdistrict, district, province } = parsed.data;

  const db = createOwnerDb();
  const [village] = await db
    .insert(villages)
    .values({ name, mooNo: moo, subdistrict, district, province })
    .returning({ id: villages.id });
  console.log(`Created village ${name} หมู่ ${moo}: ${village.id}`);
  await db.$client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
