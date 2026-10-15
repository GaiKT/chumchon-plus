import { expect, test } from "@playwright/test";
import { E2E } from "./fixtures";
import { signIn } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signIn(page, E2E.admin.username);
});

test("deletes a mistaken entry after typed confirmation, then restores it", async ({ page }) => {
  // A house of its own, so the restored entry does not affect other specs.
  await page.getByRole("link", { name: "เพิ่มบ้าน" }).click();
  await page.getByLabel("บ้านเลขที่").fill("77");
  await page.getByRole("button", { name: "บันทึก" }).click();
  await page.getByRole("link", { name: "เพิ่มสมาชิก" }).click();
  await page.getByLabel("ชื่อ", { exact: true }).fill("กรอกซ้ำ");
  await page.getByLabel("นามสกุล").fill("ลบทิ้งได้");
  await page.getByRole("button", { name: "บันทึก" }).click();

  await page.getByRole("link", { name: "แก้ไขข้อมูล กรอกซ้ำ ลบทิ้งได้" }).click();
  await page.getByRole("button", { name: "ลบข้อมูลบุคคลนี้ (กรอกผิดหรือซ้ำ)" }).click();
  const confirm = page.getByRole("button", { name: "ยืนยันการลบ" });
  await expect(confirm).toBeDisabled();
  await page.getByLabel(/เพื่อยืนยัน/).fill("กรอกซ้ำ ลบทิ้งได้");
  await confirm.click();

  await expect(page.getByRole("heading", { name: "บ้านเลขที่ 77" })).toBeVisible();
  await expect(page.getByText("บ้านว่าง", { exact: true })).toBeVisible();

  await page.goto("/trash");
  const deleted = page.getByRole("list", { name: "บุคคลที่ถูกลบ" });
  await expect(deleted).toContainText("กรอกซ้ำ ลบทิ้งได้");
  await expect(deleted).toContainText("เหลือเวลากู้คืน 30 วัน");
  await page.getByRole("button", { name: "กู้คืน กรอกซ้ำ ลบทิ้งได้" }).click();
  await expect(page.getByText("ไม่มีรายการที่ถูกลบ")).toBeVisible();

  await page.goto("/?q=" + encodeURIComponent("กรอกซ้ำ"));
  await expect(page.getByRole("list", { name: "ผลการค้นหา" })).toContainText("กรอกซ้ำ ลบทิ้งได้");
});

test("will not delete a house that still has residents", async ({ page }) => {
  await page.getByLabel("ค้นหาลูกบ้าน").fill("1");
  await page.getByRole("link", { name: new RegExp(E2E.resident.firstName) }).click();
  await page.getByRole("link", { name: "แก้ไขข้อมูลบ้าน" }).click();
  await page.getByRole("button", { name: "ลบข้อมูลบ้านนี้ (กรอกผิดหรือซ้ำ)" }).click();
  await page.getByLabel(/เพื่อยืนยัน/).fill("1");
  await page.getByRole("button", { name: "ยืนยันการลบ" }).click();
  await expect(page.getByText("ยังมีผู้อาศัยอยู่ในบ้านนี้ กรุณาย้ายหรือลบสมาชิกก่อน")).toBeVisible();
});
