import { describe, expect, it } from "vitest";
import { formatPhone, fullName } from "./format";

describe("formatPhone", () => {
  it("formats mobile and landline numbers", () => {
    expect(formatPhone("0812345678")).toBe("081-234-5678");
    expect(formatPhone("021234567")).toBe("02-123-4567");
  });

  it("leaves anything else unchanged", () => {
    expect(formatPhone("1669")).toBe("1669");
  });
});

describe("fullName", () => {
  it("attaches the title to the first name", () => {
    expect(fullName({ title: "นาย", firstName: "สมชาย", lastName: "ใจดี" })).toBe("นายสมชาย ใจดี");
    expect(fullName({ title: null, firstName: "สมชาย", lastName: "ใจดี" })).toBe("สมชาย ใจดี");
  });
});
