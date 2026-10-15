import { expect, test } from "@playwright/test";
import { E2E } from "./fixtures";
import { signIn } from "./helpers";

const { resident } = E2E;

test.beforeEach(async ({ page }) => {
  await signIn(page, E2E.admin.username);
});

function results(page: import("@playwright/test").Page) {
  return page.getByRole("list", { name: "ผลการค้นหา" });
}

test("an age shortcut lists everyone matching it without typing a name", async ({ page }) => {
  const shortcut = page.getByRole("link", { name: "ต่ำกว่า 18 ปี" });
  await shortcut.click();
  await expect(page).toHaveURL(/max=17/);
  await expect(shortcut).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("ไม่พบลูกบ้านที่ตรงกับเงื่อนไข")).toBeVisible();

  // Tapping it again clears it.
  await shortcut.click();
  await expect(page).not.toHaveURL(/max=/);
  await expect(page.getByText("อย่างน้อย 2 ตัวอักษร")).toBeVisible();
});

test("an age range lists current residents only, and survives a trip to the household", async ({ page }) => {
  await page.getByText("ตัวกรองเพิ่มเติม").click();
  await page.getByLabel("อายุตั้งแต่ (ปี)").fill("18");
  await page.getByRole("button", { name: "ใช้ตัวกรอง" }).click();
  await expect(page).toHaveURL(/min=18/);
  await expect(page.getByText("อายุ 18 ปีขึ้นไป")).toBeVisible();
  await expect(results(page)).toContainText(resident.firstName);
  await expect(results(page)).not.toContainText(E2E.movedOut.firstName);
  await expect(page.getByText(E2E.otherResident.firstName)).toHaveCount(0);

  await results(page).getByRole("link", { name: new RegExp(resident.firstName) }).click();
  await expect(page.getByRole("heading", { name: "บ้านเลขที่ 1" })).toBeVisible();
  await page.getByRole("button", { name: "กลับไปหน้าค้นหา" }).click();
  await expect(page).toHaveURL(/min=18/);
  await expect(results(page)).toContainText(resident.firstName);
});

test("typing a name keeps the filter and narrows the results", async ({ page }) => {
  await page.goto("/?min=60");
  await expect(page.getByText("ไม่พบลูกบ้านที่ตรงกับเงื่อนไข")).toBeVisible();
  await page.getByLabel("ค้นหาลูกบ้าน").fill(resident.firstName);
  await expect(page).toHaveURL(/min=60.*q=|q=.*min=60/);
  await expect(page.getByText("ไม่พบลูกบ้านที่ตรงกับคำค้น")).toBeVisible();

  await page.getByRole("link", { name: "ล้างตัวกรอง" }).click();
  await expect(page).not.toHaveURL(/min=/);
  await expect(results(page)).toContainText(resident.firstName);
});
