import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { deviceLabel } from "@/lib/device";
import { getVillageUser } from "@/lib/session";
import { listVillageAccounts } from "@/lib/sessions-admin";
import { BackLink } from "../back-link";
import { setAccountDisabled, signOutDevice, signOutEverywhere } from "./actions";

export const instant = false;

export const metadata: Metadata = { title: "อุปกรณ์ที่เข้าสู่ระบบ | ชุมชนพลัส" };

const lastUsedFormat = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

const smallButton = "min-h-11 rounded border px-3 text-sm";

export default async function DevicesPage() {
  const user = await getVillageUser();
  if (!user) notFound();
  const accounts = await listVillageAccounts(user.villageId);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <BackLink>← กลับ</BackLink>
      <h1 className="text-2xl font-semibold">อุปกรณ์ที่เข้าสู่ระบบ</h1>
      <p className="text-gray-700">
        หากโทรศัพท์หายหรือมีผู้อื่นใช้งาน ให้กด &quot;ออกจากระบบ&quot; ที่อุปกรณ์นั้นทันที
      </p>

      {accounts.map((account) => {
        const isSelf = account.id === user.id;
        return (
          <section
            key={account.id}
            aria-label={`บัญชี ${account.name}`}
            className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4"
          >
            <div>
              <h2 className="text-lg font-semibold">
                {account.name}
                {isSelf && <span className="text-gray-600"> (คุณ)</span>}
              </h2>
              <p className="text-sm text-gray-600">ชื่อผู้ใช้ {account.username}</p>
              {account.disabledAt && (
                <p className="mt-1 inline-block rounded bg-red-100 px-2 py-0.5 text-sm text-red-800">
                  ปิดใช้งานแล้ว
                </p>
              )}
            </div>

            {account.sessions.length === 0 ? (
              <p className="text-gray-600">ไม่มีอุปกรณ์ที่เข้าสู่ระบบอยู่</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {account.sessions.map((s) => {
                  const isCurrent = s.id === user.sessionId;
                  const label = deviceLabel(s.userAgent);
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-2">
                      <div>
                        <p>
                          {label}
                          {isCurrent && <span className="text-blue-800"> · อุปกรณ์นี้</span>}
                        </p>
                        <p className="text-sm text-gray-600">ใช้งานล่าสุด {lastUsedFormat.format(s.lastUsedAt)}</p>
                      </div>
                      <form action={signOutDevice.bind(null, s.id)}>
                        <button
                          type="submit"
                          aria-label={`ออกจากระบบ ${label} ของ ${account.name}`}
                          className={`${smallButton} border-gray-300`}
                        >
                          ออกจากระบบ
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex flex-wrap gap-2">
              {account.sessions.length > 1 && (
                <form action={signOutEverywhere.bind(null, account.id)}>
                  <button type="submit" className={`${smallButton} border-gray-300`}>
                    ออกจากระบบทุกอุปกรณ์
                  </button>
                </form>
              )}
              {!isSelf && (
                <form action={setAccountDisabled.bind(null, account.id, !account.disabledAt)}>
                  <button
                    type="submit"
                    aria-label={`${account.disabledAt ? "เปิดใช้งาน" : "ปิดใช้งาน"}บัญชี ${account.name}`}
                    className={`${smallButton} ${account.disabledAt ? "border-gray-300" : "border-red-300 text-red-700"}`}
                  >
                    {account.disabledAt ? "เปิดใช้งานบัญชี" : "ปิดใช้งานบัญชี"}
                  </button>
                </form>
              )}
            </div>
          </section>
        );
      })}
    </main>
  );
}
