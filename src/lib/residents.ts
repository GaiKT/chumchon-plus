import { and, asc, desc, eq, ilike, isNull, like, or, sql, type SQL } from "drizzle-orm";
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

/** Every token must match the first name, last name or nickname. */
function nameSearch(tokens: string[]): { where: SQL[]; orderBy: SQL[] } {
  const where = tokens.map((token) => {
    const pattern = `%${escapeLike(token)}%`;
    return or(
      ilike(persons.firstName, pattern),
      ilike(persons.lastName, pattern),
      ilike(persons.nickname, pattern),
    )!;
  });
  return { where, orderBy: [asc(persons.firstName), asc(persons.lastName)] };
}

/** House numbers starting with the prefix; an exact match comes first. */
function houseNoSearch(prefix: string): { where: SQL[]; orderBy: SQL[] } {
  return {
    where: [like(households.houseNo, `${escapeLike(prefix)}%`)],
    orderBy: [
      desc(eq(households.houseNo, prefix)),
      asc(sql`length(${households.houseNo})`),
      asc(households.houseNo),
      asc(persons.firstName),
    ],
  };
}

/**
 * Searches current residents of one village by name ("สมชาย ใจดี") or by
 * house number prefix ("12" finds 12, 12/1 and 123).
 */
export async function searchResidents(
  villageId: string,
  query: ParsedQuery,
): Promise<ResidentSearchResult[]> {
  let search: { where: SQL[]; orderBy: SQL[] };
  if (query.kind === "name") search = nameSearch(query.tokens);
  else if (query.kind === "houseNo") search = houseNoSearch(query.prefix);
  else return [];

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
          ...search.where,
        ),
      )
      .orderBy(...search.orderBy)
      .limit(MAX_RESULTS),
  );
}
