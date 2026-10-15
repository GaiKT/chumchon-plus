"use client";

import { ChevronDown, CircleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useTransition } from "react";
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
        {pending ? "กำลังบันทึก..." : "บันทึก"}
      </button>
      <Link href={cancelHref} className={buttonVariants({ variant: "secondary" })}>
        ยกเลิก
      </Link>
    </div>
  );
}
