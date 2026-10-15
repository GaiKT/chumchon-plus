import type { Metadata } from "next";
import { PageShell } from "../app-bar";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "เข้าสู่ระบบ | ชุมชนพลัส" };

export default function LoginPage() {
  return (
    <PageShell menu={false} className="max-w-md pt-10">
      <h1 className="text-heading font-bold">เข้าสู่ระบบ</h1>
      <SignInForm />
    </PageShell>
  );
}
