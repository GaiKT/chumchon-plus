import { expect, test } from "@playwright/test";
import { householdIdOf } from "./db-fixtures";
import { E2E } from "./fixtures";
import { signIn } from "./helpers";

const { resident } = E2E;

test.beforeEach(async ({ page }) => {
  await signIn(page, E2E.admin.username);
});

test("opens the household from a search result and highlights the person", async ({ page }) => {
  await page.getByLabel("ค้นหาลูกบ้าน").fill(resident.nickname);
  await page.getByRole("link", { name: new RegExp(resident.firstName) }).click();

  await expect(page).toHaveURL(/\/households\/[0-9a-f-]+\?person=/);
  await expect(page.getByRole("heading", { name: "บ้านเลขที่ 1" })).toBeVisible();
  const member = page.locator("li[aria-current=true]");
  await expect(member).toContainText(`${resident.title}${resident.firstName} ${resident.lastName}`);
});

test("going back keeps the search query and results", async ({ page }) => {
  await page.getByLabel("ค้นหาลูกบ้าน").fill(resident.nickname);
  await page.getByRole("link", { name: new RegExp(resident.firstName) }).click();
  await expect(page).toHaveURL(/\/households\//);

  await page.getByRole("button", { name: "กลับไปหน้าค้นหา" }).click();
  await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(resident.nickname)}`));
  await expect(page.getByLabel("ค้นหาลูกบ้าน")).toHaveValue(resident.nickname);
  await expect(page.getByRole("link", { name: new RegExp(resident.firstName) })).toBeVisible();
});

test("shows an empty house with its former members", async ({ page }) => {
  const id = await householdIdOf(E2E.movedOut);
  await page.goto(`/households/${id}`);
  await expect(page.getByText("บ้านว่าง", { exact: true })).toBeVisible();
  const former = page.getByRole("list", { name: "อดีตสมาชิก" });
  await expect(former).toContainText(E2E.movedOut.firstName);
  await expect(former).toContainText("ย้ายออก");
});
