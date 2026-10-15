"use client";

import { ChevronDown, CircleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const controlClass =
  "min-h-14 w-full rounded-md border-2 border-foreground bg-background px-3 text-body text-foreground aria-invalid:border-3 aria-invalid:border-danger";

function FieldShell({
  id,
  label,
  required,
  hint,
  errors,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  errors?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <label htmlFor={id} className="font-bold">
          {label}
        </label>
        {/* Screen readers get this from the input's `required` attribute. */}
        {required && (
          <span aria-hidden className="text-caption">
            (จำเป็น)
          </span>
        )}
      </div>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-caption">
          {hint}
        </p>
      )}
      {errors && (
        <p id={`${id}-error`} className="flex gap-2 font-semibold text-danger-strong">
          <CircleAlert aria-hidden className="mt-1 size-5 shrink-0" strokeWidth={2.5} />
          <span>{errors.join(" ")}</span>
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, hint?: string, errors?: string[]) {
  return [hint && `${id}-hint`, errors && `${id}-error`].filter(Boolean).join(" ") || undefined;
}

export function TextField({
  name,
  label,
  defaultValue,
  errors,
  hint,
  required,
  ...inputProps
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  errors?: string[];
  hint?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "defaultValue">) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} errors={errors}>
      <input
        id={id}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        aria-invalid={errors ? true : undefined}
        aria-describedby={describedBy(id, hint, errors)}
        className={controlClass}
        {...inputProps}
      />
    </FieldShell>
  );
}

/**
 * Submits to a server action without React's automatic form reset. That
 * reset puts selects back to their first option after a rejected submit
 * (e.g. status back to "อาศัยอยู่"), so a second submit would save values
 * the user never chose.
 *
 * Pass `result` (the action state) to move focus to the first invalid field
 * whenever the server rejects the form.
 */
export function ActionForm({
  action,
  result,
  className,
  children,
}: {
  action: (formData: FormData) => void;
  result?: unknown;
  className?: string;
  children: React.ReactNode;
}) {
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [result]);

  return (
    <form
      ref={formRef}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => action(formData));
      }}
    >
      {children}
    </form>
  );
}

/** Shown on top of a rejected form, next to the per-field messages. */
export function FormErrorSummary({ fieldErrors }: { fieldErrors?: Record<string, string[] | undefined> }) {
  const count = Object.values(fieldErrors ?? {}).filter((e) => e?.length).length;
  if (count === 0) return null;
  return (
    <Alert variant="error" role="alert">
      <p>บันทึกไม่สำเร็จ กรุณาแก้ไข {count} ช่องที่มีเครื่องหมาย</p>
    </Alert>
  );
}

export function SelectField({
  name,
  label,
  defaultValue,
  onChange,
  errors,
  options,
}: {
  name: string;
  label: string;
  defaultValue: string | null;
  onChange?: (value: string) => void;
  errors?: string[];
  options: { value: string; label: string }[];
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} errors={errors}>
      <div className="relative">
        <select
          id={id}
          name={name}
          defaultValue={defaultValue ?? ""}
          onChange={onChange && ((e) => onChange(e.target.value))}
          aria-invalid={errors ? true : undefined}
          aria-describedby={describedBy(id, undefined, errors)}
          className={cn(controlClass, "appearance-none pr-12")}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 size-6 -translate-y-1/2"
          strokeWidth={2.5}
        />
      </div>
    </FieldShell>
  );
}

export function FormActions({ pending, cancelHref }: { pending: boolean; cancelHref: string }) {
  return (
    <div className="flex flex-col gap-3 pt-2">
      <button
        type="submit"
        disabled={pending}
        className={buttonVariants({ variant: "primary", size: "large" })}
      >
        {pending ? "กำลังบันทึกข้อมูล..." : "บันทึกข้อมูล"}
      </button>
      <Link href={cancelHref} replace className={buttonVariants({ variant: "secondary" })}>
        ยกเลิก
      </Link>
    </div>
  );
}

const OTHER = "__other";

/**
 * A select of common values with "อื่นๆ (พิมพ์เอง)" for anything else, so
 * people pick instead of type. A saved value that is not in the list opens
 * as "อื่นๆ" with the text filled in.
 */
