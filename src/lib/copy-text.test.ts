import { describe, expect, it } from "vitest";
import { formatCopyText } from "./copy-text";

const address = { houseNo: "12/1", mooNo: "5", subdistrict: "โนนสูง" };
const today = new Date(2026, 9, 14);

describe("formatCopyText", () => {
  it("formats a complete record on three lines", () => {
    const text = formatCopyText(
      {
        title: "นาย",
        firstName: "สมชาย",
        lastName: "ใจดี",
        nickname: "แดง",
        birthDate: "1972-03-15",
        phone: "0812345678",
      },
      address,
      today,
    );
    expect(text).toBe("นายสมชาย ใจดี (แดง)\nบ้านเลขที่ 12/1 หมู่ 5 ต.โนนสูง\nอายุ 54 ปี โทร 081-234-5678");
  });

  it("omits missing details without leaving blank lines", () => {
    const text = formatCopyText(
      { title: null, firstName: "สมชาย", lastName: "ใจดี", nickname: null, birthDate: null, phone: null },
      address,
      today,
    );
    expect(text).toBe("สมชาย ใจดี\nบ้านเลขที่ 12/1 หมู่ 5 ต.โนนสูง");
  });

  it("shows the phone alone when the age is unknown", () => {
    const text = formatCopyText(
      { title: null, firstName: "ก", lastName: "ข", nickname: null, birthDate: null, phone: "021234567" },
      address,
      today,
    );
    expect(text.split("\n")[2]).toBe("โทร 02-123-4567");
  });
});
