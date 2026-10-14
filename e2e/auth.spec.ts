import { expect, test } from "@playwright/test";
import { E2E } from "./fixtures";
import { signIn } from "./helpers";

test("visitors without a session are sent to the login page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});

test("a wrong password shows an error and stays on the login page", async ({ page }) => {
  await signIn(page, E2E.admin.username, "wrong-password");
  await expect(page.getByText("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("an admin can sign in and sign out", async ({ page }) => {
  await signIn(page, E2E.admin.username);

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(E2E.admin.name)).toBeVisible();

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
