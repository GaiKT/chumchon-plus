import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
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
  plugins: [username(), nextCookies()],
});