export function ChoiceField({
  name,
  label,
  choices,
  defaultValue,
  errors,
  emptyLabel = "ไม่ระบุ",
}: {
  name: string;
  label: string;
  choices: { value: string; label?: string }[];
  defaultValue?: string | null;
  errors?: string[];
  emptyLabel?: string;
}) {
  const id = useId();
  const start = defaultValue ?? "";
  const known = start === "" || choices.some((c) => c.value === start);
  const [choice, setChoice] = useState(known ? start : OTHER);
  const [text, setText] = useState(known ? "" : start);
  const textRef = useRef<HTMLInputElement>(null);
  const isOther = choice === OTHER;

  return (
    <FieldShell id={id} label={label} errors={errors}>
      <input type="hidden" name={name} value={isOther ? text : choice} />
      <div className="relative">
        <select
          id={id}
          value={choice}
          onChange={(e) => {
            setChoice(e.target.value);
            // Let the user type straight away after picking "อื่นๆ".
            if (e.target.value === OTHER) requestAnimationFrame(() => textRef.current?.focus());
          }}
          aria-invalid={errors ? true : undefined}
          aria-describedby={describedBy(id, undefined, errors)}
          className={cn(controlClass, "appearance-none pr-12")}
        >
          <option value="">{emptyLabel}</option>
          {choices.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label ?? c.value}
            </option>
          ))}
          <option value={OTHER}>อื่นๆ (พิมพ์เอง)</option>
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 size-6 -translate-y-1/2"
          strokeWidth={2.5}
        />
      </div>
      {isOther && (
        <input
          ref={textRef}
          aria-label={`${label} (พิมพ์เอง)`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={controlClass}
        />
      )}
    </FieldShell>
  );
}

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

/** How far back the year list goes. */
const OLDEST_AGE = 120;

function daysInMonth(month: string, yearBE: string): number {
  if (!month) return 31;
  // Without a year, allow 29 February.
  const year = yearBE ? Number(yearBE) - 543 : 2000;
  return new Date(Date.UTC(year, Number(month), 0)).getUTCDate();
}

/**
 * Birth date as three dropdowns (day, month, Buddhist-era year), which
 * phones show as large wheels and which cannot produce 31 February. Posts
 * "dd/mm/yyyy" (B.E.) like the old text field, or "" when unknown.
 */
export function BirthDateField({
  name,
  label,
  defaultValue,
  errors,
}: {
  name: string;
  label: string;
  /** "dd/mm/yyyy" in the Buddhist era, or empty. */
  defaultValue?: string | null;
  errors?: string[];
}) {
  const id = useId();
  const [d = "", m = "", y = ""] = /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(defaultValue ?? "")
    ? defaultValue!.split("/").map((part, i) => (i < 2 ? String(Number(part)) : part))
    : [];
  const [day, setDay] = useState(d);
  const [month, setMonth] = useState(m);
  const [year, setYear] = useState(y);
  const [thisYear] = useState(() => new Date().getFullYear() + 543);

  const maxDay = daysInMonth(month, year);
  const filled = [day, month, year].filter(Boolean).length;
  const value =
    filled === 0 ? "" : filled === 3 ? `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}` : "incomplete";
  // A day the new month or year does not have (e.g. 30 February) is cleared.
  const keepDay = (nextMonth: string, nextYear: string) => {
    if (day && Number(day) > daysInMonth(nextMonth, nextYear)) setDay("");
  };

  const errorId = `${id}-error`;
  const select = (props: {
    part: string;
    partLabel: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
  }) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`${id}-${props.part}`} className="text-caption">
        {props.partLabel}
      </label>
      <div className="relative">
        <select
          id={`${id}-${props.part}`}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          aria-invalid={errors ? true : undefined}
          aria-describedby={errors ? errorId : undefined}
          className={cn(controlClass, "appearance-none pr-10")}
        >
          <option value="">–</option>
          {props.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-2 size-6 -translate-y-1/2"
          strokeWidth={2.5}
        />
      </div>
    </div>
  );

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-bold">{label}</legend>
      <input type="hidden" name={name} value={value} />
      <div className="grid grid-cols-[6rem_1fr] gap-3">
        {select({
          part: "day",
          partLabel: "วัน",
          value: day,
          onChange: setDay,
          options: Array.from({ length: maxDay }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
        })}
        {select({
          part: "month",
          partLabel: "เดือน",
          value: month,
          onChange: (v) => {
            setMonth(v);
            keepDay(v, year);
          },
          options: THAI_MONTHS.map((name, i) => ({ value: String(i + 1), label: name })),
        })}
      </div>
      <div className="grid grid-cols-[1fr_auto] items-end gap-3">
        {select({
          part: "year",
          partLabel: "ปี พ.ศ.",
          value: year,
          onChange: (v) => {
            setYear(v);
            keepDay(month, v);
          },
          options: Array.from({ length: OLDEST_AGE + 1 }, (_, i) => {
            const be = String(thisYear - i);
            return { value: be, label: be };
          }),
        })}
        {filled > 0 && (
          <button
            type="button"
            onClick={() => {
              setDay("");
              setMonth("");
              setYear("");
            }}
            className="min-h-14 px-2 font-bold underline underline-offset-4"
          >
            ไม่ทราบวันเกิด
          </button>
        )}
      </div>
      {errors && (
        <p id={errorId} className="flex gap-2 font-semibold text-danger-strong">
          <CircleAlert aria-hidden className="mt-1 size-5 shrink-0" strokeWidth={2.5} />
          <span>วันเกิดไม่ครบ กรุณาเลือกวัน เดือน และปีให้ครบ หรือกด &quot;ไม่ทราบวันเกิด&quot;</span>
        </p>
      )}
    </fieldset>
  );
}
