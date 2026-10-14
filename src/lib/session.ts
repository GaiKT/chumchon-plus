import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";

export type CurrentUser = {
  id: string;
  name: string;
  role: "admin" | "superadmin";
  villageId: string | null;
};

/**
 * Reads the session on every request (deduplicated within one render).
 * Deliberately not cached across requests, so a revoked session or a
 * changed role takes effect immediately. Redirects to /login if signed out.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { id, name, role, villageId } = session.user;
  return {
    id,
    name,
    role: role as CurrentUser["role"],
    villageId: villageId ?? null,
  };
});

export type VillageUser = CurrentUser & { role: "admin"; villageId: string };

/** The signed-in user if they may see resident data of their village, else null. */
export async function getVillageUser(): Promise<VillageUser | null> {
  const user = await getCurrentUser();
  if (user.role !== "admin" || !user.villageId) return null;
  return user as VillageUser;
}
