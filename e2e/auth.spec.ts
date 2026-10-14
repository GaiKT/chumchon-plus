import { expect, test, type Page } from "@playwright/test";
import { E2E, E2E_PASSWORD } from "./fixtures";

async function signIn(page: Page, username: string, password = E2E_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("ชื่อผู้ใช้").fill(username);
  await page.getByLabel("รหัสผ่าน").fill(password);
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
}

test("visitors without a session are sent to the login page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});

test("a wrong password shows an error and stays on the login page", async ({ page }) => {
  await signIn(page, E2E.admin.username, "wrong-password");
  await expect(page.getByText("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("an admin sees only their own village and can sign out", async ({ page }) => {
  await signIn(page, E2E.admin.username);

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(E2E.admin.name)).toBeVisible();
  await expect(page.getByText(E2E.resident.firstName)).toBeVisible();
  await expect(page.getByText(E2E.otherResident.firstName)).toHaveCount(0);

  await page.getByRole("button", { name: "ออกจากระบบ" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});

test("a superadmin cannot see resident data", async ({ page }) => {
  await signIn(page, E2E.superadmin.username);

  await expect(page.getByText("บัญชีผู้ดูแลระบบไม่สามารถดูข้อมูลลูกบ้านได้")).toBeVisible();
  await expect(page.getByText(E2E.resident.firstName)).toHaveCount(0);
});
