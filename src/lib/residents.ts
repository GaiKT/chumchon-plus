import { and, asc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";
import { withVillage } from "@/db";
import { households, persons } from "@/db/schema";
import { escapeLike, MAX_RESULTS, type ParsedQuery } from "./search-query";

export type ResidentSearchResult = {
  id: string;
  householdId: string;
  title: string | null;
  firstName: string;
  lastName: string;
  nickname: string | null;
  houseNo: string;
  birthDate: string | null;
};

/**
 * Searches residents of one village. Every token must match the first name,
 * last name or nickname, so "สมชาย ใจดี" finds Somchai Jaidee.
 * Only current residents are returned.
 */
export async function searchResidents(
  villageId: string,
  query: ParsedQuery,
): Promise<ResidentSearchResult[]> {
  if (query.kind !== "name") return [];

  const tokenMatches: SQL[] = query.tokens.map((token) => {
    const pattern = `%${escapeLike(token)}%`;
    return or(
      ilike(persons.firstName, pattern),
      ilike(persons.lastName, pattern),
      ilike(persons.nickname, pattern),
    )!;
  });

  return withVillage(villageId, (tx) =>
    tx
      .select({
        id: persons.id,
        householdId: persons.householdId,
        title: persons.title,
        firstName: persons.firstName,
        lastName: persons.lastName,
        nickname: persons.nickname,
        houseNo: households.houseNo,
        birthDate: persons.birthDate,
      })
      .from(persons)
      .innerJoin(households, eq(persons.householdId, households.id))
      .where(
        and(
          eq(persons.status, "resident"),
          isNull(persons.deletedAt),
          isNull(households.deletedAt),
          ...tokenMatches,
        ),
      )
      .orderBy(asc(persons.firstName), asc(persons.lastName))
      .limit(MAX_RESULTS),
  );
}
