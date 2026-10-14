import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fullName } from "@/lib/format";
import { getPersonForEdit, listHouseholdOptions } from "@/lib/resident-edits";
import { getVillageUser } from "@/lib/session";
import { PersonForm } from "./person-form";

export const instant = false;

export const metadata: Metadata = { title: "แก้ไขข้อมูลบุคคล | ชุมชนพลัส" };

export default async function EditPersonPage({ params }: PageProps<"/persons/[id]/edit">) {
  const user = await getVillageUser();
  if (!user) notFound();
  const person = await getPersonForEdit(user.villageId, (await params).id);
  if (!person) notFound();
  const households = await listHouseholdOptions(user.villageId);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">แก้ไขข้อมูล {fullName(person)}</h1>
      <PersonForm person={person} households={households} />
    </main>
  );
}
