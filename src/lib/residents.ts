import { and, asc, desc, eq, ilike, isNull, like, or, sql, type SQL } from "drizzle-orm";
import { withVillage } from "@/db";
import { households, persons } from "@/db/schema";
import { escapeLike, FUZZY_THRESHOLD, MAX_RESULTS, type ParsedQuery } from "./search-query";

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

const nameColumns = [persons.firstName, persons.lastName, persons.nickname];

function anyName(match: (column: (typeof nameColumns)[number]) => SQL): SQL {
  return or(...nameColumns.map(match))!;
}

/** Best pg_trgm word similarity of the token to any name column. */
function bestSimilarity(token: string): SQL {
  return sql`greatest(${sql.join(
    nameColumns.map((c) => sql`word_similarity(${token}, coalesce(${c}, ''))`),
    sql`, `,
  )})`;
}

/**
 * Every token must match the first name, last name or nickname, either as
 * a substring or, to tolerate typos, by trigram similarity. Results rank
 * exact matches first, then prefix, substring and finally typo matches.
 */
function nameSearch(tokens: string[]): { where: SQL[]; orderBy: SQL[] } {
  const where = tokens.map((token) =>
    or(
      anyName((c) => ilike(c, `%${escapeLike(token)}%`)),
      sql`${bestSimilarity(token)} >= ${FUZZY_THRESHOLD}`,
    )!,
  );

  const tier = (token: string) => sql`case
    when ${anyName((c) => sql`${c} = ${token}`)} then 0
    when ${anyName((c) => ilike(c, `${escapeLike(token)}%`))} then 1
    when ${anyName((c) => ilike(c, `%${escapeLike(token)}%`))} then 2
    else 3 end`;

  return {
    where,
    orderBy: [
      asc(sql.join(tokens.map(tier), sql` + `)),
      desc(sql.join(tokens.map(bestSimilarity), sql` + `)),
      asc(persons.firstName),
      asc(persons.lastName),
    ],
  };
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
