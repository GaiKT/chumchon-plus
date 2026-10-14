"use client";

import { useActionState, useState } from "react";
import type { DeleteState } from "./delete-actions";
import { ActionForm } from "./form-fields";

/**
 * Two-step delete for records entered by mistake: reveal, then type the
 * exact confirmation text. Deleted records can be restored for 30 days.
 */
export function DeleteSection({
  action,
  confirmText,
  what,
}: {
  action: (state: DeleteState, formData: FormData) => Promise<DeleteState>;
  /** What the user must type, e.g. the full name or house number. */
  confirmText: string;
  /** e.g. "บุคคลนี้" or "บ้านนี้". */
  what: string;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, formAction, pending] = useActionState<DeleteState, FormData>(action, {});

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start py-2 text-red-700 underline"
      >
        ลบข้อมูล{what} (กรอกผิดหรือซ้ำ)
      </button>
    );
  }

  return (
    <ActionForm action={formAction} className="flex flex-col gap-3 rounded-lg border border-red-300 bg-red-50 p-4">
      <p>
        ใช้เฉพาะเมื่อกรอกข้อมูลผิดหรือซ้ำ หากย้ายออกหรือเสียชีวิต ให้เปลี่ยนสถานะแทน
        ข้อมูลที่ลบจะกู้คืนได้ภายใน 30 วัน
      </p>
      <label className="flex flex-col gap-1">
        <span>
          พิมพ์ <strong>{confirmText}</strong> เพื่อยืนยัน
        </span>
        <input
          name="confirmation"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          className="rounded-lg border border-gray-300 px-3 py-2 text-lg"
        />
      </label>
      {state.error && <p className="text-red-700">{state.error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending || typed.trim() !== confirmText}
          className="flex-1 rounded-lg bg-red-700 px-4 py-3 font-medium text-white disabled:opacity-50"
        >
          {pending ? "กำลังลบ..." : "ยืนยันการลบ"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTyped("");
          }}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3"
        >
          ยกเลิก
        </button>
      </div>
    </ActionForm>
  );
}
