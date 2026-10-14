import type { Metadata } from "next";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "เข้าสู่ระบบ | ชุมชนพลัส" };

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-sm p-4 pt-16">
      <h1 className="mb-6 text-2xl font-semibold">เข้าสู่ระบบ</h1>
      <SignInForm />
    </main>
  );
}
