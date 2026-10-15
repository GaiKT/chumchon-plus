"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
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

  return (
    // Kept well away from "บันทึก" so it is not pressed by mistake.
    <section className="mt-6 border-t-2 border-foreground pt-6">
      {!open ? (
        <Button variant="link" onClick={() => setOpen(true)} className="min-h-13 text-danger-strong">
          ลบข้อมูล{what} (กรอกผิดหรือซ้ำ)
        </Button>
      ) : (
        <ActionForm
          action={formAction}
          className="flex flex-col gap-4 rounded-md border-3 border-danger bg-danger-surface p-4"
        >
          <p>
            ใช้เฉพาะเมื่อกรอกข้อมูลผิดหรือซ้ำ หากย้ายออกหรือเสียชีวิต ให้เปลี่ยนสถานะแทน
            ข้อมูลที่ลบจะกู้คืนได้ภายใน 30 วัน
          </p>
          <label className="flex flex-col gap-2">
            <span>
              พิมพ์ <strong>{confirmText}</strong> เพื่อยืนยัน
            </span>
            <input
              name="confirmation"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              className="min-h-14 rounded-md border-2 border-foreground bg-background px-3 text-body"
            />
          </label>
          {state.error && <p className="font-semibold text-danger-strong">{state.error}</p>}
          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              variant="danger"
              disabled={pending || typed.trim() !== confirmText}
            >
              {pending ? "กำลังลบข้อมูล..." : "ยืนยันการลบข้อมูล"}
            </Button>
            <Button
              onClick={() => {
                setOpen(false);
                setTyped("");
              }}
            >
              ยกเลิก
            </Button>
          </div>
        </ActionForm>
      )}
    </section>
  );
}
