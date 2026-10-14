import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  pgEnum,
  pgPolicy,
  pgTable,
  type PgTableExtraConfigValue,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Every request runs inside a transaction that sets `app.village_id`
// (see withVillage in ./index.ts). When it is unset, this evaluates to NULL
// and the policies below match no rows.
const currentVillageId = sql`nullif(current_setting('app.village_id', true), '')::uuid`;

function tenantIsolation(table: string, column: string) {
  const matchesVillage = sql`${sql.identifier(column)} = ${currentVillageId}`;
  return pgPolicy(`${table}_tenant_isolation`, {
    for: "all",
    using: matchesVillage,
    withCheck: matchesVillage,
  });
}

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const villages = pgTable(
  "villages",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    mooNo: text().notNull(),
    subdistrict: text().notNull(),
    district: text().notNull(),
    province: text().notNull(),
    ...timestamps,
  },
  () => [tenantIsolation("villages", "id")],
);

export const households = pgTable(
  "households",
  {
    id: uuid().primaryKey().defaultRandom(),
    villageId: uuid()
      .notNull()
      .references(() => villages.id),
    houseNo: text().notNull(),
    zone: text(),
    headPersonId: uuid(),
    note: text(),
    deletedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t): PgTableExtraConfigValue[] => [
    index("households_house_no_pattern_idx").on(t.houseNo.op("text_pattern_ops")),
    uniqueIndex("households_village_house_no_key")
      .on(t.villageId, t.houseNo)
      .where(sql`${t.deletedAt} is null`),
    // Target for composite foreign keys, so a row can only point at
    // records in the same village.
    unique("households_village_id_id_key").on(t.villageId, t.id),
    foreignKey({
      name: "households_head_person_fk",
      columns: [t.villageId, t.headPersonId],
      foreignColumns: [persons.villageId, persons.id],
    }),
    tenantIsolation("households", "village_id"),
  ],
);

export const personStatus = pgEnum("person_status", [
  "resident",
  "moved_out",
  "deceased",
]);

export const persons = pgTable(
  "persons",
  {
    id: uuid().primaryKey().defaultRandom(),
    villageId: uuid()
      .notNull()
      .references(() => villages.id),
    householdId: uuid().notNull(),
    title: text(),
    firstName: text().notNull(),
    lastName: text().notNull(),
    nickname: text(),
    relationToHead: text(),
    birthDate: date({ mode: "string" }),
    phone: text(),
    note: text(),
    status: personStatus().notNull().default("resident"),
    deletedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t): PgTableExtraConfigValue[] => [
    unique("persons_village_id_id_key").on(t.villageId, t.id),
    foreignKey({
      name: "persons_household_fk",
      columns: [t.villageId, t.householdId],
      foreignColumns: [households.villageId, households.id],
    }),
    index("persons_household_id_idx").on(t.householdId),
    // Speed up substring (ILIKE '%x%') name searches.
    index("persons_first_name_trgm_idx").using("gin", t.firstName.op("gin_trgm_ops")),
    index("persons_last_name_trgm_idx").using("gin", t.lastName.op("gin_trgm_ops")),
    index("persons_nickname_trgm_idx").using("gin", t.nickname.op("gin_trgm_ops")),
    tenantIsolation("persons", "village_id"),
  ],
);

// Authentication tables, managed by Better Auth (see src/lib/auth.ts).
// No row-level security here: sign-in must look users up before the
// village is known. App code reads them only through the auth library.

export const userRole = pgEnum("user_role", ["admin", "superadmin"]);

export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    email: text().notNull().unique(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    username: text().unique(),
    displayUsername: text(),
    role: userRole().notNull(),
    // Admins belong to exactly one village; superadmins to none.
    villageId: uuid().references(() => villages.id),
    ...timestamps,
  },
  (t) => [
    check(
      "users_village_matches_role",
      sql`(${t.role} = 'admin') = (${t.villageId} is not null)`,
    ),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid().primaryKey().defaultRandom(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    ipAddress: text(),
    userAgent: text(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid().primaryKey().defaultRandom(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    ...timestamps,
  },
  (t) => [index("accounts_user_id_idx").on(t.userId)],
);

export const verifications = pgTable(
  "verifications",
  {
    id: uuid().primaryKey().defaultRandom(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index("verifications_identifier_idx").on(t.identifier)],
);
