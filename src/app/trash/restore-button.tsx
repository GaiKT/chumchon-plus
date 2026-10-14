"use client";

import { useActionState } from "react";
import type { RestoreState } from "../delete-actions";
import { ActionForm } from "../form-fields";

export function RestoreButton({ action, label }: { action: () => Promise<RestoreState>; label: string }) {
  const [state, formAction, pending] = useActionState<RestoreState, FormData>(() => action(), {});
  return (
    <ActionForm action={formAction} className="flex flex-col items-end gap-1">
      <button
        type="submit"
        aria-label={label}
        disabled={pending}
        className="min-h-11 rounded border border-gray-300 px-4 text-sm disabled:opacity-60"
      >
        {pending ? "กำลังกู้คืน..." : "กู้คืน"}
      </button>
      {state.error && <p className="text-right text-sm text-red-700">{state.error}</p>}
    </ActionForm>
  );
}
