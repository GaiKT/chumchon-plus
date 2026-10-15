import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createOwnerDb, getDb, type Db } from "@/db";
import { auditLogs, households, persons, users, villages } from "@/db/schema";
import { todayInThailand } from "@/lib/age";
import { getMonthlyChanges, groupChanges, type ChangeKind } from "@/lib/monthly-changes";
import { createHousehold, createPerson, deletePerson, updateHousehold, updatePerson, type Actor } from "@/lib/resident-edits";
import { personFormSchema } from "@/lib/resident-fields";
import { createUser } from "@/lib/users";

const hasDb = Boolean(process.env.DATABASE_URL && process.env.MIGRATION_DATABASE_URL);

afterAll(async () => {
  if (hasDb) await getDb().$client.end();
});

describe.skipIf(!hasDb)("getMonthlyChanges", () => {
  let owner: Db;
  let actor: Actor;
  let otherVillage: string;
  const username = `changes_${Date.now().toString(36)}`;
  const month = todayInThailand().slice(0, 7);
  let byKind: Record<ChangeKind, { name: string | null; houseNo: string; detail: string | null }[]>;

  const person = (householdId: string, firstName: string, overrides: Record<string, string> = {}) =>
    personFormSchema.parse({
      householdId,
      title: "",
      firstName,
      lastName: "เปลี่ยนแปลง",
      nickname: "",
      relationToHead: "",
      birthDate: "",
      phone: "",
      note: "",
      ...overrides,
    });

  beforeAll(async () => {
    owner = createOwnerDb();
    const [a, b] = await owner
      .insert(villages)
      .values(["A", "B"].map((s) => ({ name: `changes-test-${s}`, mooNo: "1", subdistrict: "ท", district: "ท", province: "ท" })))
      .returning({ id: villages.id });
    otherVillage = b.id;
    const user = await createUser(owner, { role: "admin", villageId: a.id, username, name: "ผู้บันทึก", password: "password-for-tests" });
    actor = { id: user.id, villageId: a.id };

    const h1 = await createHousehold(actor, { houseNo: "1", zone: null, note: null });
    const h2 = await createHousehold(actor, { houseNo: "2", zone: null, note: null });
    if (typeof h1 === "string" || typeof h2 === "string") throw new Error("house not created");

    const born = await createPerson(actor, person(h1.id, "เกิดใหม่"));
    const leaver = await createPerson(actor, person(h1.id, "ย้ายไป"));
    const mover = await createPerson(actor, person(h1.id, "ย้ายบ้าน"));
    const phone = await createPerson(actor, person(h2.id, "แก้เบอร์"));
    const mistake = await createPerson(actor, person(h2.id, "กรอกผิด"));
    for (const p of [born, leaver, mover, phone, mistake]) if (typeof p === "string") throw new Error(p);
    const id = (p: typeof born) => (p as { id: string }).id;

    const died = await createPerson(actor, person(h2.id, "จากไป"));
    await updatePerson(actor, id(died), person(h2.id, "จากไป", { status: "deceased" }));

    // The leaver heads house 1, so moving out hands the house to "เกิดใหม่".
    await updateHousehold(actor, h1.id, { houseNo: "1", zone: null, note: null, headPersonId: id(leaver) });
    await updatePerson(actor, id(leaver), person(h1.id, "ย้ายไป", { status: "moved_out" }), id(born));
    await updatePerson(actor, id(mover), person(h2.id, "ย้ายบ้าน"));
    await updatePerson(actor, id(phone), person(h2.id, "แก้เบอร์", { phone: "0812345678" }));
    await deletePerson(actor, id(mistake), "กรอกผิด เปลี่ยนแปลง");

    // A back-dated change, which belongs to January 2020 only.
    await owner.insert(auditLogs).values({
      villageId: actor.villageId,
      userId: actor.id,
      action: "create",
      tableName: "persons",
      recordId: id(born),
      changes: {},
      createdAt: new Date("2020-01-15T12:00:00+07:00"),
    });

    const groups = groupChanges(await getMonthlyChanges(actor.villageId, month));
    byKind = Object.fromEntries(
      Object.entries(groups).map(([k, events]) => [k, events.map((e) => ({ name: e.name, houseNo: e.houseNo, detail: e.detail }))]),
    ) as typeof byKind;
  });

  afterAll(async () => {
    const villageIds = [actor.villageId, otherVillage];
    await owner.delete(auditLogs).where(inArray(auditLogs.villageId, villageIds));
    await owner.update(households).set({ headPersonId: null }).where(inArray(households.villageId, villageIds));
    await owner.delete(persons).where(inArray(persons.villageId, villageIds));
    await owner.delete(households).where(inArray(households.villageId, villageIds));
    await owner.delete(users).where(eq(users.username, username));
    await owner.delete(villages).where(inArray(villages.id, villageIds));
    await owner.$client.end();
  });

  it("lists new members, but not one deleted as a mistake", async () => {
    expect(byKind.newPerson.map((e) => e.name).sort()).toEqual(["จากไป เปลี่ยนแปลง", "ย้ายบ้าน เปลี่ยนแปลง", "ย้ายไป เปลี่ยนแปลง", "เกิดใหม่ เปลี่ยนแปลง", "แก้เบอร์ เปลี่ยนแปลง"].sort());
  });

  it("lists people who moved out", async () => {
    expect(byKind.movedOut).toEqual([{ name: "ย้ายไป เปลี่ยนแปลง", houseNo: "1", detail: null }]);
  });

  it("lists moves between houses with the old house number", async () => {
    expect(byKind.movedHouse).toEqual([{ name: "ย้ายบ้าน เปลี่ยนแปลง", houseNo: "2", detail: "ย้ายมาจากบ้านเลขที่ 1" }]);
  });

  it("lists deaths", async () => {
    expect(byKind.deceased).toEqual([{ name: "จากไป เปลี่ยนแปลง", houseNo: "2", detail: null }]);
  });

  it("lists head changes with both names, newest first", async () => {
    expect(byKind.headChanged).toEqual([
      { name: null, houseNo: "1", detail: "จาก ย้ายไป เปลี่ยนแปลง เป็น เกิดใหม่ เปลี่ยนแปลง" },
      { name: null, houseNo: "1", detail: "จาก ไม่ระบุ เป็น ย้ายไป เปลี่ยนแปลง" },
    ]);
  });

  it("lists new houses", async () => {
    expect(byKind.newHouse.map((e) => e.houseNo).sort()).toEqual(["1", "2"]);
  });

  it("leaves out ordinary edits such as a phone number", async () => {
    const all = Object.values(byKind).flat();
    expect(all.filter((e) => e.name?.startsWith("แก้เบอร์"))).toHaveLength(1); // only "new member"
  });

  it("shows each change only in its own month, and only to its village", async () => {
    // The back-dated row is in January 2020, not in this month's new members (above).
    const old = await getMonthlyChanges(actor.villageId, "2020-01");
    expect(old.map((e) => [e.kind, e.name])).toEqual([["newPerson", "เกิดใหม่ เปลี่ยนแปลง"]]);
    expect(await getMonthlyChanges(otherVillage, month)).toEqual([]);
  });
});
