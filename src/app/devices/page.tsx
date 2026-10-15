import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { deviceLabel } from "@/lib/device";
import { getVillageUser } from "@/lib/session";
import { listVillageAccounts } from "@/lib/sessions-admin";
import { cn } from "@/lib/utils";
import { PageShell } from "../app-bar";
import { setAccountDisabled, signOutDevice, signOutEverywhere } from "./actions";

export const instant = false;

export const metadata: Metadata = { title: "อุปกรณ์ที่เข้าสู่ระบบ | ชุมชนพลัส" };

const lastUsedFormat = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

const actionButton = buttonVariants({ className: "w-full" });

export default async function DevicesPage() {
  const user = await getVillageUser();
  if (!user) notFound();
  const accounts = await listVillageAccounts(user.villageId);

  return (
    <PageShell back="กลับ">
      <div className="flex flex-col gap-2">
        <h1 className="text-heading font-bold">อุปกรณ์ที่เข้าสู่ระบบ</h1>
        <p>หากโทรศัพท์หายหรือมีผู้อื่นใช้งาน ให้กด &quot;ออกจากระบบ&quot; ที่อุปกรณ์นั้นทันที</p>
      </div>

      {accounts.map((account) => {
        const isSelf = account.id === user.id;
        return (
          <section
            key={account.id}
            aria-label={`บัญชี ${account.name}`}
            className="flex flex-col gap-4 rounded-md border-2 border-foreground p-4"
          >
            <div className="flex flex-col gap-1">
              <h2 className="text-title font-bold">
                {account.name}
                {isSelf && <span className="font-normal"> (คุณ)</span>}
              </h2>
              <p>ชื่อผู้ใช้ {account.username}</p>
              {account.disabledAt && <Badge variant="danger">ปิดใช้งานแล้ว</Badge>}
            </div>

            {account.sessions.length === 0 ? (
              <p>ไม่มีอุปกรณ์ที่เข้าสู่ระบบอยู่</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {account.sessions.map((s) => {
                  const isCurrent = s.id === user.sessionId;
                  const label = deviceLabel(s.userAgent);
                  return (
                    <li
                      key={s.id}
                      className={cn(
                        "flex flex-col gap-3 rounded-md border-2 border-foreground p-3",
                        isCurrent && "bg-highlight",
                      )}
                    >
                      <div>
                        <p className="font-bold">
                          {label}
                          {isCurrent && " · อุปกรณ์นี้"}
                        </p>
                        <p className="text-caption">ใช้งานล่าสุด {lastUsedFormat.format(s.lastUsedAt)}</p>
                      </div>
                      <form action={signOutDevice.bind(null, s.id)}>
                        <button
                          type="submit"
                          aria-label={`ออกจากระบบ ${label} ของ ${account.name}`}
                          className={actionButton}
                        >
                          ออกจากระบบ
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}

            {(account.sessions.length > 1 || !isSelf) && (
              <div className="flex flex-col gap-3 border-t-2 border-foreground pt-4">
                {account.sessions.length > 1 && (
                  <form action={signOutEverywhere.bind(null, account.id)}>
                    <button type="submit" className={actionButton}>
                      ออกจากระบบทุกอุปกรณ์
                    </button>
                  </form>
                )}
                {!isSelf && (
                  <form action={setAccountDisabled.bind(null, account.id, !account.disabledAt)}>
                    <button
                      type="submit"
                      aria-label={`${account.disabledAt ? "เปิดใช้งาน" : "ปิดใช้งาน"}บัญชี ${account.name}`}
                      className={cn(actionButton, !account.disabledAt && "border-danger text-danger-strong")}
                    >
                      {account.disabledAt ? "เปิดใช้งานบัญชี" : "ปิดใช้งานบัญชี"}
                    </button>
                  </form>
                )}
              </div>
            )}
          </section>
        );
      })}
    </PageShell>
  );
}
