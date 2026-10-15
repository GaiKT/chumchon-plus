"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { signIn, type SignInState } from "../actions";
import { ActionForm, TextField } from "../form-fields";

export function SignInForm() {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signIn, {});

  // ActionForm keeps the username after a wrong password.
  return (
    <ActionForm action={formAction} className="flex flex-col gap-5">
      <TextField name="username" label="ชื่อผู้ใช้" autoComplete="username" autoCapitalize="none" required />
      <TextField name="password" label="รหัสผ่าน" type="password" autoComplete="current-password" required />
      {state.error && (
        <Alert variant="error" role="alert">
          <p>{state.error}</p>
        </Alert>
      )}
      <button
        type="submit"
        disabled={pending}
        className={buttonVariants({ variant: "primary", size: "large" })}
      >
        {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </button>
    </ActionForm>
  );
}
