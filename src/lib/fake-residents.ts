import { groupIntoHouseholds, residentRowSchema, type HouseholdImport, type ResidentRow } from "./residents-import";
import { HEAD_RELATION, type PersonStatus } from "./resident-fields";

// Fake but realistic-looking residents for staging, so search can be tried
// with many results, duplicate and look-alike names, and every status.

const MALE = ["สมชาย", "สมชาญ", "ประเสริฐ", "วิชัย", "วิชาญ", "บุญมี", "สมศักดิ์", "ทองดี", "อำนาจ", "สุรชัย", "ชาญชัย", "ณรงค์", "นรงค์", "ประยุทธ", "สมบัติ"];
const FEMALE = ["สมศรี", "มาลี", "มาลัย", "บุญมา", "สุดา", "จันทร์เพ็ญ", "ทองใบ", "อรุณี", "ประภา", "สมพร", "วันเพ็ญ", "ละเอียด", "นิภา", "บัวผัน", "คำปุ่น"];
const LAST = ["ใจดี", "สุขใจ", "รักถิ่น", "มั่นคง", "ศรีสุข", "บุญเรือง", "แก้วมณี", "ทองคำ", "พรมมา", "สายบุญ", "ศรีสวัสดิ์", "บุญมาก", "คำแก้ว", "ชัยมงคล", "อินทร์แก้ว"];
const NICK = ["แดง", "ดำ", "ต้อย", "หน่อย", "เล็ก", "ใหญ่", "จุก", "ปุ๊", "แป๊ะ", "ต้น", "นก", "ตุ๊ก", "ป้อม", "เอ", "บี"];
const ZONES = ["คุ้มเหนือ", "คุ้มกลาง", "คุ้มใต้", "คุ้มตะวันออก"];

export const FAKE_HOUSEHOLD_COUNT = 150;
export const FAKE_PERSON_COUNT = 500;

/** Small deterministic PRNG (mulberry32), so every run builds the same village. */
function random(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]) => items[Math.floor(next() * items.length)],
    chance: (p: number) => next() < p,
  };
}

/** House numbers like 12, 12/1 and 123, so prefix search has something to sort. */
function houseNumbers(count: number) {
  const plain = Array.from({ length: count - 20 }, (_, i) => String(i + 1));
  const sub = Array.from({ length: 20 }, (_, i) => `${(i % 10) + 10}/${Math.floor(i / 10) + 1}`);
  return [...plain, ...sub];
}

/** Household sizes between 1 and 6 that add up to exactly `people`. */
function householdSizes(rng: ReturnType<typeof random>, houses: number, people: number) {
  const sizes = Array.from({ length: houses }, () => 1);
  for (let left = people - houses; left > 0; ) {
    const i = rng.int(0, houses - 1);
    if (sizes[i] < 6) {
      sizes[i]++;
      left--;
    }
  }
  return sizes;
}

export type FakeVillage = {
  households: HouseholdImport[];
  /** Status to set after import, by household index then member index. */
  statuses: Map<string, PersonStatus>;
};

export function generateFakeVillage(seed = 1, today = new Date()): FakeVillage {
  const rng = random(seed);
  const thisYearBE = today.getFullYear() + 543;
  const raw: Record<string, string>[] = [];

  const sizes = householdSizes(rng, FAKE_HOUSEHOLD_COUNT, FAKE_PERSON_COUNT);
  houseNumbers(FAKE_HOUSEHOLD_COUNT).forEach((houseNo, h) => {
    const zone = ZONES[h % ZONES.length];
    const lastName = rng.pick(LAST);
    for (let m = 0; m < sizes[h]; m++) {
      const role = m === 0 ? HEAD_RELATION : m === 1 ? "คู่สมรส" : rng.chance(0.8) ? "บุตร" : "หลาน";
      const age = m === 0 ? rng.int(30, 85) : m === 1 ? rng.int(28, 80) : rng.int(1, 40);
      const female = m === 1 ? true : m === 0 ? false : rng.chance(0.5);
      const title = age < 15 ? (female ? "ด.ญ." : "ด.ช.") : female ? (m === 1 ? "นาง" : "นางสาว") : "นาย";
      raw.push({
        houseNo,
        zone,
        title,
        firstName: rng.pick(female ? FEMALE : MALE),
        lastName,
        nickname: rng.chance(0.7) ? rng.pick(NICK) : "",
        relationToHead: role,
        birthDate: `${String(rng.int(1, 28)).padStart(2, "0")}/${String(rng.int(1, 12)).padStart(2, "0")}/${thisYearBE - age}`,
        phone: age >= 18 && rng.chance(0.5) ? `08${rng.int(10_000_000, 99_999_999)}` : "",
        note: "",
      });
    }
  });

  // Same validation as a real import, so fake data cannot drift from the rules.
  const rows: ResidentRow[] = raw.map((r, i) => ({ ...residentRowSchema.parse(r), rowNumber: i + 2 }));
  const { households, errors } = groupIntoHouseholds(rows);
  if (errors.length > 0) throw new Error(`Fake data is invalid: ${errors[0].message}`);

  // Some people moved out or died; single-person houses whose only member
  // left become empty houses.
  const statuses = new Map<string, PersonStatus>();
  households.forEach((house, h) => {
    house.members.forEach((_, m) => {
      const alone = house.members.length === 1;
      if (m === 0 && !alone) return; // keep a head in houses with residents
      if (rng.chance(alone ? 0.15 : 0.06)) statuses.set(`${h}:${m}`, rng.chance(0.6) ? "moved_out" : "deceased");
    });
  });

  return { households, statuses };
}

/** Refuses to run fake-data scripts anywhere but development or staging. */
export function assertFakeDataAllowed(appEnv: string | undefined) {
  if (appEnv !== "development" && appEnv !== "staging") {
    throw new Error(
      `Refusing to create fake data: APP_ENV is "${appEnv ?? ""}", expected "development" or "staging".`,
    );
  }
}
