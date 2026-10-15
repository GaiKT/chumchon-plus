import { describe, expect, it } from "vitest";
import { formatThaiMonth, groupChanges, monthRange, parseMonth, shiftMonth } from "./monthly-changes";

describe("parseMonth", () => {
  const today = "2026-10-15";

  it("defaults to the current Thai month", () => {
    expect(parseMonth(undefined, today)).toBe("2026-10");
  });

  it("accepts a past month", () => {
    expect(parseMonth("2025-12", today)).toBe("2025-12");
  });

  it("rejects future and malformed months", () => {
    for (const value of ["2026-11", "2026-13", "2026-1", "abc", ""]) {
      expect(parseMonth(value, today), value).toBe("2026-10");
    }
  });
});

describe("shiftMonth", () => {
  it("crosses year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2025-12", 1)).toBe("2026-01");
  });
});

describe("monthRange", () => {
  it("follows Thai time, so 23:30 on the last day still counts", () => {
    const { start, end } = monthRange("2026-10");
    const lastEvening = new Date("2026-10-31T23:30:00+07:00");
    const nextMidnight = new Date("2026-11-01T00:00:00+07:00");
    expect(lastEvening >= start && lastEvening < end).toBe(true);
    expect(nextMidnight < end).toBe(false);
    expect(start.toISOString()).toBe("2026-09-30T17:00:00.000Z");
  });
});

describe("formatThaiMonth", () => {
  it("uses the Thai month name and Buddhist year", () => {
    expect(formatThaiMonth("2026-10")).toBe("ตุลาคม 2569");
  });
});

describe("groupChanges", () => {
  it("returns every kind, even empty ones", () => {
    const groups = groupChanges([]);
    expect(Object.keys(groups)).toHaveLength(7);
    expect(groups.deceased).toEqual([]);
  });
});
