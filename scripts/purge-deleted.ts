import "dotenv/config";
import { createOwnerDb } from "@/db";
import { purgeDeleted } from "@/lib/purge";

// Run daily from the host's scheduler (cron or a systemd timer), e.g.:
//   0 3 * * *  cd /srv/chumchon-plus && pnpm purge:deleted
async function main() {
  const db = createOwnerDb();
  try {
    const removed = await purgeDeleted(db);
    // Counts only: never log personal data.
    console.log(`Purged ${removed.persons} persons and ${removed.households} households`);
  } finally {
    await db.$client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
