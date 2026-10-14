import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVillageUser } from "@/lib/session";
import { addHousehold } from "../../edit-actions";
import { HouseholdForm } from "../household-form";

export const instant = false;

export const metadata: Metadata = { title: "เพิ่มบ้าน | ชุมชนพลัส" };

export default async function NewHouseholdPage() {
  if (!(await getVillageUser())) notFound();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">เพิ่มบ้าน</h1>
      <HouseholdForm
        action={addHousehold}
        initial={{ houseNo: "", zone: null, note: null }}
        cancelHref="/"
      />
    </main>
  );
}
