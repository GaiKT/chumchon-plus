import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createOwnerDb, getDb, type Db } from "@/db";
import { sessions, users, villages } from "@/db/schema";
import { auth } from "@/lib/auth";
import { createUser } from "@/lib/users";

// Integration test against the database from docker compose.
const hasDb = Boolean(process.env.DATABASE_URL && process.env.MIGRATION_DATABASE_URL);

describe.skipIf(!hasDb)("password sign-in", () => {
  let owner: Db;
  let villageId: string;
  const suffix = Date.now().toString(36);
  const adminUsername = `admin_${suffix}`;
  const superUsername = `super_${suffix}`;
  const password = "correct-horse-battery";

  async function signIn(username: string, pass = password) {
    return auth.api.signInUsername({ body: { username, password: pass }, asResponse: true });
  }

  function sessionCookie(res: Response) {
    return res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  }

  beforeAll(async () => {
    owner = createOwnerDb();
    const [village] = await owner
      .insert(villages)
      .values({ name: "auth-test", mooNo: "1", subdistrict: "ท", district: "ท", province: "ท" })
      .returning({ id: villages.id });
    villageId = village.id;
    await createUser(owner, { role: "admin", villageId, username: adminUsername, name: "ผู้ใหญ่ทดสอบ", password });
    await createUser(owner, { role: "superadmin", username: superUsername, name: "ผู้ดูแลระบบ", password });
  });

  afterAll(async () => {
    await owner.delete(users).where(inArray(users.username, [adminUsername, superUsername]));
    await owner.delete(villages).where(eq(villages.id, villageId));
    await owner.$client.end();
    await getDb().$client.end();
  });

  it("signs an admin in and exposes their village on the session", async () => {
    const res = await signIn(adminUsername);
    expect(res.status).toBe(200);

    const session = await auth.api.getSession({
      headers: new Headers({ cookie: sessionCookie(res) }),
    });
    expect(session?.user).toMatchObject({ role: "admin", villageId });
  });

  it("gives a superadmin no village", async () => {
    const res = await signIn(superUsername);
    const session = await auth.api.getSession({
      headers: new Headers({ cookie: sessionCookie(res) }),
    });
    expect(session?.user).toMatchObject({ role: "superadmin", villageId: null });
  });

  it("rejects a wrong password", async () => {
    const res = await signIn(adminUsername, "wrong-password");
    expect(res.status).toBe(401);
  });

  it("rejects self-service sign-up", async () => {
    const res = await auth.api.signUpEmail({
      body: { email: `x_${suffix}@example.com`, password, name: "x" } as never,
      asResponse: true,
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("deletes the session from the database on sign-out", async () => {
    const cookie = sessionCookie(await signIn(adminUsername));
    const headers = new Headers({ cookie });
    const session = await auth.api.getSession({ headers });
    expect(session).not.toBeNull();

    await auth.api.signOut({ headers });

    const rows = await owner.select().from(sessions).where(eq(sessions.id, session!.session.id));
    expect(rows).toEqual([]);
    expect(await auth.api.getSession({ headers })).toBeNull();
  });

  it("enforces that admins have a village and superadmins do not", async () => {
    await expect(
      createUser(owner, { role: "admin", villageId: undefined as never, username: `bad_${suffix}`, name: "x", password }),
    ).rejects.toThrow();
    await expect(
      owner.insert(users).values({ name: "x", email: `bad_${suffix}@x.invalid`, role: "superadmin", villageId }),
    ).rejects.toThrow();
  });
});
