import { randomInt } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import type { Db } from "@/db";
import { accounts, users } from "@/db/schema";

export const newUserSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("admin"), villageId: z.uuid() }),
  z.object({ role: z.literal("superadmin"), villageId: z.undefined().optional() }),
]).and(
  z.object({
    // Matches the Better Auth username plugin's default rules.
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_.]{3,30}$/, "username must be 3-30 of a-z, 0-9, _ or ."),
    name: z.string().trim().min(1),
    password: z.string().min(8),
  }),
);

export type NewUser = z.input<typeof newUserSchema>;

/**
 * Creates a user with a password login. Users have no real email address,
 * but Better Auth requires a unique one, so a non-routable placeholder is used.
 */
export async function createUser(db: Db, input: NewUser) {
  const data = newUserSchema.parse(input);
  const passwordHash = await hashPassword(data.password);

  return db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        name: data.name,
        email: `${data.username}@users.chumchon.invalid`,
        username: data.username,
        displayUsername: data.username,
        role: data.role,
        villageId: data.villageId,
      })
      .returning({ id: users.id });

    await tx.insert(accounts).values({
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: passwordHash,
    });
    return user;
  });
}

// No 0/O, 1/l/I: the headman may read the password aloud or copy it by hand.
const PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePassword(length = 12): string {
  return Array.from({ length }, () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)]).join("");
}
