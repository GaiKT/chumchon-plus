"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { RestoreState } from "../delete-actions";
import { ActionForm } from "../form-fields";

export function RestoreButton({ action, label }: { action: () => Promise<RestoreState>; label: string }) {
  const [state, formAction, pending] = useActionState<RestoreState, FormData>(() => action(), {});
  return (
    <ActionForm action={formAction} className="flex flex-col gap-2">
      <Button type="submit" aria-label={label} disabled={pending} className="w-full">
        {pending ? "กำลังกู้คืน..." : "กู้คืน"}
      </Button>
      {state.error && <p className="font-semibold text-danger-strong">{state.error}</p>}
    </ActionForm>
  );
}
