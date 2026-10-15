import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fullName } from "@/lib/format";
import { listDeleted, RESTORE_DAYS } from "@/lib/resident-edits";
import { getVillageUser } from "@/lib/session";
import { PageShell } from "../app-bar";
import { undeleteHousehold, undeletePerson } from "../delete-actions";
import { RestoreButton } from "./restore-button";

export const instant = false;

export const metadata: Metadata = { title: "รายการที่ถูกลบ | ชุมชนพลัส" };

const DAY_MS = 24 * 60 * 60 * 1000;

function daysLeft(deletedAt: Date | null) {
  if (!deletedAt) return RESTORE_DAYS;
  return Math.max(0, RESTORE_DAYS - Math.floor((Date.now() - deletedAt.getTime()) / DAY_MS));
}

function DeletedItem({ title, detail, children }: { title: string; detail: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-3 rounded-md border-2 border-foreground p-4">
      <div>
        <p className="text-title font-bold">{title}</p>
        <p>{detail}</p>
      </div>
      {children}
    </li>
  );
}

export default async function TrashPage() {
  const user = await getVillageUser();
  if (!user) notFound();
  const deleted = await listDeleted(user.villageId);
  const empty = deleted.persons.length === 0 && deleted.households.length === 0;

  return (
    <PageShell back="ย้อนกลับ">
      <div className="flex flex-col gap-2">
        <h1 className="text-heading font-bold">รายการที่ถูกลบ</h1>
        <p>กู้คืนได้ภายใน {RESTORE_DAYS} วันหลังลบข้อมูล หลังจากนั้นข้อมูลจะถูกลบถาวร</p>
      </div>

      {empty && <p className="font-bold">ไม่มีรายการที่ถูกลบ</p>}

      {deleted.households.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-title font-bold">บ้าน</h2>
          <ul aria-label="บ้านที่ถูกลบ" className="flex flex-col gap-3">
            {deleted.households.map((h) => (
              <DeletedItem
                key={h.id}
                title={`บ้านเลขที่ ${h.houseNo}`}
                detail={`เหลือเวลากู้คืน ${daysLeft(h.deletedAt)} วัน`}
              >
                <RestoreButton action={undeleteHousehold.bind(null, h.id)} label={`กู้คืนบ้านเลขที่ ${h.houseNo}`} />
              </DeletedItem>
            ))}
          </ul>
        </section>
      )}

      {deleted.persons.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-title font-bold">บุคคล</h2>
          <ul aria-label="บุคคลที่ถูกลบ" className="flex flex-col gap-3">
            {deleted.persons.map((p) => (
              <DeletedItem
                key={p.id}
                title={fullName(p)}
                detail={`บ้านเลขที่ ${p.houseNo} · เหลือเวลากู้คืน ${daysLeft(p.deletedAt)} วัน`}
              >
                <RestoreButton action={undeletePerson.bind(null, p.id)} label={`กู้คืน ${fullName(p)}`} />
              </DeletedItem>
            ))}
          </ul>
        </section>
      )}
    </PageShell>
  );
}
