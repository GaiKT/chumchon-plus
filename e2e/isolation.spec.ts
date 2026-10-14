import { expect, test } from "@playwright/test";
import { E2E } from "./fixtures";
import { signIn } from "./helpers";

// Village A's admin must never see village B's residents, on any page.
// Every new page that shows or edits resident data adds a case here.

test.beforeEach(async ({ page }) => {
  await signIn(page, E2E.admin.username);
});

test("search finds only the user's own village", async ({ page }) => {
  // Both fixture residents' first names start with "ทดสอบ".
  await page.getByLabel("ค้นหาลูกบ้าน").fill("ทดสอบ");
  const results = page.getByRole("list", { name: "ผลการค้นหา" });
  await expect(results.getByText(E2E.resident.firstName)).toBeVisible();
  await expect(results.getByRole("listitem")).toHaveCount(1);

  // Typo tolerance may surface similar names from the user's own village,
  // but never the other village's resident.
  await page.getByLabel("ค้นหาลูกบ้าน").fill(E2E.otherResident.firstName);
  await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(E2E.otherResident.firstName)}`));
  await expect(page.getByText("กำลังค้นหา...")).toHaveCount(0);
  await expect(page.getByText(E2E.otherResident.firstName)).toHaveCount(0);
  await expect(page.getByText(E2E.otherResident.lastName)).toHaveCount(0);
});

test("house number search finds only the user's own village", async ({ page }) => {
  // Both fixture villages have a house numbered 1.
  await page.getByLabel("ค้นหาลูกบ้าน").fill("1");
  const results = page.getByRole("list", { name: "ผลการค้นหา" });
  await expect(results.getByRole("listitem")).toHaveCount(1);
  await expect(results.getByText(E2E.resident.firstName)).toBeVisible();
});
