import { parse } from "csv-parse/sync";
import { z } from "zod";
import {
  birthDateField,
  HEAD_RELATION,
  houseNoField,
  optionalText,
  phoneField,
  requiredText,
} from "./resident-fields";

export { HEAD_RELATION };

/** Column order of the spreadsheet template (templates/residents-template.csv). */
export const TEMPLATE_COLUMNS = [
  { key: "houseNo", header: "บ้านเลขที่", required: true },
  { key: "zone", header: "คุ้ม/ซอย", required: false },
  { key: "title", header: "คำนำหน้า", required: false },
  { key: "firstName", header: "ชื่อ", required: true },
  { key: "lastName", header: "นามสกุล", required: true },
  { key: "nickname", header: "ชื่อเล่น", required: false },
  { key: "relationToHead", header: "ความสัมพันธ์กับหัวหน้าครัวเรือน", required: false },
  { key: "birthDate", header: "วันเกิด", required: false },
  { key: "phone", header: "เบอร์โทร", required: false },
  { key: "note", header: "หมายเหตุ", required: false },
] as const;

export const residentRowSchema = z.object({
  houseNo: houseNoField,
  zone: optionalText,
  title: optionalText,
  firstName: requiredText("ชื่อ"),
  lastName: requiredText("นามสกุล"),
  nickname: optionalText,
  relationToHead: optionalText,
  birthDate: birthDateField,
  phone: phoneField,
  note: optionalText,
});

export type ResidentRow = z.output<typeof residentRowSchema> & {
  /** Line number in the CSV file, counting the header as line 1. */
  rowNumber: number;
};

export type RowError = { rowNumber: number; message: string };

export type HouseholdImport = {
  houseNo: string;
  zone?: string;
  members: ResidentRow[];
};

export function parseResidentsCsv(text: string): {
  rows: ResidentRow[];
  errors: RowError[];
} {
  const records: Record<string, string>[] = parse(text, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const headers = records.length > 0 ? Object.keys(records[0]) : [];
  const missing = TEMPLATE_COLUMNS.filter(
    (c) => c.required && !headers.includes(c.header),
  );
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [
        {
          rowNumber: 1,
          message: `ไม่พบคอลัมน์: ${missing.map((c) => c.header).join(", ")}`,
        },
      ],
    };
  }

  const rows: ResidentRow[] = [];
  const errors: RowError[] = [];
  records.forEach((record, i) => {
    const rowNumber = i + 2;
    const input = Object.fromEntries(
      TEMPLATE_COLUMNS.map((c) => [c.key, record[c.header] ?? ""]),
    );
    const result = residentRowSchema.safeParse(input);
    if (result.success) {
      rows.push({ ...result.data, rowNumber });
    } else {
      for (const issue of result.error.issues) {
        errors.push({ rowNumber, message: issue.message });
      }
    }
  });
  return { rows, errors };
}

export function groupIntoHouseholds(rows: ResidentRow[]): {
  households: HouseholdImport[];
  errors: RowError[];
} {
  const byHouse = new Map<string, HouseholdImport>();
  const errors: RowError[] = [];

  for (const row of rows) {
    const house = byHouse.get(row.houseNo);
    if (!house) {
      byHouse.set(row.houseNo, { houseNo: row.houseNo, zone: row.zone, members: [row] });
      continue;
    }
    if (row.zone && house.zone && row.zone !== house.zone) {
      errors.push({
        rowNumber: row.rowNumber,
        message: `บ้านเลขที่ ${row.houseNo} ระบุคุ้ม/ซอยไม่ตรงกัน (${house.zone} และ ${row.zone})`,
      });
    }
    house.zone ??= row.zone;
    house.members.push(row);
  }

  for (const house of byHouse.values()) {
    const heads = house.members.filter((m) => m.relationToHead === HEAD_RELATION);
    if (heads.length > 1) {
      errors.push({
        rowNumber: heads[1].rowNumber,
        message: `บ้านเลขที่ ${house.houseNo} มีหัวหน้าครัวเรือนมากกว่า 1 คน`,
      });
    }
  }

  return { households: [...byHouse.values()], errors };
}
