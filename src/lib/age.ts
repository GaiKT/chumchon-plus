/** Age in completed years for an ISO date (yyyy-mm-dd), or null if unknown. */
export function ageFromBirthDate(birthDate: string | null, today = new Date()): number | null {
  if (!birthDate) return null;
  const [year, month, day] = birthDate.split("-").map(Number);
  let age = today.getFullYear() - year;
  const hadBirthday =
    today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!hadBirthday) age -= 1;
  return age;
}

/** Today's date in Thailand (yyyy-mm-dd), whatever the server's time zone. */
export function todayInThailand(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(now);
}

/** Age in completed years on a yyyy-mm-dd date, or null if unknown. */
export function ageOn(birthDate: string | null, today: string): number | null {
  const [year, month, day] = today.split("-").map(Number);
  return ageFromBirthDate(birthDate, new Date(year, month - 1, day));
}

/**
 * The latest birth date (yyyy-mm-dd) of someone who is at least `years` old
 * on `today`. A 29 February that does not exist that year becomes the 28th.
 */
export function bornOnOrBefore(today: string, years: number): string {
  const [y, m, d] = today.split("-").map(Number);
  const year = y - years;
  const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${String(year).padStart(4, "0")}-${pad(m)}-${pad(Math.min(d, lastDay))}`;
}

/** The date (yyyy-mm-dd) someone turns `years` old; 29 February falls back to the 28th. */
export function birthdayAtAge(birthDate: string, years: number): string {
  const [y, m, d] = birthDate.split("-").map(Number);
  return bornOnOrBefore(`${y + years}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, 0);
}
