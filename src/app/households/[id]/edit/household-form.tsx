"use client";

import { useActionState } from "react";
import { saveHousehold, type FormState } from "../../../edit-actions";
import { FormActions, TextField } from "../../../form-fields";

type Household = { id: string; houseNo: string; zone: string | null; note: string | null };

export function HouseholdForm({ household }: { household: Household }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveHousehold.bind(null, household.id),
    {},
  );
  const value = (field: keyof Household) => state.values?.[field] ?? household[field];
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4">
      <TextField
        name="houseNo"
        label="บ้านเลขที่"
        defaultValue={value("houseNo")}
        errors={errors.houseNo}
        required
      />
      <TextField name="zone" label="คุ้ม/ซอย" defaultValue={value("zone")} errors={errors.zone} />
      <TextField name="note" label="หมายเหตุ" defaultValue={value("note")} errors={errors.note} />
      <FormActions pending={pending} cancelHref={`/households/${household.id}`} />
    </form>
  );
}
