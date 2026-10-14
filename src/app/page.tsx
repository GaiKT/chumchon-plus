import { and, asc, eq, isNull } from "drizzle-orm";
import { connection } from "next/server";
import { Suspense } from "react";
import { withVillage } from "@/db";
import { households, persons } from "@/db/schema";

// Resident data is personal data: never wrap it in "use cache".
async function ResidentList() {
  await connection();

  // Temporary until login (issue #02) provides the village from the session.
  const villageId = process.env.DEV_VILLAGE_ID;
  if (!villageId) {
    return <p>ยังไม่ได้กำหนดหมู่บ้าน (DEV_VILLAGE_ID)</p>;
  }

  const residents = await withVillage(villageId, (tx) =>
    tx
      .select({
        id: persons.id,
        title: persons.title,
        firstName: persons.firstName,
        lastName: persons.lastName,
        nickname: persons.nickname,
        houseNo: households.houseNo,
      })
      .from(persons)
      .innerJoin(households, eq(persons.householdId, households.id))
      .where(and(isNull(persons.deletedAt), isNull(households.deletedAt)))
      .orderBy(asc(households.houseNo), asc(persons.firstName)),
  );

  if (residents.length === 0) {
    return <p>ยังไม่มีข้อมูลลูกบ้าน</p>;
  }

  return (
    <ul className="divide-y divide-gray-200">
      {residents.map((r) => (
        <li key={r.id} className="py-3">
          <p className="font-medium">
            {r.title}
            {r.firstName} {r.lastName}
            {r.nickname && ` (${r.nickname})`}
          </p>
          <p className="text-sm text-gray-600">บ้านเลขที่ {r.houseNo}</p>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-xl p-4">
      <h1 className="mb-4 text-xl font-semibold">รายชื่อลูกบ้าน</h1>
      <Suspense fallback={<p>กำลังโหลดข้อมูล...</p>}>
        <ResidentList />
      </Suspense>
    </main>
  );
}
