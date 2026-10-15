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

test("finds a resident by first name, last name or nickname", async ({ page }) => {
  const box = page.getByLabel("ค้นหาลูกบ้าน");
  for (const term of [resident.firstName, resident.lastName, resident.nickname]) {
    await box.fill(term);
    await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(term)}`));
    await expect(results(page).getByRole("listitem")).toHaveCount(1);
  }
});

test("shows name, nickname, house number and age on the card", async ({ page }) => {
  await page.getByLabel("ค้นหาลูกบ้าน").fill(resident.nickname);
  const card = results(page).getByRole("listitem");
  await expect(card).toContainText(`${resident.title}${resident.firstName} ${resident.lastName}`);
  await expect(card).toContainText(`ชื่อเล่น ${resident.nickname}`);
  await expect(card).toContainText("บ้านเลขที่ 1");
  await expect(card).toContainText(/อายุ \d+ ปี/);
});

test("ignores the title in the query", async ({ page }) => {
  await page.getByLabel("ค้นหาลูกบ้าน").fill(`นาย${resident.firstName}`);
  await expect(results(page).getByRole("listitem")).toHaveCount(1);
});

test("does not search a single character", async ({ page }) => {
  await page.getByLabel("ค้นหาลูกบ้าน").fill("ท");
  await page.waitForTimeout(600);
  await expect(page).not.toHaveURL(/q=/);
  await expect(page.getByText("อย่างน้อย 2 ตัวอักษร")).toBeVisible();
});

test("says so when nothing matches", async ({ page }) => {
  await page.getByLabel("ค้นหาลูกบ้าน").fill("ไม่มีชื่อนี้แน่นอน");
  await expect(page.getByText("ไม่พบลูกบ้านที่ตรงกับคำค้น")).toBeVisible();
});

test("fits a 360px wide screen without horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.getByLabel("ค้นหาลูกบ้าน").fill(resident.firstName);
  await expect(results(page)).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test("finds residents by house number from a single digit", async ({ page }) => {
  await page.getByLabel("ค้นหาลูกบ้าน").fill("1");
  await expect(page).toHaveURL(/q=1$/);
  const card = results(page).getByRole("listitem");
  await expect(card).toHaveCount(1);
  await expect(card).toContainText("บ้านเลขที่ 1");
});
