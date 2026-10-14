import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ageFromBirthDate } from "@/lib/age";
import { formatCopyText, type CopyAddress } from "@/lib/copy-text";
import { formatPhone, fullName, STATUS_LABELS } from "@/lib/format";
import { getHousehold, type HouseholdMember } from "@/lib/households";
import { getVillageUser } from "@/lib/session";
import { BackLink } from "../../back-link";
import { CopyButton } from "./copy-button";

// Block until the household is loaded, so an unknown id (or one in another
// village) returns a real 404 status instead of a streamed not-found page.
export const instant = false;

export const metadata: Metadata = { title: "ข้อมูลครัวเรือน | ชุมชนพลัส" };

function MemberCard({
  member,
  address,
  selected,
}: {
  member: HouseholdMember;
  address: CopyAddress;
  selected: boolean;
}) {
  const age = ageFromBirthDate(member.birthDate);
  const isFormer = member.status !== "resident";
  return (
    <li
      id={`person-${member.id}`}
      aria-current={selected ? "true" : undefined}
      className={[
        "rounded-lg border p-4",
        selected ? "border-blue-600 bg-blue-50" : "border-gray-200",
        isFormer ? "opacity-60" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-lg font-medium">
          {fullName(member)}
          {member.nickname && <span className="text-gray-600"> ({member.nickname})</span>}
        </p>
        <CopyButton text={fullName(member)} label={`คัดลอกชื่อ ${fullName(member)}`}>
          คัดลอก
        </CopyButton>
      </div>
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 text-gray-700">
        {member.isHead ? (
          <>
            <dt className="sr-only">ความสัมพันธ์</dt>
            <dd className="col-span-2 font-medium text-blue-800">หัวหน้าครัวเรือน</dd>
          </>
        ) : (
          member.relationToHead && (
            <>
              <dt>ความสัมพันธ์</dt>
              <dd>{member.relationToHead}</dd>
            </>
          )
        )}
        {age !== null && (
          <>
            <dt>อายุ</dt>
            <dd>{age} ปี</dd>
          </>
        )}
        {member.phone && (
          <>
            <dt className="self-center">โทร</dt>
            <dd className="flex items-center gap-2">
              <a href={`tel:${member.phone}`} className="py-2 text-blue-700 underline">
                {formatPhone(member.phone)}
              </a>
              <CopyButton text={member.phone} label={`คัดลอกเบอร์โทร ${formatPhone(member.phone)}`}>
                คัดลอก
              </CopyButton>
            </dd>
          </>
        )}
        {isFormer && (
          <>
            <dt>สถานะ</dt>
            <dd>{STATUS_LABELS[member.status]}</dd>
          </>
        )}
        {member.note && (
          <>
            <dt>หมายเหตุ</dt>
            <dd>{member.note}</dd>
          </>
        )}
      </dl>
      <div className="mt-3 flex gap-2">
        <CopyButton
          text={formatCopyText(member, address)}
          label={`คัดลอกข้อมูลทั้งหมดของ ${fullName(member)}`}
          className="flex-1"
        >
          คัดลอกทั้งหมด
        </CopyButton>
        <Link
          href={`/persons/${member.id}/edit`}
          aria-label={`แก้ไขข้อมูล ${fullName(member)}`}
          className="flex min-h-11 items-center rounded border border-gray-300 px-4 text-sm text-gray-700"
        >
          แก้ไข
        </Link>
      </div>
    </li>
  );
}

export default async function HouseholdPage({ params, searchParams }: PageProps<"/households/[id]">) {
  const user = await getVillageUser();
  if (!user) notFound();

  const { id } = await params;
  const household = await getHousehold(user.villageId, id);
  if (!household) notFound();

  const { person } = await searchParams;
  const address = { houseNo: household.houseNo, ...household.village };

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <BackLink>← กลับไปหน้าค้นหา</BackLink>

      <header>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">บ้านเลขที่ {household.houseNo}</h1>
          <CopyButton text={household.houseNo} label={`คัดลอกบ้านเลขที่ ${household.houseNo}`}>
            คัดลอก
          </CopyButton>
        </div>
        {household.zone && <p className="text-gray-700">{household.zone}</p>}
        <Link href={`/households/${household.id}/edit`} className="inline-block py-2 text-blue-700 underline">
          แก้ไขข้อมูลบ้าน
        </Link>
        {household.note && <p className="mt-1 text-gray-700">หมายเหตุ: {household.note}</p>}
      </header>

      {household.residents.length === 0 && (
        <p className="self-start rounded bg-amber-100 px-3 py-1 font-medium text-amber-900">บ้านว่าง</p>
      )}

      {household.residents.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">สมาชิก ({household.residents.length} คน)</h2>
          <ul aria-label="สมาชิกในบ้าน" className="flex flex-col gap-3">
            {household.residents.map((m) => (
              <MemberCard key={m.id} member={m} address={address} selected={m.id === person} />
            ))}
          </ul>
        </section>
      )}

      {household.former.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-600">ย้ายออกหรือเสียชีวิต</h2>
          <ul aria-label="อดีตสมาชิก" className="flex flex-col gap-3">
            {household.former.map((m) => (
              <MemberCard key={m.id} member={m} address={address} selected={m.id === person} />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
