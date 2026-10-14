"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { isHouseNoQuery, MIN_QUERY_LENGTH } from "@/lib/search-query";

const DEBOUNCE_MS = 300;

export function SearchBox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [value, setValue] = useState(urlQuery);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const query = value.trim();
    if (query === urlQuery) return;
    // A single letter matches too much to be useful; a single digit is a
    // reasonable house number search.
    if (!isHouseNoQuery(query) && query.length > 0 && query.length < MIN_QUERY_LENGTH) return;

    const timer = setTimeout(() => {
      startTransition(() => {
        router.replace(query ? `/?q=${encodeURIComponent(query)}` : "/", { scroll: false });
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, urlQuery, router]);

  return (
    <div className="relative">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="ชื่อ นามสกุล ชื่อเล่น หรือบ้านเลขที่"
        aria-label="ค้นหาลูกบ้าน"
        autoComplete="off"
        enterKeyHint="search"
        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg"
      />
      {pending && (
        <span className="absolute top-1/2 right-4 -translate-y-1/2 text-sm text-gray-500">
          กำลังค้นหา...
        </span>
      )}
    </div>
  );
}

export function SearchBoxFallback() {
  return (
    <input
      type="search"
      disabled
      placeholder="ชื่อ นามสกุล ชื่อเล่น หรือบ้านเลขที่"
      aria-label="ค้นหาลูกบ้าน"
      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg"
    />
  );
}
