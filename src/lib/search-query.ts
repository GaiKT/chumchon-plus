export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 100;
export const MAX_RESULTS = 20;

// Longest first, so "นางสาว" is stripped before "นาง".
const TITLE_PREFIXES = [
  "เด็กหญิง",
  "เด็กชาย",
  "นางสาว",
  "น.ส.",
  "ด.ช.",
  "ด.ญ.",
  "นาง",
  "นาย",
];

/** Removes a leading Thai title (with or without a following space). */
export function stripTitle(query: string): string {
  for (const title of TITLE_PREFIXES) {
    if (query.startsWith(title)) {
      const rest = query.slice(title.length).trimStart();
      // Keep queries that are only a title, e.g. someone searching for "นาง".
      return rest.length > 0 ? rest : query;
    }
  }
  return query;
}

export type ParsedQuery =
  | { kind: "empty" }
  | { kind: "tooShort" }
  | { kind: "houseNo"; prefix: string }
  | { kind: "name"; tokens: string[] };

/** A query starting with a digit is a house number, e.g. "12" or "12/1". */
export function isHouseNoQuery(query: string): boolean {
  return /^\d/.test(query);
}

export function parseQuery(raw: string | undefined | null): ParsedQuery {
  const query = (raw ?? "").slice(0, MAX_QUERY_LENGTH).trim().replace(/\s+/g, " ");
  if (query.length === 0) return { kind: "empty" };
  // House numbers are short, so even one digit is a useful search.
  if (isHouseNoQuery(query)) return { kind: "houseNo", prefix: query.replace(/\s/g, "") };

  const name = stripTitle(query);
  if (name.length < MIN_QUERY_LENGTH) return { kind: "tooShort" };
  return { kind: "name", tokens: name.split(" ") };
}

/** Escapes LIKE wildcards so user input matches literally. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}
