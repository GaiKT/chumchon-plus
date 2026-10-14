import { expect, test } from "@playwright/test";
import { E2E } from "./fixtures";
import { signIn } from "./helpers";

test("sends security headers on every page", async ({ request }) => {
  const response = await request.get("/login");
  const headers = response.headers();
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["content-security-policy"]).toContain("object-src 'none'");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("no-referrer");
  expect(headers["x-robots-tag"]).toBe("noindex, nofollow");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("tells search engines to stay away", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Disallow: \/\s*$/m);
});

test("keeps the session cookie out of reach of scripts", async ({ page, context }) => {
  await signIn(page, E2E.admin.username);
  const cookie = (await context.cookies()).find((c) => c.name.includes("session_token"));
  expect(cookie).toMatchObject({ httpOnly: true, sameSite: "Lax" });
  expect(await page.evaluate(() => document.cookie)).not.toContain("session_token");
});
