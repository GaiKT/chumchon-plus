import { expect, test } from "@playwright/test";
import { E2E } from "./fixtures";
import { openMenu, signIn } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signIn(page, E2E.admin.username);
});

test("a new house shows up in this month's changes", async ({ page }) => {
  await page.getByRole("link", { name: "เพิ่มบ้าน" }).click();
  await page.getByLabel("บ้านเลขที่").fill("66");
  await page.getByRole("button", { name: "บันทึก" }).click();
  await expect(page.getByRole("heading", { name: "บ้านเลขที่ 66" })).toBeVisible();

  await openMenu(page);
  await page.getByRole("menuitem", { name: "ความเปลี่ยนแปลงรายเดือน" }).click();
  await expect(page.getByRole("heading", { name: "ความเปลี่ยนแปลงรายเดือน" })).toBeVisible();
  const newHouses = page.getByRole("list", { name: "บ้านใหม่" });
  await expect(newHouses).toContainText("บ้านเลขที่ 66");
  await expect(newHouses).toContainText(`บันทึกโดย ${E2E.admin.name}`);

  await newHouses.getByRole("link", { name: /บ้านเลขที่ 66/ }).click();
  await expect(page.getByRole("heading", { name: "บ้านเลขที่ 66" })).toBeVisible();
});

test("goes back a month and cannot go past the current one", async ({ page }) => {
  await page.goto("/changes");
  await page.getByRole("link", { name: "เดือนก่อน" }).click();
  await expect(page).toHaveURL(/month=\d{4}-\d{2}/);
  await expect(page.getByRole("link", { name: "เดือนถัดไป" })).toBeVisible();

  await page.goto("/changes?month=2999-01");
  await expect(page.getByRole("link", { name: "เดือนถัดไป" })).toHaveCount(0);
});
