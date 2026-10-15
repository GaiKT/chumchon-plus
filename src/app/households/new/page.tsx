import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listZones } from "@/lib/residents";
import { getVillageUser } from "@/lib/session";
import { PageShell } from "../../app-bar";
import { addHousehold } from "../../edit-actions";
import { HouseholdForm } from "../household-form";

export const instant = false;

export const metadata: Metadata = { title: "เพิ่มบ้าน | ชุมชนพลัส" };

export default async function NewHouseholdPage() {
  const user = await getVillageUser();
  if (!user) notFound();
  const zones = await listZones(user.villageId);

  return (
    <PageShell back="ย้อนกลับ">
      <h1 className="text-heading font-bold">เพิ่มบ้าน</h1>
      <HouseholdForm
        action={addHousehold}
        initial={{ houseNo: "", zone: null, note: null }}
        zones={zones}
        cancelHref="/"
      />
    </PageShell>
  );
}
