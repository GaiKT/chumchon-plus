import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { householdIdOf, personIdOf } from "./db-fixtures";
import { E2E } from "./fixtures";
import { openMenu, signIn } from "./helpers";

async function expectNoViolations(page: Page, where: string) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const summary = violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  expect(summary, `accessibility problems on ${where}`).toEqual([]);
}

test("the login page has no accessibility problems", async ({ page }) => {
  await page.goto("/login");
  await expectNoViolations(page, "/login");
});

test("signed-in pages have no accessibility problems", async ({ page }) => {
  await signIn(page, E2E.admin.username);
  const householdId = await householdIdOf(E2E.resident);
  const personId = await personIdOf(E2E.resident);

  for (const path of [
    `/?q=${encodeURIComponent(E2E.resident.firstName)}`,
    `/households/${householdId}?person=${personId}`,
    `/households/${await householdIdOf(E2E.movedOut)}`,
    `/households/${householdId}/edit`,
    `/persons/${personId}/edit`,
    "/households/new",
    "/devices",
    "/trash",
    "/?min=18&all=1",
  ]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expectNoViolations(page, path);
  }
});

test("the open menu and a rejected form have no accessibility problems", async ({ page }) => {
  await signIn(page, E2E.admin.username);
  await openMenu(page);
  await expectNoViolations(page, "the account menu");

  await page.goto(`/persons/${await personIdOf(E2E.resident)}/edit`);
  await page.getByLabel("วันเกิด").fill("31/02/2520");
  await page.getByRole("button", { name: "บันทึก" }).click();
  await expect(page.getByText("บันทึกไม่สำเร็จ")).toBeVisible();
  await expectNoViolations(page, "the person form with an error");
});
