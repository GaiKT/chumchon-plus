import { describe, expect, it } from "vitest";
import { ageFromBirthDate, ageOn, birthdayAtAge, bornOnOrBefore, todayInThailand } from "./age";

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

describe("todayInThailand", () => {
  it("uses Thai time, which is 7 hours ahead of UTC", () => {
    expect(todayInThailand(new Date("2026-10-14T16:59:00Z"))).toBe("2026-10-14");
    expect(todayInThailand(new Date("2026-10-14T17:00:00Z"))).toBe("2026-10-15");
  });
});

describe("bornOnOrBefore", () => {
  it("is the same day the given number of years earlier", () => {
    expect(bornOnOrBefore("2026-10-15", 60)).toBe("1966-10-15");
  });

  it("agrees with ageOn on both sides of the cutoff", () => {
    const today = "2026-10-15";
    expect(ageOn("1966-10-15", today)).toBe(60);
    expect(ageOn("1966-10-16", today)).toBe(59);
  });

  it("moves 29 February to the 28th in a year without it", () => {
    expect(bornOnOrBefore("2028-02-29", 61)).toBe("1967-02-28");
    expect(ageOn("1967-02-28", "2028-02-29")).toBe(61);
    expect(ageOn("1967-03-01", "2028-02-29")).toBe(60);
  });
});

describe("birthdayAtAge", () => {
  it("is the birthday that many years later", () => {
    expect(birthdayAtAge("1966-12-01", 60)).toBe("2026-12-01");
  });

  it("uses 28 February for someone born on 29 February", () => {
    expect(birthdayAtAge("1968-02-29", 61)).toBe("2029-02-28");
  });
});
