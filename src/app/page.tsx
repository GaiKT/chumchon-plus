import { and, asc, eq, isNull } from "drizzle-orm";
import { Suspense } from "react";
import { withVillage } from "@/db";
import { households, persons } from "@/db/schema";
import { getCurrentUser, getVillageUser } from "@/lib/session";
import { signOut } from "./actions";

// Resident data is personal data: never wrap it in "use cache".
async function ResidentList() {
  const user = await getVillageUser();
  if (!user) {
    return <p>บัญชีผู้ดูแลระบบไม่สามารถดูข้อมูลลูกบ้านได้</p>;
  }

  const residents = await withVillage(user.villageId, (tx) =>
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

async function AccountBar() {
  const user = await getCurrentUser();
  return (
    <div className="flex items-center justify-between gap-2 text-sm text-gray-600">
      <span>{user.name}</span>
      <form action={signOut}>
        <button type="submit" className="underline">
          ออกจากระบบ
        </button>
      </form>
    </div>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-xl p-4">
      <Suspense fallback={<div className="h-5" />}>
        <AccountBar />
      </Suspense>
      <h1 className="my-4 text-xl font-semibold">รายชื่อลูกบ้าน</h1>
      <Suspense fallback={<p>กำลังโหลดข้อมูล...</p>}>
        <ResidentList />
      </Suspense>
    </main>
  );
}
