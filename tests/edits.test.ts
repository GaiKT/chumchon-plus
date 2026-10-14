import { eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createOwnerDb, getDb, withVillage, type Db } from "@/db";
import { auditLogs, households, persons, users, villages } from "@/db/schema";
import {
  createHousehold,
  createPerson,
  updateHousehold,
  updatePerson,
  type Actor,
} from "@/lib/resident-edits";
import { householdFormSchema, personFormSchema } from "@/lib/resident-fields";
import { createUser } from "@/lib/users";

const hasDb = Boolean(process.env.DATABASE_URL && process.env.MIGRATION_DATABASE_URL);

describe.skipIf(!hasDb)("resident edits", () => {
  let owner: Db;
  let actor: Actor;
  let otherVillage: string;
  let house1: string;
  let house2: string;
  let head: string;
  let otherPerson: string;
  const username = `edit_${Date.now().toString(36)}`;

  const personInput = (overrides: Record<string, string> = {}) =>
    personFormSchema.parse({
      householdId: house1,
      title: "นาย",
      firstName: "หัวหน้า",
      lastName: "แก้ไข",
      nickname: "หัว",
      relationToHead: "หัวหน้าครัวเรือน",
      birthDate: "",
      phone: "",
      note: "",
      ...overrides,
    });

  const auditFor = (recordId: string) =>
    owner.select().from(auditLogs).where(eq(auditLogs.recordId, recordId));

  beforeAll(async () => {
    owner = createOwnerDb();
    const [a, b] = await owner
      .insert(villages)
      .values(["A", "B"].map((s) => ({ name: `edit-test-${s}`, mooNo: "1", subdistrict: "ท", district: "ท", province: "ท" })))
      .returning({ id: villages.id });
    otherVillage = b.id;
    const user = await createUser(owner, {
      role: "admin",
      villageId: a.id,
      username,
      name: "ผู้แก้ไข",
      password: "password-for-tests",
    });
    actor = { id: user.id, villageId: a.id };
  });

  beforeEach(async () => {
    const villageIds = [actor.villageId, otherVillage];
    await owner.delete(auditLogs).where(inArray(auditLogs.villageId, villageIds));
    await owner.update(households).set({ headPersonId: null }).where(inArray(households.villageId, villageIds));
    await owner.delete(persons).where(inArray(persons.villageId, villageIds));
    await owner.delete(households).where(inArray(households.villageId, villageIds));

    [house1, house2] = (
      await owner
        .insert(households)
        .values([
          { villageId: actor.villageId, houseNo: "1" },
          { villageId: actor.villageId, houseNo: "2" },
        ])
        .returning({ id: households.id })
    ).map((h) => h.id);
    [{ id: head }] = await owner
      .insert(persons)
      .values({ villageId: actor.villageId, householdId: house1, title: "นาย", firstName: "หัวหน้า", lastName: "แก้ไข", nickname: "หัว", relationToHead: "หัวหน้าครัวเรือน" })
      .returning({ id: persons.id });
    await owner.update(households).set({ headPersonId: head }).where(eq(households.id, house1));

    const [otherHouse] = await owner
      .insert(households)
      .values({ villageId: otherVillage, houseNo: "1" })
      .returning({ id: households.id });
    [{ id: otherPerson }] = await owner
      .insert(persons)
      .values({ villageId: otherVillage, householdId: otherHouse.id, firstName: "อื่น", lastName: "หมู่บ้าน" })
      .returning({ id: persons.id });
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
    await getDb().$client.end();
  });

  it("saves a person and records only the changed fields", async () => {
    const result = await updatePerson(actor, head, personInput({ phone: "081-111-2222", nickname: "" }));
    expect(result).toBe("saved");

    const [row] = await owner.select().from(persons).where(eq(persons.id, head));
    expect(row).toMatchObject({ phone: "0811112222", nickname: null });

    const [audit] = await auditFor(head);
    expect(audit).toMatchObject({
      action: "update",
      tableName: "persons",
      userId: actor.id,
      villageId: actor.villageId,
      changes: { phone: [null, "0811112222"], nickname: ["หัว", null] },
    });
  });

  it("writes no audit row when nothing changed", async () => {
    expect(await updatePerson(actor, head, personInput())).toBe("saved");
    expect(await auditFor(head)).toEqual([]);
  });

  it("clears the old household's head when the head moves house", async () => {
    expect(await updatePerson(actor, head, personInput({ householdId: house2 }))).toBe("saved");
    const [old] = await owner.select().from(households).where(eq(households.id, house1));
    expect(old.headPersonId).toBeNull();
  });

  it("refuses to edit a person in another village", async () => {
    expect(await updatePerson(actor, otherPerson, personInput())).toBe("notFound");
    const [row] = await owner.select().from(persons).where(eq(persons.id, otherPerson));
    expect(row.firstName).toBe("อื่น");
  });

  it("updates a household and rejects a duplicate house number", async () => {
    const save = (houseNo: string) =>
      updateHousehold(actor, house2, householdFormSchema.parse({ houseNo, zone: "คุ้มใหม่", note: "", headPersonId: "" }));
    expect(await save("1")).toBe("duplicateHouseNo");
    expect(await save("2/1")).toBe("saved");

    const [audit] = await auditFor(house2);
    expect(audit.changes).toEqual({ houseNo: ["2", "2/1"], zone: [null, "คุ้มใหม่"] });
  });

  it("creates a household and a member, auditing both", async () => {
    expect(await createHousehold(actor, { houseNo: "1", zone: null, note: null })).toBe("duplicateHouseNo");

    const created = await createHousehold(actor, { houseNo: "3", zone: "คุ้มใหม่", note: null });
    if (typeof created === "string") throw new Error(created);
    const person = await createPerson(actor, personInput({ householdId: created.id, firstName: "ใหม่", relationToHead: "" }));
    if (typeof person === "string") throw new Error(person);

    const [householdAudit] = await auditFor(created.id);
    expect(householdAudit).toMatchObject({ action: "create", changes: { houseNo: [null, "3"], zone: [null, "คุ้มใหม่"] } });
    const [personAudit] = await auditFor(person.id);
    expect(personAudit).toMatchObject({ action: "create", changes: { firstName: [null, "ใหม่"], status: [null, "resident"] } });
  });

  it("refuses to add a member to another village's household", async () => {
    const [otherHouse] = await owner
      .select({ id: households.id })
      .from(households)
      .where(eq(households.villageId, otherVillage));
    expect(await createPerson(actor, personInput({ householdId: otherHouse.id }))).toBe("householdNotFound");
  });

  describe("when the household head leaves", () => {
    let spouse: string;

    beforeEach(async () => {
      [{ id: spouse }] = await owner
        .insert(persons)
        .values({ villageId: actor.villageId, householdId: house1, firstName: "คู่", lastName: "แก้ไข" })
        .returning({ id: persons.id });
    });

    it("requires a successor while others still live there", async () => {
      expect(await updatePerson(actor, head, personInput({ status: "deceased" }))).toBe("needsNewHead");
      const [row] = await owner.select().from(persons).where(eq(persons.id, head));
      expect(row.status).toBe("resident");
    });

    it("hands over to the chosen successor and audits it", async () => {
      expect(await updatePerson(actor, head, personInput({ status: "deceased" }), spouse)).toBe("saved");
      const [house] = await owner.select().from(households).where(eq(households.id, house1));
      expect(house.headPersonId).toBe(spouse);
      expect((await auditFor(house1)).map((a) => a.changes)).toEqual([{ headPersonId: [head, spouse] }]);
    });

    it("rejects a successor who does not live there", async () => {
      expect(await updatePerson(actor, head, personInput({ status: "moved_out" }), otherPerson)).toBe("needsNewHead");
    });

    it("lets a household's head be changed only to a current resident", async () => {
      const save = (headPersonId: string) =>
        updateHousehold(actor, house1, householdFormSchema.parse({ houseNo: "1", zone: "", note: "", headPersonId }));
      expect(await save(otherPerson)).toBe("invalidHead");
      expect(await save(spouse)).toBe("saved");
    });
  });

  it("leaves a house headless when its only resident leaves", async () => {
    expect(await updatePerson(actor, head, personInput({ status: "moved_out" }))).toBe("saved");
    const [house] = await owner.select().from(households).where(eq(households.id, house1));
    expect(house.headPersonId).toBeNull();
  });

  it("keeps the audit log append-only for the app role", async () => {
    await updatePerson(actor, head, personInput({ note: "บันทึก" }));
    const denied = { cause: expect.objectContaining({ message: expect.stringMatching(/permission denied/) }) };
    await expect(
      withVillage(actor.villageId, (tx) => tx.execute(sql`delete from audit_logs`)),
    ).rejects.toMatchObject(denied);
    await expect(
      withVillage(actor.villageId, (tx) => tx.execute(sql`update audit_logs set changes = '{}'`)),
    ).rejects.toMatchObject(denied);
    expect(await auditFor(head)).toHaveLength(1);
  });
});
