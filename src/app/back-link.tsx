"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * Goes back in history so the search page keeps its query and results;
 * falls back to the search page when opened directly (e.g. from a shared link).
 */
export function BackLink({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
      className="-my-2 -ml-2 flex min-h-12 items-center gap-1 self-start rounded-md px-2 font-bold underline underline-offset-4"
    >
      <ChevronLeft aria-hidden className="size-6 shrink-0" strokeWidth={2.5} />
      {children}
    </button>
  );
}
