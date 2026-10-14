import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createOwnerDb, getDb, type Db } from "@/db";
import { auditLogs, sessions, users, villages } from "@/db/schema";
import { auth } from "@/lib/auth";
import type { Actor } from "@/lib/resident-edits";
import { listVillageAccounts, revokeSession, revokeUserSessions, setUserDisabled } from "@/lib/sessions-admin";
import { createUser } from "@/lib/users";

const hasDb = Boolean(process.env.DATABASE_URL && process.env.MIGRATION_DATABASE_URL);

describe.skipIf(!hasDb)("session management", () => {
  let owner: Db;
  let actor: Actor;
  let assistantId: string;
  let outsiderId: string;
  const suffix = Date.now().toString(36);
  const names = { admin: `sa_${suffix}`, assistant: `sb_${suffix}`, outsider: `sc_${suffix}` };
  const password = "password-for-tests";

  async function signIn(username: string) {
    const res = await auth.api.signInUsername({ body: { username, password }, asResponse: true });
    if (res.status !== 200) return null;
    const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
    const headers = new Headers({ cookie });
    const session = await auth.api.getSession({ headers });
    return { headers, sessionId: session!.session.id };
  }

  beforeAll(async () => {
    owner = createOwnerDb();
    const [a, b] = await owner
      .insert(villages)
      .values(["A", "B"].map((s) => ({ name: `session-test-${s}`, mooNo: "1", subdistrict: "ท", district: "ท", province: "ท" })))
      .returning({ id: villages.id });
    const admin = await createUser(owner, { role: "admin", villageId: a.id, username: names.admin, name: "ผู้ใหญ่", password });
    assistantId = (await createUser(owner, { role: "admin", villageId: a.id, username: names.assistant, name: "ผู้ช่วย", password })).id;
    outsiderId = (await createUser(owner, { role: "admin", villageId: b.id, username: names.outsider, name: "คนนอก", password })).id;
    actor = { id: admin.id, villageId: a.id };
  });

  afterAll(async () => {
    const ids = [actor.id, assistantId, outsiderId];
    const villageIds = (await owner.select({ v: users.villageId }).from(users).where(inArray(users.id, ids))).map((r) => r.v!);
    await owner.delete(auditLogs).where(inArray(auditLogs.villageId, villageIds));
    await owner.delete(users).where(inArray(users.id, ids));
    await owner.delete(villages).where(inArray(villages.id, villageIds));
    await owner.$client.end();
    await getDb().$client.end();
  });

  it("lists only accounts and sessions of the admin's village", async () => {
    const assistant = await signIn(names.assistant);
    await signIn(names.outsider);

    const accounts = await listVillageAccounts(actor.villageId);
    expect(accounts.map((a) => a.id).sort()).toEqual([actor.id, assistantId].sort());
    const assistantSessions = accounts.find((a) => a.id === assistantId)!.sessions;
    expect(assistantSessions.map((s) => s.id)).toContain(assistant!.sessionId);
  });

  it("signs out one device immediately", async () => {
    const assistant = await signIn(names.assistant);
    expect(await revokeSession(actor, assistant!.sessionId)).toBe(true);
    expect(await auth.api.getSession({ headers: assistant!.headers })).toBeNull();
  });

  it("cannot touch sessions of another village", async () => {
    const outsider = await signIn(names.outsider);
    expect(await revokeSession(actor, outsider!.sessionId)).toBe(false);
    expect(await revokeUserSessions(actor, outsiderId)).toBe(false);
    expect(await setUserDisabled(actor, outsiderId, true)).toBe("notFound");
    expect(await auth.api.getSession({ headers: outsider!.headers })).not.toBeNull();
  });

  it("signs a user out everywhere", async () => {
    const one = await signIn(names.assistant);
    const two = await signIn(names.assistant);
    expect(await revokeUserSessions(actor, assistantId)).toBe(true);
    expect(await auth.api.getSession({ headers: one!.headers })).toBeNull();
    expect(await auth.api.getSession({ headers: two!.headers })).toBeNull();
  });

  it("disables an account so it is signed out and cannot sign in again", async () => {
    const before = await signIn(names.assistant);
    expect(await setUserDisabled(actor, assistantId, true)).toBe("done");
    expect(await auth.api.getSession({ headers: before!.headers })).toBeNull();
    expect(await signIn(names.assistant)).toBeNull();

    expect(await setUserDisabled(actor, assistantId, false)).toBe("done");
    expect(await signIn(names.assistant)).not.toBeNull();
  });

  it("does not let an admin disable themselves", async () => {
    expect(await setUserDisabled(actor, actor.id, true)).toBe("self");
  });

  it("audits revocations and account changes", async () => {
    const rows = await owner.select().from(auditLogs).where(eq(auditLogs.villageId, actor.villageId));
    expect(rows.map((r) => r.tableName)).toEqual(expect.arrayContaining(["sessions", "users"]));
    const [left] = await owner.select().from(sessions).where(eq(sessions.userId, outsiderId));
    expect(left).toBeDefined();
  });
});
