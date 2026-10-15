"use server";

import { notFound } from "next/navigation";
import { z } from "zod";
import {
  createHousehold,
  createPerson,
  updateHousehold,
  updatePerson,
} from "@/lib/resident-edits";
import { householdFormSchema, newHeadSchema, personFormSchema } from "@/lib/resident-fields";
import { getVillageUser } from "@/lib/session";
import { showAfterChange } from "./show-after-change";

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


const DUPLICATE_HOUSE_NO = { houseNo: ["บ้านเลขที่นี้มีอยู่ในระบบแล้ว"] };

export async function addHousehold(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  const values = submitted(formData);
  const parsed = householdFormSchema.omit({ headPersonId: true }).safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const result = await createHousehold(actor, parsed.data);
  if (result === "duplicateHouseNo") return { fieldErrors: DUPLICATE_HOUSE_NO, values };
  showAfterChange(`/households/${result.id}`);
}

export async function saveHousehold(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  const values = submitted(formData);
  const parsed = householdFormSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const result = await updateHousehold(actor, id, parsed.data);
  if (result === "notFound") notFound();
  if (result === "duplicateHouseNo") return { fieldErrors: DUPLICATE_HOUSE_NO, values };
  if (result === "invalidHead") {
    return { fieldErrors: { headPersonId: ["หัวหน้าครัวเรือนต้องเป็นสมาชิกที่อาศัยอยู่ในบ้านนี้"] }, values };
  }
  showAfterChange(`/households/${id}`);
}

export async function addPerson(householdId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  const values = submitted(formData);
  const parsed = personFormSchema.safeParse({ ...values, householdId, status: "resident" });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const result = await createPerson(actor, parsed.data);
  if (result === "householdNotFound") notFound();
  showAfterChange(`/households/${householdId}?person=${result.id}`);
}

export async function savePerson(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  const values = submitted(formData);
  const parsed = personFormSchema.safeParse(values);
  const head = newHeadSchema.safeParse(values);
  if (!parsed.success || !head.success) {
    return {
      fieldErrors: {
        ...(parsed.error && z.flattenError(parsed.error).fieldErrors),
        ...(head.error && z.flattenError(head.error).fieldErrors),
      },
      values,
    };
  }

  const result = await updatePerson(actor, id, parsed.data, head.data.newHeadPersonId);
  if (result === "notFound") notFound();
  if (result === "householdNotFound") {
    return { fieldErrors: { householdId: ["ไม่พบบ้านที่เลือก"] }, values };
  }
  if (result === "needsNewHead") {
    return {
      fieldErrors: { newHeadPersonId: ["กรุณาเลือกหัวหน้าครัวเรือนคนใหม่จากสมาชิกที่ยังอาศัยอยู่"] },
      values,
    };
  }
  showAfterChange(`/households/${parsed.data.householdId}?person=${id}`);
}
