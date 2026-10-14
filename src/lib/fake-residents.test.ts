import { describe, expect, it } from "vitest";
import {
  assertFakeDataAllowed,
  FAKE_HOUSEHOLD_COUNT,
  FAKE_PERSON_COUNT,
  generateFakeVillage,
} from "./fake-residents";

describe("generateFakeVillage", () => {
  const village = generateFakeVillage(1, new Date(2026, 9, 14));
  const people = village.households.flatMap((h) => h.members);

  it("builds 150 households and 500 people", () => {
    expect(village.households).toHaveLength(FAKE_HOUSEHOLD_COUNT);
    expect(people).toHaveLength(FAKE_PERSON_COUNT);
  });

  it("is the same on every run", () => {
    expect(generateFakeVillage(1, new Date(2026, 9, 14))).toEqual(village);
  });

  it("includes duplicate and look-alike names", () => {
    const fullNames = people.map((p) => `${p.firstName} ${p.lastName}`);
    expect(new Set(fullNames).size).toBeLessThan(fullNames.length);
    const firstNames = new Set(people.map((p) => p.firstName));
    expect(firstNames.has("สมชาย") && firstNames.has("สมชาญ")).toBe(true);
  });

  it("uses varied house number formats", () => {
    const houseNos = village.households.map((h) => h.houseNo);
    expect(houseNos).toEqual(expect.arrayContaining(["12", "12/1", "123"]));
  });

  it("gives every household one head", () => {
    for (const house of village.households) {
      expect(house.members.filter((m) => m.relationToHead === "หัวหน้าครัวเรือน")).toHaveLength(1);
    }
  });

  it("includes people who moved out or died, and empty houses", () => {
    const statuses = [...village.statuses.values()];
    expect(statuses).toContain("moved_out");
    expect(statuses).toContain("deceased");
    const empty = village.households.filter(
      (h, i) => h.members.length === 1 && village.statuses.has(`${i}:0`),
    );
    expect(empty.length).toBeGreaterThan(0);
  });
});

describe("assertFakeDataAllowed", () => {
  it.each(["development", "staging"])("allows %s", (env) => {
    expect(() => assertFakeDataAllowed(env)).not.toThrow();
  });

  it.each(["production", undefined, ""])("refuses %s", (env) => {
    expect(() => assertFakeDataAllowed(env)).toThrow(/Refusing/);
  });
});
