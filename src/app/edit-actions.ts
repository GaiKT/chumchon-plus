"use server";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { updateHousehold, updatePerson } from "@/lib/resident-edits";
import { householdFormSchema, personFormSchema } from "@/lib/resident-fields";
import { getVillageUser } from "@/lib/session";

export type FormState = {
  fieldErrors?: Record<string, string[] | undefined>;
  /** What the user submitted, so a rejected form keeps their input. */
  values?: Record<string, string>;
};

function submitted(formData: FormData): Record<string, string> {
  // Skip React's internal "$ACTION_..." fields.
  const entries = [...formData].filter(([key]) => !key.startsWith("$"));
  return Object.fromEntries(entries.map(([key, value]) => [key, String(value)]));
}

async function requireActor() {
  // Server actions are public endpoints: re-check the session on every call.
  const user = await getVillageUser();
  if (!user) notFound();
  return { id: user.id, villageId: user.villageId };
}

export async function saveHousehold(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  const values = submitted(formData);
  const parsed = householdFormSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const result = await updateHousehold(actor, id, parsed.data);
  if (result === "notFound") notFound();
  if (result === "duplicateHouseNo") {
    return { fieldErrors: { houseNo: ["บ้านเลขที่นี้มีอยู่ในระบบแล้ว"] }, values };
  }
  redirect(`/households/${id}`);
}

export async function savePerson(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  const values = submitted(formData);
  const parsed = personFormSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const result = await updatePerson(actor, id, parsed.data);
  if (result === "notFound") notFound();
  if (result === "householdNotFound") {
    return { fieldErrors: { householdId: ["ไม่พบบ้านที่เลือก"] }, values };
  }
  redirect(`/households/${parsed.data.householdId}?person=${id}`);
}
