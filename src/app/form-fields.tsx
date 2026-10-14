"use client";

import { useId } from "react";

const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2 text-lg aria-invalid:border-red-600";

function FieldShell({
  id,
  label,
  hint,
  errors,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  errors?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-gray-600">
          {hint}
        </p>
      )}
      {errors?.map((e) => (
        <p key={e} id={`${id}-error`} className="text-red-700">
          {e}
        </p>
      ))}
    </div>
  );
}

export function TextField({
  name,
  label,
  defaultValue,
  errors,
  hint,
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
    <FieldShell id={id} label={label} hint={hint} errors={errors}>
      <input
        id={id}
        name={name}
        defaultValue={defaultValue ?? ""}
        aria-invalid={errors ? true : undefined}
        aria-describedby={[hint && `${id}-hint`, errors && `${id}-error`].filter(Boolean).join(" ") || undefined}
        className={inputClass}
        {...inputProps}
      />
    </FieldShell>
  );
}

export function SelectField({
  name,
  label,
  defaultValue,
  errors,
  options,
}: {
  name: string;
  label: string;
  defaultValue: string;
  errors?: string[];
  options: { value: string; label: string }[];
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} errors={errors}>
      <select id={id} name={name} defaultValue={defaultValue} className={inputClass}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function FormActions({ pending, cancelHref }: { pending: boolean; cancelHref: string }) {
  return (
    <div className="flex gap-3">
      <button
        type="submit"
        disabled={pending}
        className="flex-1 rounded-lg bg-blue-700 px-4 py-3 font-medium text-white disabled:opacity-60"
      >
        {pending ? "กำลังบันทึก..." : "บันทึก"}
      </button>
      <a href={cancelHref} className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-center">
        ยกเลิก
      </a>
    </div>
  );
}
