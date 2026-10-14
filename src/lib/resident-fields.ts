import { z } from "zod";

// Field rules shared by the CSV import and the edit forms, so a value that
// imports cleanly can also be saved from the app and vice versa.

export const HEAD_RELATION = "หัวหน้าครัวเรือน";

export const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

export const requiredText = (label: string) =>
  z.string({ error: `กรุณาระบุ${label}` }).trim().min(1, `กรุณาระบุ${label}`);

/**
 * Accepts dd/mm/yyyy (Buddhist or Christian year) or yyyy-mm-dd.
 * Returns an ISO date string, or null when the input is not a real past date.
 */
export function parseBirthDate(input: string, today = new Date()): string | null {
  let day: number, month: number, year: number;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  const thai = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(input);
  if (iso) {
    [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else if (thai) {
    [day, month, year] = [Number(thai[1]), Number(thai[2]), Number(thai[3])];
  } else {
    return null;
  }
  if (year > 2400) year -= 543;

  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  if (!isRealDate || year < 1880 || date > today) return null;

  return date.toISOString().slice(0, 10);
}

/** ISO date -> "15/03/2515", the Buddhist-era format people type into forms. */
export function toThaiDateInput(isoDate: string | null): string {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${Number(year) + 543}`;
}

/** Strips separators; Thai phone numbers are 9–10 digits starting with 0. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "");
  return /^0\d{8,9}$/.test(digits) ? digits : null;
}

export const houseNoField = requiredText("บ้านเลขที่").regex(
  /^\d+(\/\d+)?$/,
  "บ้านเลขที่ต้องอยู่ในรูปแบบ 12 หรือ 12/1",
);

export const birthDateField = optionalText.transform((v, ctx) => {
  if (v === undefined) return undefined;
  const parsed = parseBirthDate(v);
  if (!parsed) {
    ctx.addIssue({
      code: "custom",
      message: "วันเกิดไม่ถูกต้อง ใช้รูปแบบ วว/ดด/ปปปป เช่น 15/03/2515",
    });
    return z.NEVER;
  }
  return parsed;
});

export const phoneField = optionalText.transform((v, ctx) => {
  if (v === undefined) return undefined;
  const parsed = normalizePhone(v);
  if (!parsed) {
    ctx.addIssue({ code: "custom", message: "เบอร์โทรไม่ถูกต้อง" });
    return z.NEVER;
  }
  return parsed;
});

/** In an update, an emptied optional field must be saved as NULL, not skipped. */
const cleared = <T>(field: z.ZodType<T | undefined>) => field.transform((v) => v ?? null);

export const householdFormSchema = z.object({
  houseNo: houseNoField,
  zone: cleared(optionalText),
  note: cleared(optionalText),
});

export const personFormSchema = z.object({
  householdId: z.uuid("กรุณาเลือกบ้าน"),
  title: cleared(optionalText),
  firstName: requiredText("ชื่อ"),
  lastName: requiredText("นามสกุล"),
  nickname: cleared(optionalText),
  relationToHead: cleared(optionalText),
  birthDate: cleared(birthDateField),
  phone: cleared(phoneField),
  note: cleared(optionalText),
});

export type HouseholdFormValues = z.output<typeof householdFormSchema>;
export type PersonFormValues = z.output<typeof personFormSchema>;
