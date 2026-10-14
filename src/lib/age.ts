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
