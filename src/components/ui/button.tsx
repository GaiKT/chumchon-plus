import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Shared by buttons and by links that look like buttons. */
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md border-2 px-4 text-center font-bold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-6 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "border-primary bg-primary text-white active:border-primary-pressed active:bg-primary-pressed",
        secondary: "border-foreground bg-background text-foreground active:bg-muted",
        danger: "border-danger bg-danger text-white active:border-danger-strong active:bg-danger-strong",
        /** Text-only, e.g. the first step of a delete. */
        link: "border-transparent px-0 underline underline-offset-4",
        /** On the dark app bar. */
        onPrimary: "border-white bg-transparent text-white active:bg-primary-pressed",
      },
      size: {
        default: "min-h-14 text-body",
        large: "min-h-15 text-title",
        small: "min-h-12 px-3 text-caption",
      },
    },
    defaultVariants: { variant: "secondary", size: "default" },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: React.ComponentProps<"button"> & ButtonVariants) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
