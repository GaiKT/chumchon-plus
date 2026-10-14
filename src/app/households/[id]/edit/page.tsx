import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getHouseholdForEdit } from "@/lib/resident-edits";
import { getVillageUser } from "@/lib/session";
import { removeHousehold } from "../../../delete-actions";
import { DeleteSection } from "../../../delete-section";
import { saveHousehold } from "../../../edit-actions";
import { HouseholdForm } from "../../household-form";

export const instant = false;

export const metadata: Metadata = { title: "แก้ไขข้อมูลบ้าน | ชุมชนพลัส" };

export default async function EditHouseholdPage({ params }: PageProps<"/households/[id]/edit">) {
  const user = await getVillageUser();
  if (!user) notFound();
  const household = await getHouseholdForEdit(user.villageId, (await params).id);
  if (!household) notFound();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">แก้ไขข้อมูลบ้านเลขที่ {household.houseNo}</h1>
      <HouseholdForm
        action={saveHousehold.bind(null, household.id)}
        initial={household}
        residents={household.residents}
        cancelHref={`/households/${household.id}`}
      />
      <DeleteSection
        action={removeHousehold.bind(null, household.id)}
        confirmText={household.houseNo}
        what="บ้านนี้"
      />
    </main>
  );
}
