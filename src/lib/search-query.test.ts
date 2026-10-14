import { describe, expect, it } from "vitest";
import { escapeLike, parseQuery, stripTitle } from "./search-query";

describe("stripTitle", () => {
  it.each([
    ["นายสมชาย", "สมชาย"],
    ["นาย สมชาย", "สมชาย"],
    ["นางสาวมะลิ", "มะลิ"],
    ["นางสมศรี", "สมศรี"],
    ["ด.ญ.มะลิ", "มะลิ"],
    ["เด็กชายต้น", "ต้น"],
    ["สมชาย", "สมชาย"],
  ])("%s -> %s", (input, expected) => {
    expect(stripTitle(input)).toBe(expected);
  });

  it("keeps a query that is only a title", () => {
    expect(stripTitle("นาง")).toBe("นาง");
  });
});

describe("parseQuery", () => {
  it("treats blank input as empty", () => {
    expect(parseQuery("   ")).toEqual({ kind: "empty" });
    expect(parseQuery(undefined)).toEqual({ kind: "empty" });
  });

  it("does not search a single character", () => {
    expect(parseQuery("ส")).toEqual({ kind: "tooShort" });
  });

  it("splits words and strips the title", () => {
    expect(parseQuery("  นาย สมชาย   ใจดี ")).toEqual({ kind: "name", tokens: ["สมชาย", "ใจดี"] });
  });

  it("caps very long input", () => {
    const query = parseQuery("ก".repeat(500));
    expect(query.kind === "name" && query.tokens[0].length).toBe(100);
  });
});

describe("escapeLike", () => {
  it("escapes wildcards", () => {
    expect(escapeLike(String.raw`50%_a\b`)).toBe(String.raw`50\%\_a\\b`);
  });
});
