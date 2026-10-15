import "server-only";
import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";

/**
 * Shows a page after a change to resident data. The history entry of the
 * form is replaced, so "back" does not reopen it, and pages the client
 * cached before the change (such as that form) are dropped.
 */
export function showAfterChange(url: string): never {
  revalidatePath("/", "layout");
  redirect(url, RedirectType.replace);
}
