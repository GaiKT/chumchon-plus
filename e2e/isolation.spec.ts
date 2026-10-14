import { expect, test } from "@playwright/test";
import { E2E } from "./fixtures";
import { signIn } from "./helpers";

// Village A's admin must never see village B's residents, on any page.
// Every new page that shows or edits resident data adds a case here.

test.beforeEach(async ({ page }) => {
  await signIn(page, E2E.admin.username);
});

test("resident list shows only the user's own village", async ({ page }) => {
  await expect(page.getByText(E2E.resident.firstName)).toBeVisible();
  await expect(page.getByText(E2E.otherResident.firstName)).toHaveCount(0);
});
