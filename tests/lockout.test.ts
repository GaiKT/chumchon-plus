import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createOwnerDb, getDb, type Db } from "@/db";
import { users, villages } from "@/db/schema";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { MAX_FAILED_SIGN_INS } from "@/lib/sign-in-lockout";
import { createUser } from "@/lib/users";

const hasDb = Boolean(process.env.DATABASE_URL && process.env.MIGRATION_DATABASE_URL);

describe.skipIf(!hasDb)("sign-in lockout", () => {
  let owner: Db;
  let villageId: string;
  const username = `lock_${Date.now().toString(36)}`;
  const password = "the-right-password";

  // A lock raised in the before hook is thrown even with asResponse.
  const attempt = (pass: string, name = username) =>
    auth.api
      .signInUsername({ body: { username: name, password: pass }, asResponse: true })
      .then(
        (r) => r.status,
        (err) => (err instanceof APIError ? err.statusCode : Promise.reject(err)),
      );

  beforeAll(async () => {
    owner = createOwnerDb();
    [{ id: villageId }] = await owner
      .insert(villages)
      .values({ name: "lockout-test", mooNo: "1", subdistrict: "ท", district: "ท", province: "ท" })
      .returning({ id: villages.id });
    await createUser(owner, { role: "admin", villageId, username, name: "ทดสอบล็อก", password });
  });

  beforeEach(async () => {
    await owner.update(users).set({ failedSignIns: 0, lockedUntil: null }).where(eq(users.username, username));
  });

  afterAll(async () => {
    await owner.delete(users).where(eq(users.username, username));
    await owner.delete(villages).where(inArray(villages.id, [villageId]));
    await owner.$client.end();
    await getDb().$client.end();
  });

  it(`locks the account after ${MAX_FAILED_SIGN_INS} wrong passwords in a row`, async () => {
    for (let i = 0; i < MAX_FAILED_SIGN_INS; i++) expect(await attempt("wrong")).toBe(401);
    // Even the right password is refused while locked.
    expect(await attempt(password)).toBe(429);

    const [row] = await owner.select().from(users).where(eq(users.username, username));
    // lockedUntil comes from the database clock, which may differ slightly
    // from this machine's.
    const minutes = (row.lockedUntil!.getTime() - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(14.5);
    expect(minutes).toBeLessThan(15.5);
  });

  it("starts counting again after a successful sign-in", async () => {
    for (let i = 0; i < MAX_FAILED_SIGN_INS - 1; i++) await attempt("wrong");
    expect(await attempt(password)).toBe(200);
    expect(await attempt("wrong")).toBe(401);
    expect(await attempt(password)).toBe(200);
  });

  it("allows sign-in again once the lock has expired", async () => {
    await owner
      .update(users)
      .set({ lockedUntil: new Date(Date.now() - 1000) })
      .where(eq(users.username, username));
    expect(await attempt(password)).toBe(200);
  });

  it("treats usernames case-insensitively", async () => {
    for (let i = 0; i < MAX_FAILED_SIGN_INS; i++) await attempt("x", username.toUpperCase());
    expect(await attempt(password)).toBe(429);
  });
});
