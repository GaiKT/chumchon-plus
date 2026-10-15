import { and, desc, eq, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { withVillage } from "@/db";
import { auditLogs, households, persons, users } from "@/db/schema";
import { fullName } from "./format";

/** Changes the headman reports to the kamnan and district each month. */
export const CHANGE_KINDS = [
  "newPerson",
  "movedOut",
  "deceased",
  "movedHouse",
  "returned",
  "newHouse",
  "headChanged",
] as const;
export type ChangeKind = (typeof CHANGE_KINDS)[number];

export const CHANGE_LABELS: Record<ChangeKind, string> = {
  newPerson: "สมาชิกใหม่",
  movedOut: "ย้ายออก",
  deceased: "เสียชีวิต",
  movedHouse: "ย้ายบ้านภายในหมู่บ้าน",
  returned: "กลับมาอาศัย",
  newHouse: "บ้านใหม่",
  headChanged: "เปลี่ยนหัวหน้าครัวเรือน",
};

export type ChangeEvent = {
  /** Audit row id plus kind: one row can hold several changes. */
  key: string;
  kind: ChangeKind;
  at: Date;
  by: string;
  householdId: string;
  houseNo: string;
  personId: string | null;
  /** The person's name, or null for a house-level change. */
  name: string | null;
  /** e.g. "จากบ้านเลขที่ 3" or "จาก นายก เป็น นายข". */
  detail: string | null;
};

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** "2026-10" from the URL, or the current Thai month when missing, malformed or in the future. */
export function parseMonth(value: string | undefined, today: string): string {
  const current = today.slice(0, 7);
  return value && MONTH.test(value) && value <= current ? value : current;
}

/** The month before or after, e.g. shiftMonth("2026-01", -1) = "2025-12". */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** Start (inclusive) and end (exclusive) of a month in Thai time (UTC+7, no daylight saving). */
export function monthRange(month: string): { start: Date; end: Date } {
  return {
    start: new Date(`${month}-01T00:00:00+07:00`),
    end: new Date(`${shiftMonth(month, 1)}-01T00:00:00+07:00`),
  };
}

const thaiMonthFormat = new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric", timeZone: "UTC" });

/** "2026-10" -> "ตุลาคม 2569". */
export function formatThaiMonth(month: string): string {
  return thaiMonthFormat.format(new Date(`${month}-01T00:00:00Z`));
}

type Changes = Record<string, [unknown, unknown]>;

function personKinds(action: string, changes: Changes): ChangeKind[] {
  if (action === "create") return ["newPerson"];
  const kinds: ChangeKind[] = [];
  const status = changes.status?.[1];
  if (status === "moved_out") kinds.push("movedOut");
  else if (status === "deceased") kinds.push("deceased");
  else if (status === "resident") kinds.push("returned");
  if (changes.householdId) kinds.push("movedHouse");
  return kinds;
}

const asId = (value: unknown) => (typeof value === "string" ? value : null);

/**
 * What changed in the village during a month, read from the audit log.
 * Ordinary edits such as a new phone number are left out, and so are
 * records that have since been deleted (#11).
 */
export async function getMonthlyChanges(villageId: string, month: string): Promise<ChangeEvent[]> {
  const { start, end } = monthRange(month);
  const inMonth = and(gte(auditLogs.createdAt, start), lt(auditLogs.createdAt, end));
  const touches = (fields: string[]) =>
    sql`jsonb_exists_any(${auditLogs.changes}, array[${sql.join(
      fields.map((f) => sql`${f}`),
      sql`, `,
    )}]::text[])`;

  return withVillage(villageId, async (tx) => {
    const personRows = await tx
      .select({
        auditId: auditLogs.id,
        action: auditLogs.action,
        changes: auditLogs.changes,
        at: auditLogs.createdAt,
        by: users.name,
        personId: persons.id,
        title: persons.title,
        firstName: persons.firstName,
        lastName: persons.lastName,
        householdId: households.id,
        houseNo: households.houseNo,
      })
      .from(auditLogs)
      .innerJoin(persons, eq(persons.id, auditLogs.recordId))
      .innerJoin(households, eq(households.id, persons.householdId))
      .innerJoin(users, eq(users.id, auditLogs.userId))
      .where(
        and(
          eq(auditLogs.tableName, "persons"),
          inMonth,
          isNull(persons.deletedAt),
          isNull(households.deletedAt),
          or(eq(auditLogs.action, "create"), and(eq(auditLogs.action, "update"), touches(["status", "householdId"]))),
        ),
      )
      .orderBy(desc(auditLogs.createdAt));

    const houseRows = await tx
      .select({
        auditId: auditLogs.id,
        action: auditLogs.action,
        changes: auditLogs.changes,
        at: auditLogs.createdAt,
        by: users.name,
        householdId: households.id,
        houseNo: households.houseNo,
      })
      .from(auditLogs)
      .innerJoin(households, eq(households.id, auditLogs.recordId))
      .innerJoin(users, eq(users.id, auditLogs.userId))
      .where(
        and(
          eq(auditLogs.tableName, "households"),
          inMonth,
          isNull(households.deletedAt),
          or(eq(auditLogs.action, "create"), and(eq(auditLogs.action, "update"), touches(["headPersonId"]))),
        ),
      )
      .orderBy(desc(auditLogs.createdAt));

    // Names and house numbers mentioned inside the changes, deleted or not.
    const houseIds = new Set<string>();
    const personIds = new Set<string>();
    for (const row of personRows) {
      const from = asId((row.changes as Changes).householdId?.[0]);
      if (from) houseIds.add(from);
    }
    for (const row of houseRows) {
      for (const id of (row.changes as Changes).headPersonId ?? []) if (asId(id)) personIds.add(id as string);
    }
    const houseNos = new Map(
      houseIds.size === 0
        ? []
        : (
            await tx
              .select({ id: households.id, houseNo: households.houseNo })
              .from(households)
              .where(inArray(households.id, [...houseIds]))
          ).map((h) => [h.id, h.houseNo]),
    );
    const names = new Map(
      personIds.size === 0
        ? []
        : (
            await tx
              .select({ id: persons.id, title: persons.title, firstName: persons.firstName, lastName: persons.lastName })
              .from(persons)
              .where(inArray(persons.id, [...personIds]))
          ).map((p) => [p.id, fullName(p)]),
    );

    const events: ChangeEvent[] = [];
    for (const row of personRows) {
      const changes = row.changes as Changes;
      for (const kind of personKinds(row.action, changes)) {
        const from = asId(changes.householdId?.[0]);
        events.push({
          key: `${row.auditId}-${kind}`,
          kind,
          at: row.at,
          by: row.by,
          householdId: row.householdId,
          houseNo: row.houseNo,
          personId: row.personId,
          name: fullName(row),
          detail: kind === "movedHouse" && from ? `ย้ายมาจากบ้านเลขที่ ${houseNos.get(from) ?? "-"}` : null,
        });
      }
    }
    for (const row of houseRows) {
      const changes = row.changes as Changes;
      const kind: ChangeKind = row.action === "create" ? "newHouse" : "headChanged";
      let detail: string | null = null;
      if (kind === "headChanged") {
        const [from, to] = (changes.headPersonId ?? []).map((id) => names.get(asId(id) ?? "") ?? "ไม่ระบุ");
        detail = `จาก ${from} เป็น ${to}`;
      }
      events.push({
        key: `${row.auditId}-${kind}`,
        kind,
        at: row.at,
        by: row.by,
        householdId: row.householdId,
        houseNo: row.houseNo,
        personId: null,
        name: null,
        detail,
      });
    }
    return events.sort((a, b) => b.at.getTime() - a.at.getTime());
  });
}

/** Events grouped by kind, every kind present (zero counts matter in a report). */
export function groupChanges(events: ChangeEvent[]): Record<ChangeKind, ChangeEvent[]> {
  const groups = Object.fromEntries(CHANGE_KINDS.map((k) => [k, [] as ChangeEvent[]])) as Record<
    ChangeKind,
    ChangeEvent[]
  >;
  for (const event of events) groups[event.kind].push(event);
  return groups;
}
