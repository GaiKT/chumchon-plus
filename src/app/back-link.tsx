"use client";

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
      className="self-start py-2 text-blue-700 underline"
    >
      {children}
    </button>
  );
}
