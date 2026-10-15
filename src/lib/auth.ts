import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { isLocked, recordFailedSignIn, recordSuccessfulSignIn } from "./sign-in-lockout";

const PASSWORD_SIGN_IN = "/sign-in/username";

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
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== PASSWORD_SIGN_IN || typeof ctx.body?.username !== "string") return;
      if (await isLocked(getDb(), ctx.body.username)) {
        throw new APIError("TOO_MANY_REQUESTS", { message: "Account temporarily locked" });
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== PASSWORD_SIGN_IN || typeof ctx.body?.username !== "string") return;
      const returned = ctx.context.returned;
      if (isAPIError(returned)) {
        if (returned.statusCode === 401) await recordFailedSignIn(getDb(), ctx.body.username);
      } else {
        await recordSuccessfulSignIn(getDb(), ctx.body.username);
      }
    }),
  },
  rateLimit: {
    // On by default in production only. Limits are per client IP.
    window: 60,
    max: 100,
    customRules: { [PASSWORD_SIGN_IN]: { window: 60, max: 10 } },
  },
  advanced: {
    database: { generateId: "uuid" },
    // The app is only reachable through a tunnel (Tailscale Funnel or
    // Cloudflare Tunnel); without its client IP header every visitor would
    // share the tunnel's address. Trust only the header the tunnel in use
    // sets: any other could be sent by the visitor to dodge rate limits.
    ipAddress: { ipAddressHeaders: [process.env.CLIENT_IP_HEADER || "x-forwarded-for"] },
  },
  plugins: [username(), nextCookies()],
});
