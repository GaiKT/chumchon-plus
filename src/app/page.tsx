import { Suspense } from "react";
import { ageFromBirthDate } from "@/lib/age";
import { searchResidents, type ResidentSearchResult } from "@/lib/residents";
import { MIN_QUERY_LENGTH, parseQuery } from "@/lib/search-query";
import { getCurrentUser, getVillageUser } from "@/lib/session";
import { signOut } from "./actions";
import { SearchBox, SearchBoxFallback } from "./search-box";

function ResidentCard({ resident }: { resident: ResidentSearchResult }) {
  const age = ageFromBirthDate(resident.birthDate);
  return (
    <li className="rounded-lg border border-gray-200 p-4">
      <p className="text-lg font-medium">
        {resident.title}
        {resident.firstName} {resident.lastName}
        {resident.nickname && <span className="text-gray-600"> ({resident.nickname})</span>}
      </p>
      <p className="text-gray-600">
        บ้านเลขที่ {resident.houseNo}
        {age !== null && ` · อายุ ${age} ปี`}
      </p>
    </li>
  );
}

// Resident data is personal data: never wrap it in "use cache".
async function SearchResults({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const user = await getVillageUser();
  if (!user) {
    return <p>บัญชีผู้ดูแลระบบไม่สามารถดูข้อมูลลูกบ้านได้</p>;
  }

  const { q } = await searchParams;
  const query = parseQuery(typeof q === "string" ? q : undefined);
  if (query.kind === "empty" || query.kind === "tooShort") {
    return (
      <p className="text-gray-600">
        พิมพ์ชื่อ นามสกุล หรือชื่อเล่น อย่างน้อย {MIN_QUERY_LENGTH} ตัวอักษร หรือพิมพ์บ้านเลขที่
      </p>
    );
  }

  const residents = await searchResidents(user.villageId, query);
  if (residents.length === 0) {
    return <p className="text-gray-600">ไม่พบลูกบ้านที่ตรงกับคำค้น</p>;
  }

  return (
    <ul aria-label="ผลการค้นหา" className="flex flex-col gap-3">
      {residents.map((r) => (
        <ResidentCard key={r.id} resident={r} />
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

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <Suspense fallback={<div className="h-5" />}>
        <AccountBar />
      </Suspense>
      <h1 className="text-xl font-semibold">ค้นหาลูกบ้าน</h1>
      <Suspense fallback={<SearchBoxFallback />}>
        <SearchBox />
      </Suspense>
      <Suspense fallback={<p className="text-gray-600">กำลังโหลดข้อมูล...</p>}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
