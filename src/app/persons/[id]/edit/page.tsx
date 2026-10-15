import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fullName } from "@/lib/format";
import { getPersonForEdit, listHouseholdOptions } from "@/lib/resident-edits";
import { getVillageUser } from "@/lib/session";
import { PageShell } from "../../../app-bar";
import { removePerson } from "../../../delete-actions";
import { DeleteSection } from "../../../delete-section";
import { savePerson } from "../../../edit-actions";
import { PersonForm } from "../../person-form";

export const instant = false;

export const metadata: Metadata = { title: "แก้ไขข้อมูลบุคคล | ชุมชนพลัส" };

export default async function EditPersonPage({ params }: PageProps<"/persons/[id]/edit">) {
  const user = await getVillageUser();
  if (!user) notFound();
  const found = await getPersonForEdit(user.villageId, (await params).id);
  if (!found) notFound();
  const { person, successors } = found;
  const households = await listHouseholdOptions(user.villageId);

  return (
    <PageShell back="ย้อนกลับ">
      <h1 className="text-heading font-bold">แก้ไขข้อมูล {fullName(person)}</h1>
      <PersonForm
        // Next keeps visited pages mounted; a new key resets the form's
        // state when the saved data has changed since it was last shown.
        key={JSON.stringify(person)}
        action={savePerson.bind(null, person.id)}
        initial={person}
        households={households}
        successors={successors}
        cancelHref={`/households/${person.householdId}?person=${person.id}`}
      />
      <DeleteSection
        action={removePerson.bind(null, person.id, person.householdId)}
        confirmText={`${person.firstName} ${person.lastName}`}
        what="บุคคลนี้"
      />
    </PageShell>
  );
}
