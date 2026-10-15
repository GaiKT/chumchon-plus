import { House, Menu } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { AppMenu } from "./app-menu";
import { BackLink } from "./back-link";

async function AccountMenu() {
  const user = await getCurrentUser();
  return <AppMenu name={user.name} role={user.role} />;
}

function MenuFallback() {
  return (
    <span aria-hidden className={cn(buttonVariants({ variant: "onPrimary" }), "opacity-50")}>
      <Menu strokeWidth={2.5} />
      เมนู
    </span>
  );
}

/**
 * The bar on top of every page: the app name on the home page, a one-tap
 * way home everywhere else, and the account menu on the right.
 */
export function AppBar({ home = false, menu = true }: { home?: boolean; menu?: boolean }) {
  return (
    <header className="bg-primary text-white">
      <div className="mx-auto flex min-h-16 w-full max-w-xl items-center justify-between gap-2 px-4 py-2">
        {home ? (
          <span className="text-title font-bold">ชุมชนพลัส</span>
        ) : (
          <Link href="/" className={buttonVariants({ variant: "onPrimary" })}>
            <House strokeWidth={2.5} />
            หน้าแรก
          </Link>
        )}
        {menu && (
          <Suspense fallback={<MenuFallback />}>
            <AccountMenu />
          </Suspense>
        )}
      </div>
    </header>
  );
}

/**
 * App bar plus the page's main column. `back` adds a "back" link on top of
 * the page; without it the page is the home page.
 */
export function PageShell({
  back,
  menu,
  className,
  children,
}: {
  back?: string;
  menu?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <AppBar home={!back} menu={menu} />
      <main className={cn("mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 p-4 pb-8", className)}>
        {back && <BackLink>{back}</BackLink>}
        {children}
      </main>
    </>
  );
}
