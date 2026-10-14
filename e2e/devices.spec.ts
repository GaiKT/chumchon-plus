import { expect, test } from "@playwright/test";
import { E2E } from "./fixtures";
import { signIn } from "./helpers";

test("signs out a lost phone from another device", async ({ page, browser }) => {
  // The "lost phone": a second browser signed in as the same admin.
  const lostContext = await browser.newContext();
  const lostPhone = await lostContext.newPage();
  await signIn(lostPhone, E2E.admin.username);
  await expect(lostPhone.getByLabel("ค้นหาลูกบ้าน")).toBeVisible();

  await signIn(page, E2E.admin.username);
  await page.getByRole("link", { name: "อุปกรณ์" }).click();
  const account = page.getByRole("region", { name: `บัญชี ${E2E.admin.name}` });
  await expect(account).toContainText("อุปกรณ์นี้");

  // Sessions are listed most recent first, and other specs leave older ones
  // behind, so the newest session that is not this device is the lost phone.
  const devices = account.getByRole("listitem");
  const before = await devices.count();
  const lostPhoneRow = devices.filter({ hasNotText: "อุปกรณ์นี้" }).first();
  await lostPhoneRow.getByRole("button", { name: /^ออกจากระบบ/ }).click();
  await expect(devices).toHaveCount(before - 1);

  await lostPhone.reload();
  await expect(lostPhone).toHaveURL(/\/login$/);
  await lostContext.close();
});

test("does not offer to disable your own account", async ({ page }) => {
  await signIn(page, E2E.admin.username);
  await page.goto("/devices");
  const account = page.getByRole("region", { name: `บัญชี ${E2E.admin.name}` });
  await expect(account.getByRole("button", { name: /ปิดใช้งานบัญชี/ })).toHaveCount(0);
});
