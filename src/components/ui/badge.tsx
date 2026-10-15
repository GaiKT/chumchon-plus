import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center rounded-sm border-2 px-2 text-caption font-bold whitespace-nowrap",
  {
    variants: {
      variant: {
        /** e.g. "หัวหน้าครัวเรือน". */
        strong: "border-foreground bg-foreground text-white",
        /** e.g. "ย้ายออก", "เสียชีวิต". */
        outline: "border-foreground bg-background text-foreground",
        /** e.g. "บ้านว่าง". */
        highlight: "border-foreground bg-highlight text-foreground",
        danger: "border-danger bg-danger-surface text-danger-strong",
      },
    },
    defaultVariants: { variant: "outline" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
