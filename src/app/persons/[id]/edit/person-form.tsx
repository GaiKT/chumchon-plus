"use client";

import { useActionState } from "react";
import { toThaiDateInput } from "@/lib/resident-fields";
import { savePerson, type FormState } from "../../../edit-actions";
import { FormActions, SelectField, TextField } from "../../../form-fields";

type Person = {
  id: string;
  householdId: string;
  title: string | null;
  firstName: string;
  lastName: string;
  nickname: string | null;
  relationToHead: string | null;
  birthDate: string | null;
  phone: string | null;
  note: string | null;
};

export function PersonForm({
  person,
  households,
}: {
  person: Person;
  households: { id: string; houseNo: string }[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    savePerson.bind(null, person.id),
    {},
  );
  const initial: Record<keyof Person, string | null> = {
    ...person,
    birthDate: toThaiDateInput(person.birthDate),
  };
  const value = (field: keyof Person) => state.values?.[field] ?? initial[field];
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4">
      <TextField name="title" label="คำนำหน้า" defaultValue={value("title")} errors={errors.title} />
      <TextField
        name="firstName"
        label="ชื่อ"
        defaultValue={value("firstName")}
        errors={errors.firstName}
        required
      />
      <TextField
        name="lastName"
        label="นามสกุล"
        defaultValue={value("lastName")}
        errors={errors.lastName}
        required
      />
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
      <TextField
        name="phone"
        label="เบอร์โทร"
        type="tel"
        defaultValue={value("phone")}
        errors={errors.phone}
      />
      <TextField name="note" label="หมายเหตุ" defaultValue={value("note")} errors={errors.note} />
      <SelectField
        name="householdId"
        label="บ้านเลขที่ (เปลี่ยนเพื่อย้ายบ้าน)"
        defaultValue={value("householdId") ?? person.householdId}
        errors={errors.householdId}
        options={households.map((h) => ({ value: h.id, label: h.houseNo }))}
      />
      <FormActions
        pending={pending}
        cancelHref={`/households/${person.householdId}?person=${person.id}`}
      />
    </form>
  );
}
