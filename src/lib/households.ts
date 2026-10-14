import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { withVillage } from "@/db";
import { households, persons } from "@/db/schema";

export type HouseholdMember = {
  id: string;
  title: string | null;
  firstName: string;
  lastName: string;
  nickname: string | null;
  relationToHead: string | null;
  birthDate: string | null;
  phone: string | null;
  note: string | null;
  status: "resident" | "moved_out" | "deceased";
  isHead: boolean;
};

export type HouseholdDetail = {
  id: string;
  houseNo: string;
  zone: string | null;
  note: string | null;
  residents: HouseholdMember[];
  former: HouseholdMember[];
};

/**
 * One household of the village with its members, head first. Returns null
 * for an unknown id, a deleted household, or one in another village (row-level
 * security hides it), so callers cannot tell these cases apart.
 */
export async function getHousehold(villageId: string, id: string): Promise<HouseholdDetail | null> {
  if (!z.uuid().safeParse(id).success) return null;

  return withVillage(villageId, async (tx) => {
    const [household] = await tx
      .select({
        id: households.id,
        houseNo: households.houseNo,
        zone: households.zone,
        note: households.note,
        headPersonId: households.headPersonId,
      })
      .from(households)
      .where(and(eq(households.id, id), isNull(households.deletedAt)));
    if (!household) return null;

    const rows = await tx
      .select({
        id: persons.id,
        title: persons.title,
        firstName: persons.firstName,
        lastName: persons.lastName,
        nickname: persons.nickname,
        relationToHead: persons.relationToHead,
        birthDate: persons.birthDate,
        phone: persons.phone,
        note: persons.note,
        status: persons.status,
      })
      .from(persons)
      .where(and(eq(persons.householdId, id), isNull(persons.deletedAt)))
      .orderBy(asc(persons.birthDate), asc(persons.firstName));

    const members = rows
      .map((m) => ({ ...m, isHead: m.id === household.headPersonId }))
      .sort((a, b) => Number(b.isHead) - Number(a.isHead));

    return {
      id: household.id,
      houseNo: household.houseNo,
      zone: household.zone,
      note: household.note,
      residents: members.filter((m) => m.status === "resident"),
      former: members.filter((m) => m.status !== "resident"),
    };
  });
}
