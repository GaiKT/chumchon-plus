import { expect, test, type Page } from "@playwright/test";
import { householdIdOf, personIdOf } from "./db-fixtures";
import { E2E } from "./fixtures";
import { signIn } from "./helpers";

/** Width and height from a PNG's IHDR chunk. */
function pngSize(buffer: Buffer) {
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test("serves an installable manifest with PNG icons, without signing in", async ({ request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ name: "ชุมชนพลัส", display: "standalone", start_url: "/" });

  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.headers()["content-type"]).toBe("image/png");
    const [width] = icon.sizes.split("x").map(Number);
    expect(pngSize(await response.body())).toEqual({ width, height: width });
  }

  const appleIcon = await request.get("/apple-icon");
  expect(appleIcon.headers()["content-type"]).toBe("image/png");
});

test("links the manifest and iOS home screen icon from pages", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
});

async function storedState(page: Page) {
  return page.evaluate(async () => ({
    localStorage: Object.keys(localStorage),
    sessionStorage: Object.keys(sessionStorage),
    caches: await caches.keys(),
    indexedDB: (await indexedDB.databases()).map((d) => d.name),
    serviceWorkers: (await navigator.serviceWorker.getRegistrations()).length,
  }));
}

test("keeps no resident data in browser storage", async ({ page }) => {
  await signIn(page, E2E.admin.username);
  await page.getByLabel("ค้นหาลูกบ้าน").fill(E2E.resident.firstName);
  await page.getByRole("link", { name: new RegExp(E2E.resident.firstName) }).click();
  await expect(page.getByRole("heading", { name: "บ้านเลขที่ 1" })).toBeVisible();

  expect(await storedState(page)).toEqual({
    localStorage: [],
    sessionStorage: [],
    caches: [],
    indexedDB: [],
    serviceWorkers: 0,
  });
});

test.describe("at 360px wide", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("pages fit without horizontal scrolling and buttons are easy to tap", async ({ page }) => {
    await signIn(page, E2E.admin.username);
    const householdId = await householdIdOf(E2E.resident);
    const personId = await personIdOf(E2E.resident);

    for (const path of [
      "/",
      `/?q=${encodeURIComponent(E2E.resident.firstName)}`,
      `/households/${householdId}`,
      `/households/${householdId}/edit`,
      `/persons/${personId}/edit`,
      "/households/new",
      "/devices",
      "/trash",
    ]) {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow on ${path}`).toBe(0);

      for (const button of await page.locator("main button:visible").all()) {
        const box = await button.boundingBox();
        expect(box!.height, `button "${await button.textContent()}" on ${path}`).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
