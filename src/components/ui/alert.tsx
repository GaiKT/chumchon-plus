import { CircleAlert, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/** A boxed message with an icon; colour is never the only signal. */
export function Alert({
  variant,
  className,
  children,
  ...props
}: { variant: "error" | "warning" } & React.ComponentProps<"div">) {
  const Icon = variant === "error" ? CircleAlert : TriangleAlert;
  return (
    <div
      className={cn(
        "flex gap-3 rounded-md border-3 p-4 font-semibold",
        variant === "error" ? "border-danger bg-background text-danger-strong" : "border-foreground bg-highlight",
        className,
      )}
      {...props}
    >
      <Icon aria-hidden className="mt-1 size-6 shrink-0" strokeWidth={2.5} />
      <div className="flex min-w-0 flex-1 flex-col gap-3">{children}</div>
    </div>
  );
}
