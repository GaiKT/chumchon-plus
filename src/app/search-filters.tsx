import { ChevronDown } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  filtersToQuery,
  hasListFilter,
  NO_FILTERS,
  presets,
  type ResidentFilters,
} from "@/lib/resident-filters";
import { cn } from "@/lib/utils";
import { SelectField, TextField } from "./form-fields";

/** The search page URL for a query and filters. */
export function searchHref(q: string, filters: ResidentFilters) {
  const params = new URLSearchParams(filtersToQuery(filters));
  if (q) params.set("q", q);
  const search = params.toString();
  return search ? `/?${search}` : "/";
}

/** Keeps the query, the "include former" choice and the zone; replaces the age filter. */
function withAge(filters: ResidentFilters, age: Partial<ResidentFilters>): ResidentFilters {
  return { ...NO_FILTERS, zone: filters.zone, includeFormer: filters.includeFormer, ...age };
}

/**
 * Age shortcuts and extra filters under the search box. Without a search
 * term, any of these lists everyone who matches; with one, they narrow the
 * search results.
 */
export function SearchFilters({
  q,
  filters,
  zones,
  thaiYear,
}: {
  q: string;
  filters: ResidentFilters;
  zones: string[];
  thaiYear: number;
}) {
  const current = filtersToQuery(filters);
  return (
    <div className="flex flex-col gap-3">
      <nav aria-labelledby="age-filters-label" className="flex flex-col gap-2">
        <span id="age-filters-label" className="font-bold">
          กรองตามอายุ
        </span>
        <div className="flex flex-wrap gap-2">
          {presets(thaiYear).map((preset) => {
            const selected = withAge(filters, preset.filters);
            const active = filtersToQuery(selected) === current;
            return (
              <Link
                key={preset.short}
                // Tapping the selected shortcut again clears it.
                href={searchHref(q, active ? withAge(filters, {}) : selected)}
                aria-current={active ? "page" : undefined}
                className={cn(buttonVariants({ size: "small" }), "text-body", active && "border-3 bg-highlight")}
              >
                {preset.short}
              </Link>
            );
          })}
        </div>
      </nav>

      <details className="group rounded-md border-2 border-foreground">
        <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-2 px-4 font-bold [&::-webkit-details-marker]:hidden">
          ตัวกรองเพิ่มเติม
          <ChevronDown aria-hidden className="size-6 shrink-0 group-open:rotate-180" strokeWidth={2.5} />
        </summary>
        <Form action="/" className="flex flex-col gap-5 border-t-2 border-foreground p-4">
          {q && <input type="hidden" name="q" value={q} />}
          {filters.includeFormer && <input type="hidden" name="all" value="1" />}
          <div className="grid grid-cols-2 gap-3">
            <TextField
              name="min"
              label="อายุตั้งแต่ (ปี)"
              inputMode="numeric"
              pattern="[0-9]*"
              defaultValue={filters.minAge?.toString()}
            />
            <TextField
              name="max"
              label="ถึง (ปี)"
              inputMode="numeric"
              pattern="[0-9]*"
              defaultValue={filters.maxAge?.toString()}
            />
          </div>
          {zones.length > 0 && (
            <SelectField
              name="zone"
              label="คุ้ม/ซอย"
              defaultValue={filters.zone ?? ""}
              options={[{ value: "", label: "ทุกคุ้ม" }, ...zones.map((z) => ({ value: z, label: z }))]}
            />
          )}
          <button type="submit" className={buttonVariants({ variant: "primary" })}>
            ใช้ตัวกรอง
          </button>
        </Form>
      </details>

      {hasListFilter(filters) && (
        <Link
          href={searchHref(q, { ...NO_FILTERS, includeFormer: filters.includeFormer })}
          className="inline-flex min-h-12 items-center self-start font-bold underline underline-offset-4"
        >
          ล้างตัวกรอง
        </Link>
      )}
    </div>
  );
}
