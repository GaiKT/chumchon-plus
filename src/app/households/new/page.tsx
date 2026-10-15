import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVillageUser } from "@/lib/session";
import { PageShell } from "../../app-bar";
import { addHousehold } from "../../edit-actions";
import { HouseholdForm } from "../household-form";

export const instant = false;

export const metadata: Metadata = { title: "เพิ่มบ้าน | ชุมชนพลัส" };

export default async function NewHouseholdPage() {
  if (!(await getVillageUser())) notFound();

  return (
    <PageShell back="ย้อนกลับ">
      <h1 className="text-heading font-bold">เพิ่มบ้าน</h1>
      <HouseholdForm
        action={addHousehold}
        initial={{ houseNo: "", zone: null, note: null }}
        cancelHref="/"
      />
    </PageShell>
  );
}
