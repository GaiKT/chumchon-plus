import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fullName } from "@/lib/format";
import { listDeleted, RESTORE_DAYS } from "@/lib/resident-edits";
import { getVillageUser } from "@/lib/session";
import { BackLink } from "../back-link";
import { undeleteHousehold, undeletePerson } from "../delete-actions";
import { RestoreButton } from "./restore-button";

export const instant = false;

export const metadata: Metadata = { title: "รายการที่ถูกลบ | ชุมชนพลัส" };

const DAY_MS = 24 * 60 * 60 * 1000;

function daysLeft(deletedAt: Date | null) {
  if (!deletedAt) return RESTORE_DAYS;
  return Math.max(0, RESTORE_DAYS - Math.floor((Date.now() - deletedAt.getTime()) / DAY_MS));
}

export default async function TrashPage() {
  const user = await getVillageUser();
  if (!user) notFound();
  const deleted = await listDeleted(user.villageId);
  const empty = deleted.persons.length === 0 && deleted.households.length === 0;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <BackLink>← กลับ</BackLink>
      <h1 className="text-2xl font-semibold">รายการที่ถูกลบ</h1>
      <p className="text-gray-700">กู้คืนได้ภายใน {RESTORE_DAYS} วันหลังลบ หลังจากนั้นข้อมูลจะถูกลบถาวร</p>

      {empty && <p className="text-gray-600">ไม่มีรายการที่ถูกลบ</p>}

      {deleted.households.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">บ้าน</h2>
          <ul aria-label="บ้านที่ถูกลบ" className="flex flex-col gap-3">
            {deleted.households.map((h) => (
              <li key={h.id} className="flex items-start justify-between gap-2 rounded-lg border border-gray-200 p-4">
                <div>
                  <p className="font-medium">บ้านเลขที่ {h.houseNo}</p>
                  <p className="text-sm text-gray-600">เหลือเวลากู้คืน {daysLeft(h.deletedAt)} วัน</p>
                </div>
                <RestoreButton action={undeleteHousehold.bind(null, h.id)} label={`กู้คืนบ้านเลขที่ ${h.houseNo}`} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {deleted.persons.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">บุคคล</h2>
          <ul aria-label="บุคคลที่ถูกลบ" className="flex flex-col gap-3">
            {deleted.persons.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-2 rounded-lg border border-gray-200 p-4">
                <div>
                  <p className="font-medium">{fullName(p)}</p>
                  <p className="text-sm text-gray-600">
                    บ้านเลขที่ {p.houseNo} · เหลือเวลากู้คืน {daysLeft(p.deletedAt)} วัน
                  </p>
                </div>
                <RestoreButton action={undeletePerson.bind(null, p.id)} label={`กู้คืน ${fullName(p)}`} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
