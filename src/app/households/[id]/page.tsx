import { Pencil, Phone, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ageFromBirthDate } from "@/lib/age";
import { formatCopyText, type CopyAddress } from "@/lib/copy-text";
import { formatPhone, fullName, STATUS_LABELS } from "@/lib/format";
import { getHousehold, type HouseholdMember } from "@/lib/households";
import { getVillageUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { PageShell } from "../../app-bar";
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
  const details = [
    !member.isHead && member.relationToHead,
    member.nickname && `ชื่อเล่น ${member.nickname}`,
    age !== null && `อายุ ${age} ปี`,
  ].filter(Boolean);

  return (
    <li
      id={`person-${member.id}`}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex flex-col gap-3 rounded-md border-2 border-foreground p-4",
        // Former members get a label and a grey dashed card, never faded text.
        isFormer && "border-dashed bg-muted",
        selected && "border-3 border-solid bg-highlight",
      )}
    >
      {(member.isHead || isFormer) && (
        <div className="flex flex-wrap gap-2">
          {member.isHead && <Badge variant="strong">หัวหน้าครัวเรือน</Badge>}
          {isFormer && <Badge>{STATUS_LABELS[member.status]}</Badge>}
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-title font-bold">{fullName(member)}</p>
          {details.length > 0 && <p>{details.join(" · ")}</p>}
        </div>
        <CopyButton text={fullName(member)} label={`คัดลอกชื่อ ${fullName(member)}`}>
          คัดลอก
        </CopyButton>
      </div>

      {member.note && <p>หมายเหตุ: {member.note}</p>}

      {member.phone && (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          {/* The number alone fits a 360px screen next to "คัดลอก". */}
          <a
            href={`tel:${member.phone}`}
            className={cn(buttonVariants({ variant: "primary" }), "px-3 whitespace-nowrap tabular-nums")}
          >
            <Phone aria-hidden strokeWidth={2.5} />
            <span className="sr-only">โทร </span>
            {formatPhone(member.phone)}
          </a>
          <CopyButton text={member.phone} label={`คัดลอกเบอร์โทร ${formatPhone(member.phone)}`}>
            คัดลอก
          </CopyButton>
        </div>
      )}

      <div className="flex gap-2">
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
          className={cn(buttonVariants(), "min-h-13")}
        >
          <Pencil aria-hidden strokeWidth={2.5} />
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
    <PageShell back="กลับไปหน้าค้นหา">
      <header className="flex flex-col gap-3 border-b-2 border-foreground pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-heading font-bold tabular-nums">บ้านเลขที่ {household.houseNo}</h1>
            {household.zone && <p>{household.zone}</p>}
          </div>
          <CopyButton text={household.houseNo} label={`คัดลอกบ้านเลขที่ ${household.houseNo}`}>
            คัดลอก
          </CopyButton>
        </div>
        {household.note && <p>หมายเหตุ: {household.note}</p>}
        {household.residents.length === 0 && (
          <Badge variant="highlight" className="text-body">
            บ้านว่าง
          </Badge>
        )}
      </header>

      {household.residents.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-title font-bold">สมาชิก {household.residents.length} คน</h2>
          <ul aria-label="สมาชิกในบ้าน" className="flex flex-col gap-3">
            {household.residents.map((m) => (
              <MemberCard key={m.id} member={m} address={address} selected={m.id === person} />
            ))}
          </ul>
        </section>
      )}

      {household.former.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-title font-bold">ย้ายออกหรือเสียชีวิต</h2>
          <ul aria-label="อดีตสมาชิก" className="flex flex-col gap-3">
            {household.former.map((m) => (
              <MemberCard key={m.id} member={m} address={address} selected={m.id === person} />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-auto flex flex-col gap-3 border-t-2 border-foreground pt-6">
        <Link href={`/households/${household.id}/members/new`} className={buttonVariants()}>
          <Plus aria-hidden strokeWidth={2.5} />
          เพิ่มสมาชิก
        </Link>
        <Link href={`/households/${household.id}/edit`} className={buttonVariants()}>
          <Pencil aria-hidden strokeWidth={2.5} />
          แก้ไขข้อมูลบ้าน
        </Link>
      </section>
    </PageShell>
  );
}
