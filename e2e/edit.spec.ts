import { expect, test, type Page } from "@playwright/test";
import { householdIdOf } from "./db-fixtures";
import { E2E } from "./fixtures";
import { signIn } from "./helpers";

// Edits the moved-out fixture person so other specs' expectations stay intact.
const person = E2E.movedOut;
const name = `${person.firstName} ${person.lastName}`;

test.beforeEach(async ({ page }) => {
  await signIn(page, E2E.admin.username);
  await page.goto(`/households/${await householdIdOf(person)}`);
  await page.getByRole("link", { name: `แก้ไขข้อมูล ${name}` }).click();
  await expect(page.getByRole("heading", { name: `แก้ไขข้อมูล ${name}` })).toBeVisible();
});

const birthDay = (page: Page) => page.getByLabel("วัน", { exact: true });
const birthMonth = (page: Page) => page.getByLabel("เดือน", { exact: true });
const birthYear = (page: Page) => page.getByLabel("ปี พ.ศ.", { exact: true });

test("updates a phone number and shows it on the household page", async ({ page }) => {
  await page.getByLabel("เบอร์โทร", { exact: true }).fill("089-999-8888");
  await page.getByRole("button", { name: "บันทึก" }).click();

  await expect(page).toHaveURL(/\/households\/[0-9a-f-]+\?person=/);
  await expect(page.getByRole("link", { name: "089-999-8888" })).toBeVisible();

  // Saving replaced the form in the history, so "back" does not reopen it.
  await page.goBack();
  await expect(page).not.toHaveURL(/\/edit$/);
});

test("rejects invalid input, explains why and keeps what was typed", async ({ page }) => {
  await page.getByLabel("ชื่อเล่น").fill("ชื่อเล่นใหม่");
  await page.getByLabel("เบอร์โทร", { exact: true }).fill("12345");
  await page.getByRole("button", { name: "บันทึก" }).click();

  await expect(page.getByText("เบอร์โทรไม่ถูกต้อง")).toBeVisible();
  await expect(page.getByLabel("เบอร์โทร", { exact: true })).toHaveValue("12345");
  await expect(page.getByLabel("เบอร์โทร", { exact: true })).toBeFocused();
  await expect(page.getByLabel("ชื่อเล่น")).toHaveValue("ชื่อเล่นใหม่");
  await expect(page).toHaveURL(/\/persons\/[0-9a-f-]+\/edit$/);
});

test("picks a birth date in the Buddhist era and shows it back", async ({ page }) => {
  await birthYear(page).selectOption("2515");
  await birthMonth(page).selectOption({ label: "มีนาคม" });
  await birthDay(page).selectOption("15");
  await page.getByRole("button", { name: "บันทึก" }).click();
  await expect(page).toHaveURL(/\/households\//);

  await page.getByRole("link", { name: `แก้ไขข้อมูล ${name}` }).click();
  await expect(birthDay(page)).toHaveValue("15");
  await expect(birthMonth(page)).toHaveValue("3");
  await expect(birthYear(page)).toHaveValue("2515");
});

test("a birth date cannot be 31 February, and a half-filled one is refused", async ({ page }) => {
  await birthDay(page).selectOption("31");
  await birthMonth(page).selectOption({ label: "กุมภาพันธ์" });
  await expect(birthDay(page)).toHaveValue("");
  await expect(birthDay(page).locator("option", { hasText: /^30$/ })).toHaveCount(0);

  await page.getByRole("button", { name: "บันทึก" }).click();
  await expect(page.getByText("วันเกิดไม่ครบ")).toBeVisible();
  await expect(birthMonth(page)).toHaveValue("2");
});

test("the app bar goes home from any page in one tap", async ({ page }) => {
  await page.getByRole("link", { name: "หน้าแรก" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByLabel("ค้นหาลูกบ้าน")).toBeVisible();
});

// Last: it changes the name the other tests use to find the edit link.
test("a title not in the list can be typed under 'อื่นๆ'", async ({ page }) => {
  await page.getByLabel("คำนำหน้า", { exact: true }).selectOption({ label: "อื่นๆ (พิมพ์เอง)" });
  await expect(page.getByLabel("คำนำหน้า (พิมพ์เอง)")).toBeFocused();
  await page.getByLabel("คำนำหน้า (พิมพ์เอง)").fill("ร.ต.อ.");
  await page.getByRole("button", { name: "บันทึก" }).click();
  await expect(page.getByRole("list", { name: "อดีตสมาชิก" })).toContainText(`ร.ต.อ.${person.firstName}`);

  await page.getByRole("link", { name: `แก้ไขข้อมูล ร.ต.อ.${name}` }).click();
  await expect(page.getByLabel("คำนำหน้า (พิมพ์เอง)")).toHaveValue("ร.ต.อ.");
});
