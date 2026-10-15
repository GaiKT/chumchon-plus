import { expect, test } from "@playwright/test";
import { householdIdOf } from "./db-fixtures";
import { E2E } from "./fixtures";
import { signIn } from "./helpers";

const { resident } = E2E;
const name = `${resident.title}${resident.firstName} ${resident.lastName}`;

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await signIn(page, E2E.admin.username);
  await page.goto(`/households/${await householdIdOf(resident)}`);
});

function clipboard(page: import("@playwright/test").Page) {
  return page.evaluate(() => navigator.clipboard.readText());
}

test("copies single fields and confirms with a toast", async ({ page }) => {
  await page.getByRole("button", { name: `คัดลอกชื่อ ${name}` }).click();
  await expect(page.getByRole("status")).toHaveText("คัดลอกเรียบร้อยแล้ว");
  expect(await clipboard(page)).toBe(name);

  await page.getByRole("button", { name: "คัดลอกบ้านเลขที่ 1" }).click();
  expect(await clipboard(page)).toBe("1");

  await page.getByRole("button", { name: "คัดลอกเบอร์โทร 081-234-5678" }).click();
  expect(await clipboard(page)).toBe("0812345678");
});

test("copies the whole record in the agreed format", async ({ page }) => {
  await page.getByRole("button", { name: `คัดลอกข้อมูลทั้งหมดของ ${name}` }).click();
  const text = await clipboard(page);
  // The OS clipboard may store Windows line endings.
  expect(text.split(/\r?\n/)).toEqual([
    `${name} (${resident.nickname})`,
    "บ้านเลขที่ 1 หมู่ 9 ต.ทดสอบ",
    expect.stringMatching(/^อายุ \d+ ปี โทร 081-234-5678$/),
  ]);
});

test("the phone number is a tap-to-call link", async ({ page }) => {
  await expect(page.getByRole("link", { name: "081-234-5678" })).toHaveAttribute("href", "tel:0812345678");
});
