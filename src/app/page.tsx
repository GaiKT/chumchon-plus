import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ageFromBirthDate } from "@/lib/age";
import { fullName, STATUS_LABELS } from "@/lib/format";
import { searchResidents, type ResidentSearchResult } from "@/lib/residents";
import { MIN_QUERY_LENGTH, parseQuery } from "@/lib/search-query";
import { getVillageUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { PageShell } from "./app-bar";
import { SEARCH_INPUT_ID, SearchBox, SearchBoxFallback } from "./search-box";

function ResidentCard({ resident }: { resident: ResidentSearchResult }) {
  const age = ageFromBirthDate(resident.birthDate);
  const isFormer = resident.status !== "resident";
  return (
    <li>
      <Link
        href={`/households/${resident.householdId}?person=${resident.id}`}
        className={cn(
          "flex items-center gap-3 rounded-md border-2 border-foreground p-4 transition-colors duration-150 active:bg-muted",
          isFormer && "border-dashed",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-title font-bold">{fullName(resident)}</p>
          <p>
            {resident.nickname && <>ชื่อเล่น {resident.nickname} · </>}
            บ้านเลขที่ <strong className="tabular-nums">{resident.houseNo}</strong>
            {age !== null && <> · อายุ {age} ปี</>}
          </p>
          {isFormer && <Badge>{STATUS_LABELS[resident.status]}</Badge>}
        </div>
        <ChevronRight aria-hidden className="size-7 shrink-0" strokeWidth={2.5} />
      </Link>
    </li>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-1 py-2">{children}</div>;
}

// Resident data is personal data: never wrap it in "use cache".
async function SearchResults({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const user = await getVillageUser();
  if (!user) {
    return (
      <Message>
        <p>บัญชีผู้ดูแลระบบไม่สามารถดูข้อมูลลูกบ้านได้</p>
      </Message>
    );
  }

  const { q, all } = await searchParams;
  const query = parseQuery(typeof q === "string" ? q : undefined);
  if (query.kind === "empty" || query.kind === "tooShort") {
    return (
      <Message>
        <p>
          พิมพ์ชื่อ นามสกุล หรือชื่อเล่น อย่างน้อย {MIN_QUERY_LENGTH} ตัวอักษร หรือพิมพ์บ้านเลขที่
        </p>
      </Message>
    );
  }

  const residents = await searchResidents(user.villageId, query, { includeFormer: all === "1" });
  if (residents.length === 0) {
    return (
      <Message>
        <p className="font-bold">ไม่พบลูกบ้านที่ตรงกับคำค้น</p>
        <p>ลองพิมพ์ชื่อเล่น หรือบ้านเลขที่แทน</p>
      </Message>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <p className="font-semibold">พบ {residents.length} คน</p>
      <ul aria-label="ผลการค้นหา" className="flex flex-col gap-3">
        {residents.map((r) => (
          <ResidentCard key={r.id} resident={r} />
        ))}
      </ul>
    </section>
  );
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <PageShell className="gap-4">
      <h1 className="text-title font-bold">
        <label htmlFor={SEARCH_INPUT_ID}>ค้นหาลูกบ้าน</label>
      </h1>
      {/* Stays on screen while scrolling through results. */}
      <div className="sticky top-0 z-10 -mx-4 border-b-2 border-foreground bg-background px-4 pt-1">
        <Suspense fallback={<SearchBoxFallback />}>
          <SearchBox />
        </Suspense>
      </div>
      <Suspense fallback={<p>กำลังโหลดข้อมูล...</p>}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
      <Link href="/households/new" className={cn(buttonVariants(), "mt-auto w-full")}>
        <Plus aria-hidden strokeWidth={2.5} />
        เพิ่มบ้าน
      </Link>
    </PageShell>
  );
}
