"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { isHouseNoQuery, MIN_QUERY_LENGTH } from "@/lib/search-query";

const DEBOUNCE_MS = 300;
export const SEARCH_INPUT_ID = "resident-search";

const inputClass =
  "min-h-15 w-full appearance-none rounded-md border-2 border-foreground bg-background pr-14 pl-12 text-title text-foreground [&::-webkit-search-cancel-button]:hidden";

function SearchIcon() {
  return (
    <Search
      aria-hidden
      className="pointer-events-none absolute top-1/2 left-3 size-6 -translate-y-1/2"
      strokeWidth={2.5}
    />
  );
}

export function SearchBox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  // Local state so the checkbox responds immediately, before navigation ends.
  const [includeFormer, setIncludeFormer] = useState(searchParams.get("all") === "1");
  const [value, setValue] = useState(urlQuery);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const navigate = useCallback(
    (query: string, all: boolean) => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (all) params.set("all", "1");
      const search = params.toString();
      startTransition(() => {
        router.replace(search ? `/?${search}` : "/", { scroll: false });
      });
    },
    [router],
  );

  useEffect(() => {
    const query = value.trim();
    if (query === urlQuery) return;
    // A single letter matches too much to be useful; a single digit is a
    // reasonable house number search.
    if (!isHouseNoQuery(query) && query.length > 0 && query.length < MIN_QUERY_LENGTH) return;

    const timer = setTimeout(() => navigate(query, includeFormer), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, urlQuery, includeFormer, navigate]);

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <SearchIcon />
        <input
          ref={inputRef}
          id={SEARCH_INPUT_ID}
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="กรอกชื่อ ชื่อเล่น หรือบ้านเลขที่"
          autoComplete="off"
          enterKeyHint="search"
          className={inputClass}
        />
        {value && (
          <button
            type="button"
            aria-label="ล้างคำค้น"
            onClick={() => {
              setValue("");
              inputRef.current?.focus();
            }}
            className="absolute top-1/2 right-1 flex size-13 -translate-y-1/2 items-center justify-center rounded-md"
          >
            <X aria-hidden className="size-6" strokeWidth={2.5} />
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <label className="flex min-h-13 items-center gap-3">
          <input
            type="checkbox"
            checked={includeFormer}
            onChange={(e) => {
              setIncludeFormer(e.target.checked);
              navigate(value.trim(), e.target.checked);
            }}
            className="size-7 accent-primary"
          />
          รวมผู้ที่ย้ายออก/เสียชีวิต
        </label>
        {/* Always rendered so the layout does not jump while searching. */}
        <span aria-live="polite" className="text-caption font-semibold">
          {pending ? "กำลังค้นหา..." : ""}
        </span>
      </div>
    </div>
  );
}

export function SearchBoxFallback() {
  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <SearchIcon />
        <input
          id={SEARCH_INPUT_ID}
          type="search"
          disabled
          placeholder="กรอกชื่อ ชื่อเล่น หรือบ้านเลขที่"
          className={inputClass}
        />
      </div>
      <div className="min-h-13" />
    </div>
  );
}
