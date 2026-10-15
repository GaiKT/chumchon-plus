"use client";

import { LogOut, Menu, Smartphone, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "./actions";

/** Account menu; signing out sits here, away from everyday buttons. */
export function AppMenu({ name, role }: { name: string; role: "admin" | "superadmin" }) {
  const [pending, startTransition] = useTransition();
  return (
    // Non-modal: a modal menu hides the rest of the page with aria-hidden
    // while it stays focusable, which screen readers handle badly.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className={buttonVariants({ variant: "onPrimary" })}>
        <Menu strokeWidth={2.5} />
        เมนู
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          เข้าสู่ระบบเป็น <strong className="block text-body">{name}</strong>
        </DropdownMenuLabel>
        {role === "admin" && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/devices">
                <Smartphone strokeWidth={2.5} />
                อุปกรณ์ที่เข้าสู่ระบบ
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/trash">
                <Trash2 strokeWidth={2.5} />
                รายการที่ถูกลบ
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="danger"
          disabled={pending}
          onSelect={() => startTransition(() => signOut())}
        >
          <LogOut strokeWidth={2.5} />
          {pending ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
