import { ageFromBirthDate } from "./age";
import { formatPhone, fullName } from "./format";

export type CopyPerson = {
  title: string | null;
  firstName: string;
  lastName: string;
  nickname: string | null;
  birthDate: string | null;
  phone: string | null;
};

export type CopyAddress = { houseNo: string; mooNo: string; subdistrict: string };

/**
 * Text for the "คัดลอกทั้งหมด" button, ready to paste into LINE or a document:
 *
 *   นายสมชาย ใจดี (แดง)
 *   บ้านเลขที่ 12/1 หมู่ 5 ต.โนนสูง
 *   อายุ 54 ปี โทร 081-234-5678
 *
 * Missing values are left out rather than shown as blanks. Change the format
 * here if a government form needs a different layout.
 */
export function formatCopyText(person: CopyPerson, address: CopyAddress, today = new Date()): string {
  const name = person.nickname ? `${fullName(person)} (${person.nickname})` : fullName(person);
  const place = `บ้านเลขที่ ${address.houseNo} หมู่ ${address.mooNo} ต.${address.subdistrict}`;

  const age = ageFromBirthDate(person.birthDate, today);
  const details = [
    age !== null ? `อายุ ${age} ปี` : null,
    person.phone ? `โทร ${formatPhone(person.phone)}` : null,
  ].filter(Boolean);

  return [name, place, details.join(" ")].filter(Boolean).join("\n");
}
