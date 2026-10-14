import { expect, type Page } from "@playwright/test";
import { E2E_PASSWORD } from "./fixtures";

export async function signIn(page: Page, username: string, password = E2E_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("ชื่อผู้ใช้").fill(username);
  await page.getByLabel("รหัสผ่าน").fill(password);
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  if (password === E2E_PASSWORD) await expect(page).not.toHaveURL(/\/login$/);
}
