import { expect, test, type Page } from "@playwright/test";
import { E2E } from "./fixtures";
import { signIn } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signIn(page, E2E.admin.username);
});

async function addMember(page: Page, firstName: string, lastName: string) {
  await page.getByRole("link", { name: "เพิ่มสมาชิก" }).click();
  await page.getByLabel("ชื่อ", { exact: true }).fill(firstName);
  await page.getByLabel("นามสกุล").fill(lastName);
  await page.getByRole("button", { name: "บันทึก" }).click();
  await expect(page.getByRole("list", { name: "สมาชิกในบ้าน" })).toContainText(firstName);
}

test("adds a house and its members, hands over when the head dies", async ({ page }) => {
  await page.getByRole("link", { name: "เพิ่มบ้าน" }).click();
  await page.getByLabel("บ้านเลขที่").fill("1");
  await page.getByRole("button", { name: "บันทึก" }).click();
  await expect(page.getByText("บ้านเลขที่นี้มีอยู่ในระบบแล้ว")).toBeVisible();

  await page.getByLabel("บ้านเลขที่").fill("99");
  await page.getByRole("button", { name: "บันทึก" }).click();
  await expect(page.getByRole("heading", { name: "บ้านเลขที่ 99" })).toBeVisible();
  await expect(page.getByText("บ้านว่าง", { exact: true })).toBeVisible();

  await addMember(page, "พ่อบ้านใหม่", "เก้าสิบเก้า");
  await addMember(page, "แม่บ้านใหม่", "เก้าสิบเก้า");

  // Make the father the head.
  await page.getByRole("link", { name: "แก้ไขข้อมูลบ้าน" }).click();
  await page.getByLabel("หัวหน้าครัวเรือน", { exact: true }).selectOption({ label: "พ่อบ้านใหม่ เก้าสิบเก้า" });
  await page.getByRole("button", { name: "บันทึก" }).click();
  const members = page.getByRole("list", { name: "สมาชิกในบ้าน" });
  await expect(members.getByRole("listitem").first()).toContainText("หัวหน้าครัวเรือน");
  await expect(members.getByRole("listitem").first()).toContainText("พ่อบ้านใหม่");

  // The head dies: a successor must be chosen.
  await page.getByRole("link", { name: "แก้ไขข้อมูล พ่อบ้านใหม่ เก้าสิบเก้า" }).click();
  await page.getByLabel("สถานะ").selectOption({ label: "เสียชีวิต" });
  await expect(page.getByText("บุคคลนี้เป็นหัวหน้าครัวเรือน")).toBeVisible();
  await page.getByRole("button", { name: "บันทึก" }).click();
  await expect(page.getByText("กรุณาเลือกหัวหน้าครัวเรือนคนใหม่จากสมาชิกที่ยังอาศัยอยู่")).toBeVisible();
  // A rejected submit must not silently reset the selects (React resets forms after actions).
  await expect(page.getByLabel("สถานะ")).toHaveValue("deceased");
  await expect(page.getByLabel("บ้านเลขที่ (เปลี่ยนเพื่อย้ายบ้าน)")).toHaveValue(/[0-9a-f-]{36}/);
  await expect(page.getByLabel("บ้านเลขที่ (เปลี่ยนเพื่อย้ายบ้าน)").locator("option:checked")).toHaveText("99");

  await page.getByLabel("หัวหน้าครัวเรือนคนใหม่").selectOption({ label: "แม่บ้านใหม่ เก้าสิบเก้า" });
  await page.getByRole("button", { name: "บันทึก" }).click();

  await expect(page.getByRole("heading", { name: "บ้านเลขที่ 99" })).toBeVisible();
  await expect(members.getByRole("listitem")).toHaveCount(1);
  await expect(members).toContainText("แม่บ้านใหม่");
  await expect(members).toContainText("หัวหน้าครัวเรือน");
  await expect(page.getByRole("list", { name: "อดีตสมาชิก" })).toContainText("เสียชีวิต");
});

test("finds people who moved out only when asked to", async ({ page }) => {
  const box = page.getByLabel("ค้นหาลูกบ้าน");
  await box.fill(E2E.movedOut.firstName);
  await expect(page.getByText("ไม่พบลูกบ้านที่ตรงกับคำค้น")).toBeVisible();

  await page.getByLabel("รวมผู้ที่ย้ายออก/เสียชีวิต").check();
  await expect(page).toHaveURL(/all=1/);
  const card = page.getByRole("list", { name: "ผลการค้นหา" }).getByRole("listitem");
  await expect(card).toContainText(E2E.movedOut.firstName);
  await expect(card).toContainText("ย้ายออก");
});
