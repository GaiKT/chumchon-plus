import { expect, test } from "@playwright/test";
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

test("updates a phone number and shows it on the household page", async ({ page }) => {
  await page.getByLabel("เบอร์โทร").fill("089-999-8888");
  await page.getByRole("button", { name: "บันทึก" }).click();

  await expect(page).toHaveURL(/\/households\/[0-9a-f-]+\?person=/);
  await expect(page.getByRole("link", { name: "089-999-8888" })).toBeVisible();
});

test("rejects invalid input, explains why and keeps what was typed", async ({ page }) => {
  await page.getByLabel("ชื่อเล่น").fill("ชื่อเล่นใหม่");
  await page.getByLabel("วันเกิด").fill("31/02/2520");
  await page.getByRole("button", { name: "บันทึก" }).click();

  await expect(page.getByText("วันเกิดไม่ถูกต้อง")).toBeVisible();
  await expect(page.getByLabel("วันเกิด")).toHaveValue("31/02/2520");
  await expect(page.getByLabel("ชื่อเล่น")).toHaveValue("ชื่อเล่นใหม่");
  await expect(page).toHaveURL(/\/persons\/[0-9a-f-]+\/edit$/);
});

test("shows the birth date in the Buddhist era and accepts it back", async ({ page }) => {
  await page.getByLabel("วันเกิด").fill("15/03/2515");
  await page.getByRole("button", { name: "บันทึก" }).click();
  await expect(page).toHaveURL(/\/households\//);

  await page.getByRole("link", { name: `แก้ไขข้อมูล ${name}` }).click();
  await expect(page.getByLabel("วันเกิด")).toHaveValue("15/03/2515");
});
