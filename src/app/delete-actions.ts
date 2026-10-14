"use server";

import { notFound, redirect } from "next/navigation";
import { refresh } from "next/cache";
import {
  deleteHousehold,
  deletePerson,
  restoreHousehold,
  restorePerson,
} from "@/lib/resident-edits";
import { getVillageUser } from "@/lib/session";

export type DeleteState = { error?: string };
export type RestoreState = { error?: string };

async function requireActor() {
  const user = await getVillageUser();
  if (!user) notFound();
  return { id: user.id, villageId: user.villageId };
}

const WRONG_CONFIRMATION = "ข้อความยืนยันไม่ตรงกัน กรุณาพิมพ์ให้ตรงตามที่แสดง";

export async function removePerson(
  id: string,
  householdId: string,
  _prev: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  const result = await deletePerson(await requireActor(), id, String(formData.get("confirmation") ?? ""));
  if (result === "notFound") notFound();
  if (result === "wrongConfirmation") return { error: WRONG_CONFIRMATION };
  redirect(`/households/${householdId}`);
}

export async function removeHousehold(id: string, _prev: DeleteState, formData: FormData): Promise<DeleteState> {
  const result = await deleteHousehold(await requireActor(), id, String(formData.get("confirmation") ?? ""));
  if (result === "notFound") notFound();
  if (result === "wrongConfirmation") return { error: WRONG_CONFIRMATION };
  if (result === "hasResidents") {
    return { error: "ยังมีผู้อาศัยอยู่ในบ้านนี้ กรุณาย้ายหรือลบสมาชิกก่อน" };
  }
  redirect("/");
}

export async function undeletePerson(id: string): Promise<RestoreState> {
  const result = await restorePerson(await requireActor(), id);
  if (result === "householdDeleted") return { error: "บ้านของบุคคลนี้ถูกลบอยู่ กรุณากู้คืนบ้านก่อน" };
  refresh();
  return {};
}

export async function undeleteHousehold(id: string): Promise<RestoreState> {
  const result = await restoreHousehold(await requireActor(), id);
  if (result === "duplicateHouseNo") return { error: "มีบ้านเลขที่นี้อยู่ในระบบแล้ว จึงกู้คืนไม่ได้" };
  refresh();
  return {};
}
