/** Filters for the resident list page, kept in the URL so "back" restores them. */
export type ResidentFilters = {
  minAge: number | null;
  maxAge: number | null;
  /** Turns this age later in the current calendar year, e.g. 60 for the elderly allowance. */
  turning: number | null;
  zone: string | null;
  includeFormer: boolean;
  /** Only people without a birth date, so they can be filled in. */
  noBirthDate: boolean;
};

export const NO_FILTERS: ResidentFilters = {
  minAge: null,
  maxAge: null,
  turning: null,
  zone: null,
  includeFormer: false,
  noBirthDate: false,
};

const MAX_AGE = 130;

type Params = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function age(value: string | string[] | undefined): number | null {
  const text = first(value)?.trim();
  if (!text || !/^\d{1,3}$/.test(text)) return null;
  const n = Number(text);
  return n <= MAX_AGE ? n : null;
}

export function parseFilters(params: Params): ResidentFilters {
  let minAge = age(params.min);
  let maxAge = age(params.max);
  if (minAge !== null && maxAge !== null && minAge > maxAge) [minAge, maxAge] = [maxAge, minAge];
  return {
    minAge,
    maxAge,
    turning: age(params.turning),
    zone: first(params.zone)?.trim() || null,
    includeFormer: first(params.all) === "1",
    noBirthDate: first(params.nobirth) === "1",
  };
}

/** The query string for a set of filters, without the leading "?". */
export function filtersToQuery(filters: ResidentFilters): string {
  const params = new URLSearchParams();
  if (filters.noBirthDate) params.set("nobirth", "1");
  if (filters.turning !== null) params.set("turning", String(filters.turning));
  if (filters.minAge !== null) params.set("min", String(filters.minAge));
  if (filters.maxAge !== null) params.set("max", String(filters.maxAge));
  if (filters.zone) params.set("zone", filters.zone);
  if (filters.includeFormer) params.set("all", "1");
  return params.toString();
}

export function hasAgeFilter(filters: ResidentFilters): boolean {
  return filters.minAge !== null || filters.maxAge !== null || filters.turning !== null;
}

/** Filters that turn the search page into a list of everyone matching them. */
export function hasListFilter(filters: ResidentFilters): boolean {
  return hasAgeFilter(filters) || filters.zone !== null || filters.noBirthDate;
}

export const ELDERLY_AGE = 60;
export const ADULT_AGE = 18;

/**
 * One-tap age filters for the most common jobs. `label` matches
 * describeFilters; `short` fits two buttons per row on a 360px screen.
 */
export function presets(thaiYear: number): { label: string; short: string; filters: ResidentFilters }[] {
  return [
    {
      label: `อายุ ${ELDERLY_AGE} ปีขึ้นไป`,
      short: `${ELDERLY_AGE} ปีขึ้นไป`,
      filters: { ...NO_FILTERS, minAge: ELDERLY_AGE },
    },
    {
      label: `จะอายุครบ ${ELDERLY_AGE} ปีใน พ.ศ. ${thaiYear}`,
      short: `จะครบ ${ELDERLY_AGE} ปีใน ${thaiYear}`,
      filters: { ...NO_FILTERS, turning: ELDERLY_AGE },
    },
    {
      label: `อายุต่ำกว่า ${ADULT_AGE} ปี`,
      short: `ต่ำกว่า ${ADULT_AGE} ปี`,
      filters: { ...NO_FILTERS, maxAge: ADULT_AGE - 1 },
    },
  ];
}

/** Human-readable conditions, e.g. ["อายุ 60 ปีขึ้นไป", "คุ้มกลาง"]. */
export function describeFilters(filters: ResidentFilters, thaiYear: number): string[] {
  const parts: string[] = [];
  if (filters.noBirthDate) parts.push("ไม่มีวันเกิด");
  if (filters.turning !== null) parts.push(`จะอายุครบ ${filters.turning} ปีใน พ.ศ. ${thaiYear}`);
  const { minAge, maxAge } = filters;
  if (minAge !== null && maxAge !== null) {
    parts.push(minAge === maxAge ? `อายุ ${minAge} ปี` : `อายุ ${minAge}–${maxAge} ปี`);
  } else if (minAge !== null) {
    parts.push(`อายุ ${minAge} ปีขึ้นไป`);
  } else if (maxAge !== null) {
    parts.push(`อายุต่ำกว่า ${maxAge + 1} ปี`);
  }
  if (filters.zone) parts.push(filters.zone);
  if (filters.includeFormer) parts.push("รวมผู้ที่ย้ายออก/เสียชีวิต");
  return parts;
}
