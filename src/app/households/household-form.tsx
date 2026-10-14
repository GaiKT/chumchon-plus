"use client";

import { useActionState } from "react";
import { fullName } from "@/lib/format";
import type { FormState } from "../edit-actions";
import { ActionForm, FormActions, SelectField, TextField } from "../form-fields";

type Initial = { houseNo: string; zone: string | null; note: string | null; headPersonId?: string | null };
type Resident = { id: string; title: string | null; firstName: string; lastName: string };

/** Used both to add a house and to edit one (with its head when it has residents). */
export function HouseholdForm({
  action,
  initial,
  residents = [],
  cancelHref,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initial: Initial;
  residents?: Resident[];
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const value = (field: keyof Initial) => state.values?.[field] ?? initial[field] ?? "";
  const errors = state.fieldErrors ?? {};

  return (
    <ActionForm action={formAction} className="flex flex-col gap-4">
      <TextField
        name="houseNo"
        label="บ้านเลขที่"
        hint="เช่น 12 หรือ 12/1"
        defaultValue={value("houseNo")}
        errors={errors.houseNo}
        required
      />
      <TextField name="zone" label="คุ้ม/ซอย" defaultValue={value("zone")} errors={errors.zone} />
      <TextField name="note" label="หมายเหตุ" defaultValue={value("note")} errors={errors.note} />
      {residents.length > 0 && (
        <SelectField
          name="headPersonId"
          label="หัวหน้าครัวเรือน"
          defaultValue={value("headPersonId")}
          errors={errors.headPersonId}
          options={[
            { value: "", label: "ไม่ระบุ" },
            ...residents.map((r) => ({ value: r.id, label: fullName(r) })),
          ]}
        />
      )}
      <FormActions pending={pending} cancelHref={cancelHref} />
    </ActionForm>
  );
}
