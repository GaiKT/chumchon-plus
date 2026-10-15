import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { todayInThailand } from "@/lib/age";
import {
  CHANGE_KINDS,
  CHANGE_LABELS,
  formatThaiMonth,
  getMonthlyChanges,
  groupChanges,
  parseMonth,
  shiftMonth,
  type ChangeEvent,
} from "@/lib/monthly-changes";
import { getVillageUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { PageShell } from "../app-bar";

export const metadata: Metadata = { title: "ความเปลี่ยนแปลงรายเดือน | ชุมชนพลัส" };

const dayFormat = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" });

function ChangeItem({ event }: { event: ChangeEvent }) {
  const href = `/households/${event.householdId}${event.personId ? `?person=${event.personId}` : ""}`;
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-md border-2 border-foreground p-4 transition-colors duration-150 active:bg-muted"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-title font-bold">{event.name ?? `บ้านเลขที่ ${event.houseNo}`}</p>
          {event.name && (
            <p>
              บ้านเลขที่ <strong className="tabular-nums">{event.houseNo}</strong>
            </p>
          )}
          {event.detail && <p className="font-semibold">{event.detail}</p>}
          <p className="text-caption">
            {dayFormat.format(event.at)} · บันทึกโดย {event.by}
          </p>
        </div>
        <ChevronRight aria-hidden className="size-7 shrink-0" strokeWidth={2.5} />
      </Link>
    </li>
  );
}

// Resident data is personal data: never wrap it in "use cache".
async function Changes({ searchParams }: { searchParams: PageProps<"/changes">["searchParams"] }) {
  const user = await getVillageUser();
  if (!user) return <p>บัญชีผู้ดูแลระบบไม่สามารถดูข้อมูลลูกบ้านได้</p>;

  const { month: raw } = await searchParams;
  const today = todayInThailand();
  const month = parseMonth(typeof raw === "string" ? raw : undefined, today);
  const isCurrent = month === today.slice(0, 7);
  const groups = groupChanges(await getMonthlyChanges(user.villageId, month));
  const total = CHANGE_KINDS.reduce((n, kind) => n + groups[kind].length, 0);

  return (
    <>
      <nav aria-label="เลือกเดือน" className="flex flex-col gap-3">
        <p className="text-title font-bold">{formatThaiMonth(month)}</p>
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/changes?month=${shiftMonth(month, -1)}`} className={buttonVariants()}>
            <ChevronLeft aria-hidden strokeWidth={2.5} />
            เดือนก่อน
          </Link>
          {isCurrent ? (
            <span aria-hidden className={cn(buttonVariants(), "opacity-50")}>
              เดือนถัดไป
              <ChevronRight strokeWidth={2.5} />
            </span>
          ) : (
            <Link href={`/changes?month=${shiftMonth(month, 1)}`} className={buttonVariants()}>
              เดือนถัดไป
              <ChevronRight aria-hidden strokeWidth={2.5} />
            </Link>
          )}
        </div>
      </nav>

      <section aria-labelledby="summary-heading" className="flex flex-col gap-3">
        <h2 id="summary-heading" className="text-title font-bold">
          สรุป
        </h2>
        <dl className="grid grid-cols-[1fr_auto] rounded-md border-2 border-foreground">
          {CHANGE_KINDS.map((kind, i) => (
            <div key={kind} className={cn("col-span-2 grid grid-cols-subgrid px-4 py-3", i > 0 && "border-t-2 border-foreground")}>
              <dt>{CHANGE_LABELS[kind]}</dt>
              <dd className="font-bold tabular-nums">{groups[kind].length}</dd>
            </div>
          ))}
        </dl>
      </section>

      {total === 0 && <p className="font-bold">ไม่มีความเปลี่ยนแปลงในเดือนนี้</p>}

      {CHANGE_KINDS.filter((kind) => groups[kind].length > 0).map((kind) => (
        <section key={kind} aria-labelledby={`${kind}-heading`} className="flex flex-col gap-3">
          <h2 id={`${kind}-heading`} className="text-title font-bold">
            {CHANGE_LABELS[kind]} {groups[kind].length}
          </h2>
          <ul aria-label={CHANGE_LABELS[kind]} className="flex flex-col gap-3">
            {groups[kind].map((event) => (
              <ChangeItem key={event.key} event={event} />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

export default function ChangesPage({ searchParams }: PageProps<"/changes">) {
  return (
    <PageShell back="ย้อนกลับ">
      <div className="flex flex-col gap-2">
        <h1 className="text-heading font-bold">ความเปลี่ยนแปลงรายเดือน</h1>
        <p>ใช้ประกอบการรายงานกำนัน นายอำเภอ และการประชุมหมู่บ้าน ไม่รวมการแก้ไขทั่วไป เช่น เปลี่ยนเบอร์โทร</p>
      </div>
      <Suspense fallback={<p>กำลังโหลดข้อมูล...</p>}>
        <Changes searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}
