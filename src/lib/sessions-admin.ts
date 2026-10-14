import { and, asc, desc, eq, gt, inArray } from "drizzle-orm";
import { z } from "zod";
import { withVillage, type Tx } from "@/db";
import { sessions, users } from "@/db/schema";
import { recordAudit, type Actor } from "./resident-edits";

// The users and sessions tables have no row-level security (sign-in needs
// them before a village is known), so every query here filters by village.

const isUuid = (id: string) => z.uuid().safeParse(id).success;

function villageUserIds(tx: Tx, villageId: string) {
  return tx.select({ id: users.id }).from(users).where(eq(users.villageId, villageId));
}

/** Accounts of the village and their active sessions, most recently used first. */
export async function listVillageAccounts(villageId: string) {
  return withVillage(villageId, async (tx) => {
    const accounts = await tx
      .select({ id: users.id, name: users.name, username: users.username, disabledAt: users.disabledAt })
      .from(users)
      .where(eq(users.villageId, villageId))
      .orderBy(asc(users.name));
    const active = await tx
      .select({
        id: sessions.id,
        userId: sessions.userId,
        userAgent: sessions.userAgent,
        lastUsedAt: sessions.updatedAt,
      })
      .from(sessions)
      .where(and(inArray(sessions.userId, villageUserIds(tx, villageId)), gt(sessions.expiresAt, new Date())))
      .orderBy(desc(sessions.updatedAt));
    return accounts.map((account) => ({
      ...account,
      sessions: active.filter((s) => s.userId === account.id),
    }));
  });
}

/** Signs one device out. Returns false if it is not a session of this village. */
export async function revokeSession(actor: Actor, sessionId: string): Promise<boolean> {
  if (!isUuid(sessionId)) return false;
  return withVillage(actor.villageId, async (tx) => {
    const removed = await tx
      .delete(sessions)
      .where(and(eq(sessions.id, sessionId), inArray(sessions.userId, villageUserIds(tx, actor.villageId))))
      .returning({ id: sessions.id, userId: sessions.userId });
    if (removed.length === 0) return false;
    await recordAudit(tx, actor, {
      action: "delete",
      tableName: "sessions",
      recordId: sessionId,
      changes: { userId: [removed[0].userId, null] },
    });
    return true;
  });
}

async function findVillageUser(tx: Tx, villageId: string, userId: string) {
  const [user] = await tx
    .select({ id: users.id, disabledAt: users.disabledAt })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.villageId, villageId)));
  return user ?? null;
}

/** Signs a user out on every device. */
export async function revokeUserSessions(actor: Actor, userId: string): Promise<boolean> {
  if (!isUuid(userId)) return false;
  return withVillage(actor.villageId, async (tx) => {
    if (!(await findVillageUser(tx, actor.villageId, userId))) return false;
    const removed = await tx.delete(sessions).where(eq(sessions.userId, userId)).returning({ id: sessions.id });
    await recordAudit(tx, actor, {
      action: "delete",
      tableName: "sessions",
      recordId: userId,
      changes: { sessions: [removed.length, 0] },
    });
    return true;
  });
}

export type DisableResult = "done" | "notFound" | "self";

/** Disables (or re-enables) an account; disabling also signs it out everywhere. */
export async function setUserDisabled(actor: Actor, userId: string, disabled: boolean): Promise<DisableResult> {
  if (!isUuid(userId)) return "notFound";
  // Admins cannot lock themselves out.
  if (userId === actor.id) return "self";
  return withVillage(actor.villageId, async (tx) => {
    const user = await findVillageUser(tx, actor.villageId, userId);
    if (!user) return "notFound";

    const disabledAt = disabled ? (user.disabledAt ?? new Date()) : null;
    await tx.update(users).set({ disabledAt }).where(eq(users.id, userId));
    if (disabled) await tx.delete(sessions).where(eq(sessions.userId, userId));
    await recordAudit(tx, actor, {
      action: "update",
      tableName: "users",
      recordId: userId,
      changes: { disabledAt: [user.disabledAt?.toISOString() ?? null, disabledAt?.toISOString() ?? null] },
    });
    return "done";
  });
}
