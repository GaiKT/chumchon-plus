"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type SignInState = { error?: string };

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) {
    return { error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" };
  }

  try {
    await auth.api.signInUsername({ body: { username, password }, headers: await headers() });
  } catch (err) {
    if (err instanceof APIError) {
      if (err.statusCode === 429) {
        return { error: "เข้าสู่ระบบไม่สำเร็จหลายครั้ง กรุณารอ 15 นาทีแล้วลองใหม่" };
      }
      return { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
    }
    throw err;
  }
  redirect("/");
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
