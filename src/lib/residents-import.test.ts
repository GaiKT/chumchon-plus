import { describe, expect, it } from "vitest";
import { normalizePhone, parseBirthDate } from "./resident-fields";
import { groupIntoHouseholds, parseResidentsCsv } from "./residents-import";

const HEADER =
  "บ้านเลขที่,คุ้ม/ซอย,คำนำหน้า,ชื่อ,นามสกุล,ชื่อเล่น,ความสัมพันธ์กับหัวหน้าครัวเรือน,วันเกิด,เบอร์โทร,หมายเหตุ";

describe("parseBirthDate", () => {
  const today = new Date("2026-10-14");

  it("converts a Buddhist-era dd/mm/yyyy date", () => {
    expect(parseBirthDate("15/03/2515", today)).toBe("1972-03-15");
  });

  it("accepts a Christian-era dd/mm/yyyy date", () => {
    expect(parseBirthDate("5/1/1990", today)).toBe("1990-01-05");
  });

  it("accepts ISO dates", () => {
    expect(parseBirthDate("1990-01-05", today)).toBe("1990-01-05");
  });

  it.each(["31/02/2530", "15-03-2515", "abc", "01/01/2570"])(
    "rejects %s",
    (input) => {
      expect(parseBirthDate(input, today)).toBeNull();
    },
  );
});

describe("normalizePhone", () => {
  it("strips dashes and spaces", () => {
    expect(normalizePhone("081-234 5678")).toBe("0812345678");
  });

  it("accepts 9-digit landlines", () => {
    expect(normalizePhone("02-123-4567")).toBe("021234567");
  });

  it.each(["812345678", "08123", "+66812345678"])("rejects %s", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe("parseResidentsCsv", () => {
  it("parses valid rows and normalizes values", () => {
    const csv = `${HEADER}\n12/1, คุ้มกลาง ,นาย,สมชาย,ใจดี,แดง,หัวหน้าครัวเรือน,15/03/2515,081-234-5678,\n`;
    const { rows, errors } = parseResidentsCsv(csv);

    expect(errors).toEqual([]);
    expect(rows).toEqual([
      {
        rowNumber: 2,
        houseNo: "12/1",
        zone: "คุ้มกลาง",
        title: "นาย",
        firstName: "สมชาย",
        lastName: "ใจดี",
        nickname: "แดง",
        relationToHead: "หัวหน้าครัวเรือน",
        birthDate: "1972-03-15",
        phone: "0812345678",
        note: undefined,
      },
    ]);
  });

  it("handles a UTF-8 BOM from Excel exports", () => {
    const { rows, errors } = parseResidentsCsv(`﻿${HEADER}\n12,,,สมชาย,ใจดี,,,,,\n`);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
  });

  it("reports every invalid row with its line number", () => {
    const csv = [
      HEADER,
      "12,,,สมชาย,ใจดี,,,,,",
      "ไม่มี,,,สมศรี,,,,99/99/2500,123,",
    ].join("\n");
    const { rows, errors } = parseResidentsCsv(csv);

    expect(rows).toHaveLength(1);
    expect(errors.map((e) => e.rowNumber)).toEqual([3, 3, 3, 3]);
    expect(errors.map((e) => e.message)).toEqual([
      "บ้านเลขที่ต้องอยู่ในรูปแบบ 12 หรือ 12/1",
      "กรุณาระบุนามสกุล",
      "วันเกิดไม่ถูกต้อง ใช้รูปแบบ วว/ดด/ปปปป เช่น 15/03/2515",
      "เบอร์โทรไม่ถูกต้อง",
    ]);
  });

  it("rejects a file missing required columns", () => {
    const { rows, errors } = parseResidentsCsv("ชื่อ,นามสกุล\nสมชาย,ใจดี\n");
    expect(rows).toEqual([]);
    expect(errors).toEqual([{ rowNumber: 1, message: "ไม่พบคอลัมน์: บ้านเลขที่" }]);
  });
});

describe("groupIntoHouseholds", () => {
  function rowsFrom(lines: string[]) {
    return parseResidentsCsv([HEADER, ...lines].join("\n")).rows;
  }

  it("groups members by house number", () => {
    const { households, errors } = groupIntoHouseholds(
      rowsFrom([
        "12,คุ้มกลาง,,สมชาย,ใจดี,,หัวหน้าครัวเรือน,,,",
        "45,,,บุญมา,สุขใจ,,หัวหน้าครัวเรือน,,,",
        "12,,,สมศรี,ใจดี,,คู่สมรส,,,",
      ]),
    );

    expect(errors).toEqual([]);
    expect(households.map((h) => [h.houseNo, h.zone, h.members.length])).toEqual([
      ["12", "คุ้มกลาง", 2],
      ["45", undefined, 1],
    ]);
  });

  it("rejects a house with two heads", () => {
    const { errors } = groupIntoHouseholds(
      rowsFrom([
        "12,,,สมชาย,ใจดี,,หัวหน้าครัวเรือน,,,",
        "12,,,สมศรี,ใจดี,,หัวหน้าครัวเรือน,,,",
      ]),
    );
    expect(errors).toEqual([
      { rowNumber: 3, message: "บ้านเลขที่ 12 มีหัวหน้าครัวเรือนมากกว่า 1 คน" },
    ]);
  });

  it("rejects conflicting zones for the same house", () => {
    const { errors } = groupIntoHouseholds(
      rowsFrom(["12,คุ้มกลาง,,สมชาย,ใจดี,,,,,", "12,คุ้มเหนือ,,สมศรี,ใจดี,,,,,"]),
    );
    expect(errors).toEqual([
      { rowNumber: 3, message: "บ้านเลขที่ 12 ระบุคุ้ม/ซอยไม่ตรงกัน (คุ้มกลาง และ คุ้มเหนือ)" },
    ]);
  });
});
