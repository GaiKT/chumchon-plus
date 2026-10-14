"use server";

import { refresh } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { getVillageUser } from "@/lib/session";
import { revokeSession, revokeUserSessions, setUserDisabled } from "@/lib/sessions-admin";

async function requireActor() {
  const user = await getVillageUser();
  if (!user) notFound();
  return user;
}

export async function signOutDevice(sessionId: string) {
  const user = await requireActor();
  await revokeSession({ id: user.id, villageId: user.villageId }, sessionId);
  if (sessionId === user.sessionId) redirect("/login");
  refresh();
}

export async function signOutEverywhere(userId: string) {
  const user = await requireActor();
  await revokeUserSessions({ id: user.id, villageId: user.villageId }, userId);
  if (userId === user.id) redirect("/login");
  refresh();
}

export async function setAccountDisabled(userId: string, disabled: boolean) {
  const user = await requireActor();
  await setUserDisabled({ id: user.id, villageId: user.villageId }, userId, disabled);
  refresh();
}
