import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: {
    // Migrations run as the table owner; the app connects with a restricted role.
    url: process.env.MIGRATION_DATABASE_URL!,
  },
});
