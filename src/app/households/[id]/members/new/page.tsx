import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getHouseholdForEdit } from "@/lib/resident-edits";
import { getVillageUser } from "@/lib/session";
import { PageShell } from "../../../../app-bar";
import { addPerson } from "../../../../edit-actions";
import { EMPTY_PERSON, PersonForm } from "../../../../persons/person-form";

export const instant = false;

export const metadata: Metadata = { title: "เพิ่มสมาชิก | ชุมชนพลัส" };

export default async function NewMemberPage({ params }: PageProps<"/households/[id]/members/new">) {
  const user = await getVillageUser();
  if (!user) notFound();
  const household = await getHouseholdForEdit(user.villageId, (await params).id);
  if (!household) notFound();

  return (
    <PageShell back="กลับ">
      <h1 className="text-heading font-bold">เพิ่มสมาชิกบ้านเลขที่ {household.houseNo}</h1>
      <PersonForm
        action={addPerson.bind(null, household.id)}
        initial={{ ...EMPTY_PERSON, householdId: household.id }}
        cancelHref={`/households/${household.id}`}
      />
    </PageShell>
  );
}
