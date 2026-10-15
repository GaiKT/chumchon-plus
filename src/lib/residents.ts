import { and, asc, count, desc, eq, gt, ilike, isNotNull, isNull, like, lte, or, sql, type SQL } from "drizzle-orm";
import { withVillage } from "@/db";
import { households, persons } from "@/db/schema";
import { bornOnOrBefore, todayInThailand } from "./age";
import { hasAgeFilter, NO_FILTERS, type ResidentFilters } from "./resident-filters";
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
  status: "resident" | "moved_out" | "deceased";
  isHead: boolean;
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

// coalesce: a house without a head gives null, which "desc" would sort first.
const isHeadSql = sql<boolean>`coalesce(${households.headPersonId} = ${persons.id}, false)`;

const resultColumns = {
  id: persons.id,
  householdId: persons.householdId,
  title: persons.title,
  firstName: persons.firstName,
  lastName: persons.lastName,
  nickname: persons.nickname,
  houseNo: households.houseNo,
  birthDate: persons.birthDate,
  status: persons.status,
  isHead: isHeadSql,
};

/** Age conditions as birth date ranges computed for Thailand's "today". */
function ageConditions(filters: ResidentFilters, today: string): SQL[] {
  const conditions: SQL[] = [];
  if (filters.minAge !== null) conditions.push(lte(persons.birthDate, bornOnOrBefore(today, filters.minAge)));
  if (filters.maxAge !== null) conditions.push(gt(persons.birthDate, bornOnOrBefore(today, filters.maxAge + 1)));
  if (filters.turning !== null) {
    const year = Number(today.slice(0, 4)) - filters.turning;
    conditions.push(gt(persons.birthDate, bornOnOrBefore(today, filters.turning)));
    conditions.push(lte(persons.birthDate, `${String(year).padStart(4, "0")}-12-31`));
  }
  return conditions;
}

/**
 * `base` covers status, zone and deleted records; `birth` the age or
 * missing-birth-date filter, kept apart so the people an age filter leaves
 * out for having no birth date can be counted.
 */
function filterConditions(filters: ResidentFilters, today: string): { base: SQL | undefined; birth: SQL[] } {
  return {
    base: and(
      filters.includeFormer ? undefined : eq(persons.status, "resident"),
      filters.zone ? eq(households.zone, filters.zone) : undefined,
      isNull(persons.deletedAt),
      isNull(households.deletedAt),
    ),
    birth: filters.noBirthDate ? [isNull(persons.birthDate)] : ageConditions(filters, today),
  };
}

/**
 * Searches residents of one village by name ("สมชาย ใจดี") or by house
 * number prefix ("12" finds 12, 12/1 and 123), within the list filters.
 * People who moved out or died are left out unless includeFormer is set.
 */
export async function searchResidents(
  villageId: string,
  query: ParsedQuery,
  filters: Partial<ResidentFilters> = {},
  today = todayInThailand(),
): Promise<ResidentSearchResult[]> {
  let search: { where: SQL[]; orderBy: SQL[] };
  if (query.kind === "name") search = nameSearch(query.tokens);
  else if (query.kind === "houseNo") search = houseNoSearch(query.prefix);
  else return [];

  const { base, birth } = filterConditions({ ...NO_FILTERS, ...filters }, today);
  return withVillage(villageId, (tx) =>
    tx
      .select(resultColumns)
      .from(persons)
      .innerJoin(households, eq(persons.householdId, households.id))
      .where(and(base, ...birth, ...search.where))
      .orderBy(...search.orderBy)
      .limit(MAX_RESULTS),
  );
}

/** More than any village has; stops a runaway query, not a page size. */
export const MAX_LIST = 2000;

/**
 * Everyone matching the filters, ordered by house number (12 before 103)
 * with the head of each household first. Also counts the people left out
 * of an age filter because their birth date is unknown.
 */
export async function listResidents(
  villageId: string,
  filters: ResidentFilters,
  today = todayInThailand(),
): Promise<{ rows: ResidentSearchResult[]; withoutBirthDate: number }> {
  const { base, birth } = filterConditions(filters, today);

  return withVillage(villageId, async (tx) => {
    const rows = await tx
      .select(resultColumns)
      .from(persons)
      .innerJoin(households, eq(persons.householdId, households.id))
      .where(and(base, ...birth))
      .orderBy(
        // Leading digits as a number, so 2 comes before 12 and 12/1.
        asc(sql`nullif(substring(${households.houseNo} from '^[0-9]+'), '')::int`),
        asc(households.houseNo),
        desc(isHeadSql),
        asc(persons.firstName),
      )
      .limit(MAX_LIST);

    let withoutBirthDate = 0;
    if (hasAgeFilter(filters) && !filters.noBirthDate) {
      const [row] = await tx
        .select({ n: count() })
        .from(persons)
        .innerJoin(households, eq(persons.householdId, households.id))
        .where(and(base, isNull(persons.birthDate)));
      withoutBirthDate = row.n;
    }
    return { rows, withoutBirthDate };
  });
}

/** Zones in use in the village, for the list filter. */
export async function listZones(villageId: string): Promise<string[]> {
  const rows = await withVillage(villageId, (tx) =>
    tx
      .selectDistinct({ zone: households.zone })
      .from(households)
      .where(and(isNotNull(households.zone), isNull(households.deletedAt)))
      .orderBy(asc(households.zone)),
  );
  return rows.map((r) => r.zone!).filter(Boolean);
}
