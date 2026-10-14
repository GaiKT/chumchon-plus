import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  // Tests share fixture users; Better Auth also rate-limits sign-ins per IP.
  workers: 1,
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  forbidOnly: Boolean(process.env.CI),
  webServer: {
    // CI tests the production build; locally reuse whatever runs on :3000.
    command: process.env.CI ? "pnpm start:standalone" : "pnpm dev",
    url: baseURL,
    reuseExistingServer: true,
  },
});
