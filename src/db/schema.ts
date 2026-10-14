import { sql } from "drizzle-orm";
import {
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
    tenantIsolation("persons", "village_id"),
  ],
);
