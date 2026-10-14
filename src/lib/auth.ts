import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as schema from "@/db/schema";

const DAY = 60 * 60 * 24;

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  advanced: { database: { generateId: "uuid" } },
  emailAndPassword: {
    enabled: true,
    // Accounts are created by a superadmin (CLI) or by invitation, never self-service.
    disableSignUp: true,
  },
  session: {
    // Sliding 30-day sessions stored in the database. No cookie cache, so
    // revoking a session takes effect on the very next request.
    expiresIn: 30 * DAY,
    updateAge: DAY,
  },
  user: {
    additionalFields: {
      role: { type: "string", required: true, input: false },
      villageId: { type: "string", required: false, input: false },
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Disabled accounts cannot start a session by any sign-in method.
        before: async (session) => {
          const [user] = await getDb()
            .select({ disabledAt: schema.users.disabledAt })
            .from(schema.users)
            .where(eq(schema.users.id, session.userId));
          return user?.disabledAt ? false : undefined;
        },
      },
    },
  },
  plugins: [username(), nextCookies()],
});
