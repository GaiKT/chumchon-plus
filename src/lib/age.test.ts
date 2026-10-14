import { describe, expect, it } from "vitest";
import { ageFromBirthDate } from "./age";

describe("ageFromBirthDate", () => {
  const today = new Date(2026, 9, 14); // 14 Oct 2026, local time

  it("counts completed years", () => {
    expect(ageFromBirthDate("1972-03-15", today)).toBe(54);
  });

  it("does not count a birthday later this year", () => {
    expect(ageFromBirthDate("1972-12-01", today)).toBe(53);
  });

  it("counts a birthday today", () => {
    expect(ageFromBirthDate("2000-10-14", today)).toBe(26);
  });

  it("returns null when unknown", () => {
    expect(ageFromBirthDate(null, today)).toBeNull();
  });
});
