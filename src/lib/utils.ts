import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the custom text sizes, otherwise it mistakes
// `text-body` for a colour and drops it next to `text-white`.
const twMerge = extendTailwindMerge({
  extend: { theme: { text: ["caption", "body", "title", "heading"] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
