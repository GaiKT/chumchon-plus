"use client";

import { useActionState, useState } from "react";
import { fullName, STATUS_LABELS } from "@/lib/format";
import { PERSON_STATUSES, toThaiDateInput } from "@/lib/resident-fields";
import type { FormState } from "../edit-actions";
import { Alert } from "@/components/ui/alert";
import { ActionForm, FormActions, FormErrorSummary, SelectField, TextField } from "../form-fields";

type Initial = {
  householdId: string;
  title: string | null;
  firstName: string;
  lastName: string;
  nickname: string | null;
  relationToHead: string | null;
  birthDate: string | null;
  phone: string | null;
  note: string | null;
  status: string;
};

type Option = { id: string; houseNo: string };
type Resident = { id: string; title: string | null; firstName: string; lastName: string };

export const EMPTY_PERSON: Omit<Initial, "householdId"> = {
  title: null,
  firstName: "",
  lastName: "",
  nickname: null,
  relationToHead: null,
  birthDate: null,
  phone: null,
  note: null,
  status: "resident",
};

/**
 * Adds a member (no house or status fields) or edits one. When editing the
 * household head, a successor must be picked before they can leave the house.
 */
export function PersonForm({
  action,
  initial,
  households,
  successors,
  cancelHref,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initial: Initial;
  /** Present when editing: lets the person move house and change status. */
  households?: Option[];
  /** Present when the person is the household head. */
  successors?: Resident[] | null;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const start: Record<keyof Initial, string | null> = {
    ...initial,
    birthDate: toThaiDateInput(initial.birthDate),
  };
  const value = (field: keyof Initial) => state.values?.[field] ?? start[field];
  const errors = state.fieldErrors ?? {};

  const [status, setStatus] = useState(value("status") ?? "resident");
  const [householdId, setHouseholdId] = useState(value("householdId") ?? initial.householdId);
  const leaving = status !== "resident" || householdId !== initial.householdId;

  return (
    <ActionForm action={formAction} result={state} className="flex flex-col gap-5">
      <FormErrorSummary fieldErrors={state.fieldErrors} />
      <TextField name="title" label="คำนำหน้า" defaultValue={value("title")} errors={errors.title} />
      <TextField name="firstName" label="ชื่อ" defaultValue={value("firstName")} errors={errors.firstName} required />
      <TextField name="lastName" label="นามสกุล" defaultValue={value("lastName")} errors={errors.lastName} required />
      <TextField name="nickname" label="ชื่อเล่น" defaultValue={value("nickname")} errors={errors.nickname} />
      <TextField
        name="relationToHead"
        label="ความสัมพันธ์กับหัวหน้าครัวเรือน"
        defaultValue={value("relationToHead")}
        errors={errors.relationToHead}
      />
      <TextField
        name="birthDate"
        label="วันเกิด"
        hint="วว/ดด/ปปปป (พ.ศ.) เช่น 15/03/2515"
        defaultValue={value("birthDate")}
        errors={errors.birthDate}
        inputMode="numeric"
      />
      <TextField name="phone" label="เบอร์โทร" type="tel" defaultValue={value("phone")} errors={errors.phone} />
      <TextField name="note" label="หมายเหตุ" defaultValue={value("note")} errors={errors.note} />

      {households && (
        <>
          <SelectField
            name="status"
            label="สถานะ"
            defaultValue={value("status")}
            onChange={setStatus}
            errors={errors.status}
            options={PERSON_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
          />
          <SelectField
            name="householdId"
            label="บ้านเลขที่ (เปลี่ยนเพื่อย้ายบ้าน)"
            defaultValue={value("householdId")}
            onChange={setHouseholdId}
            errors={errors.householdId}
            options={households.map((h) => ({ value: h.id, label: h.houseNo }))}
          />
        </>
      )}

      {successors && leaving && successors.length > 0 && (
        <Alert variant="warning">
          <p>บุคคลนี้เป็นหัวหน้าครัวเรือน กรุณาเลือกหัวหน้าครัวเรือนคนใหม่</p>
          <SelectField
            name="newHeadPersonId"
            label="หัวหน้าครัวเรือนคนใหม่"
            defaultValue={state.values?.newHeadPersonId ?? ""}
            errors={errors.newHeadPersonId}
            options={[
              { value: "", label: "โปรดเลือก" },
              ...successors.map((r) => ({ value: r.id, label: fullName(r) })),
            ]}
          />
        </Alert>
      )}

      <FormActions pending={pending} cancelHref={cancelHref} />
    </ActionForm>
  );
}
