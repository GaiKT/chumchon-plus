/** 0812345678 -> 081-234-5678, 021234567 -> 02-123-4567. Leaves other input as is. */
export function formatPhone(phone: string): string {
  if (/^0\d{9}$/.test(phone)) return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
  if (/^0\d{8}$/.test(phone)) return `${phone.slice(0, 2)}-${phone.slice(2, 5)}-${phone.slice(5)}`;
  return phone;
}

/** "นายสมชาย ใจดี": Thai titles attach to the first name without a space. */
export function fullName(person: { title: string | null; firstName: string; lastName: string }) {
  return `${person.title ?? ""}${person.firstName} ${person.lastName}`;
}

export const STATUS_LABELS = {
  resident: "อาศัยอยู่",
  moved_out: "ย้ายออก",
  deceased: "เสียชีวิต",
} as const;
