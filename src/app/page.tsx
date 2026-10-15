import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { birthdayAtAge, todayInThailand } from "@/lib/age";
import { formatThaiDate } from "@/lib/format";
import { describeFilters, hasListFilter, NO_FILTERS, parseFilters } from "@/lib/resident-filters";
import { listResidents, listZones, MAX_LIST, searchResidents } from "@/lib/residents";
import { MAX_RESULTS, MIN_QUERY_LENGTH, parseQuery } from "@/lib/search-query";
import { getVillageUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { PageShell } from "./app-bar";
import { ResidentCard } from "./resident-card";
import { SEARCH_INPUT_ID, SearchBox, SearchBoxFallback } from "./search-box";
import { searchHref, SearchFilters } from "./search-filters";

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

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const query = parseQuery(q);
  const filters = parseFilters(params);
  const today = todayInThailand();
  const thaiYear = Number(today.slice(0, 4)) + 543;

  // With a search term: ranked matches within the filters. Without one but
  // with a filter: everyone who matches, by house number.
  const searching = query.kind === "name" || query.kind === "houseNo";
  const listing = !searching && hasListFilter(filters);
  const [zones, found] = await Promise.all([
    listZones(user.villageId),
    searching
      ? searchResidents(user.villageId, query, filters, today).then((rows) => ({ rows, withoutBirthDate: 0 }))
      : listing
        ? listResidents(user.villageId, filters, today)
        : null,
  ]);

  const filterControls = <SearchFilters q={q} filters={filters} zones={zones} thaiYear={thaiYear} />;
  if (!found) {
    return (
      <>
        {filterControls}
        <Message>
          <p>
            พิมพ์ชื่อ นามสกุล หรือชื่อเล่น อย่างน้อย {MIN_QUERY_LENGTH} ตัวอักษร หรือพิมพ์บ้านเลขที่
            หรือเลือกกรองตามอายุเพื่อดูรายชื่อ
          </p>
        </Message>
      </>
    );
  }

  const { rows, withoutBirthDate } = found;
  const conditions = describeFilters(filters, thaiYear);

  return (
    <>
      {filterControls}
      <section aria-labelledby="results-heading" className="flex flex-col gap-3">
        <div>
          <h2 id="results-heading" className="text-title font-bold">
            พบ {rows.length} คน
          </h2>
          {conditions.length > 0 && <p>{conditions.join(" · ")}</p>}
        </div>

        {withoutBirthDate > 0 && (
          <p>
            ไม่มีวันเกิด {withoutBirthDate} คน จึงไม่อยู่ในรายชื่อนี้{" "}
            <Link
              href={searchHref("", { ...NO_FILTERS, zone: filters.zone, includeFormer: filters.includeFormer, noBirthDate: true })}
              className="inline-flex min-h-12 items-center font-bold underline underline-offset-4"
            >
              ดูรายชื่อเพื่อกรอกวันเกิด
            </Link>
          </p>
        )}

        {rows.length === 0 ? (
          <Message>
            {searching ? (
              <>
                <p className="font-bold">ไม่พบลูกบ้านที่ตรงกับคำค้น</p>
                <p>ลองพิมพ์ชื่อเล่น หรือบ้านเลขที่แทน{hasListFilter(filters) && " หรือล้างตัวกรอง"}</p>
              </>
            ) : (
              <p className="font-bold">ไม่พบลูกบ้านที่ตรงกับเงื่อนไข</p>
            )}
          </Message>
        ) : (
          <ul aria-label="ผลการค้นหา" className="flex flex-col gap-3">
            {rows.map((r) => (
              <ResidentCard
                key={r.id}
                resident={r}
                today={today}
                isHead={listing && r.isHead}
                note={
                  filters.turning !== null && r.birthDate
                    ? `ครบ ${filters.turning} ปี วันที่ ${formatThaiDate(birthdayAtAge(r.birthDate, filters.turning))}`
                    : undefined
                }
              />
            ))}
          </ul>
        )}

        {searching && rows.length === MAX_RESULTS && (
          <p>แสดง {MAX_RESULTS} คนแรกที่ใกล้เคียงที่สุด พิมพ์ชื่อให้ยาวขึ้นเพื่อให้รายชื่อสั้นลง</p>
        )}
        {listing && rows.length === MAX_LIST && (
          <p>แสดง {MAX_LIST} คนแรก กรุณาเพิ่มเงื่อนไขเพื่อให้รายชื่อสั้นลง</p>
        )}
      </section>
    </>
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
