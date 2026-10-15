import { describe, expect, it } from "vitest";
import { describeFilters, filtersToQuery, NO_FILTERS, parseFilters, presets } from "./resident-filters";

describe("parseFilters", () => {
  it("returns no filters for an empty query", () => {
    expect(parseFilters({})).toEqual(NO_FILTERS);
  });

  it("reads ages, zone and flags", () => {
    expect(parseFilters({ min: "60", max: "70", zone: " คุ้มกลาง ", all: "1" })).toEqual({
      ...NO_FILTERS,
      minAge: 60,
      maxAge: 70,
      zone: "คุ้มกลาง",
      includeFormer: true,
    });
  });

  it("ignores empty, negative, non-numeric and absurd ages", () => {
    for (const min of ["", "-1", "abc", "6O", "999", "1.5"]) {
      expect(parseFilters({ min }).minAge, min).toBeNull();
    }
  });

  it("swaps a reversed age range", () => {
    expect(parseFilters({ min: "70", max: "60" })).toMatchObject({ minAge: 60, maxAge: 70 });
  });

  it("round-trips through the query string", () => {
    const filters = parseFilters({ min: "18", zone: "คุ้มใต้", all: "1" });
    expect(parseFilters(Object.fromEntries(new URLSearchParams(filtersToQuery(filters))))).toEqual(filters);
  });
});

describe("describeFilters", () => {
  it("describes each preset with its own label", () => {
    for (const preset of presets(2569)) {
      expect(describeFilters(preset.filters, 2569)).toEqual([preset.label]);
    }
  });

  it("describes a custom range with the zone", () => {
    expect(describeFilters(parseFilters({ min: "20", max: "30", zone: "คุ้มกลาง" }), 2569)).toEqual([
      "อายุ 20–30 ปี",
      "คุ้มกลาง",
    ]);
  });
});
