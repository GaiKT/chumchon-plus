import "dotenv/config";
import { parseArgs } from "node:util";
import { createOwnerDb } from "@/db";
import { createUser, generatePassword } from "@/lib/users";

const usage = `Usage:
  pnpm user:create --role admin --village <village-id> --username <username> --name <ชื่อ-สกุล>
  pnpm user:create --role superadmin --username <username> --name <ชื่อ-สกุล>

A random password is generated and printed once; give it to the user in person.`;

async function main() {
  const { values } = parseArgs({
    options: {
      role: { type: "string" },
      village: { type: "string" },
      username: { type: "string" },
      name: { type: "string" },
    },
  });
  if (!values.role || !values.username || !values.name) {
    console.error(usage);
    process.exit(1);
  }

  const password = generatePassword();
  const db = createOwnerDb();
  try {
    const user = await createUser(db, {
      role: values.role as "admin",
      villageId: values.village as string,
      username: values.username,
      name: values.name,
      password,
    });
    console.log(`Created ${values.role} ${values.username} (${user.id})`);
    console.log(`Password: ${password}`);
  } finally {
    await db.$client.end();
  }
}

main().catch((err) => {
  console.error(err.issues ? `${usage}\n\n${JSON.stringify(err.issues, null, 2)}` : err);
  process.exit(1);
});
