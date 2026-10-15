"use client";

import { Check, CircleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

async function writeClipboard(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback for browsers without the async clipboard API.
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function CopyButton({
  text,
  label,
  children,
  className,
}: {
  text: string;
  /** Accessible name, e.g. "คัดลอกชื่อ-นามสกุล". */
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (status === "idle") return;
    const timer = setTimeout(() => setStatus("idle"), 3000);
    return () => clearTimeout(timer);
  }, [status]);

  return (
    <>
      <Button
        aria-label={label}
        onClick={() =>
          writeClipboard(text).then(
            () => setStatus("copied"),
            () => setStatus("failed"),
          )
        }
        className={cn("min-h-13 px-3", className)}
      >
        {children}
      </Button>
      {status !== "idle" && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+24px)] z-50 mx-auto flex w-fit items-center gap-2 rounded-md border-2 border-white bg-foreground px-5 py-3 font-bold text-white"
        >
          {status === "copied" ? (
            <Check aria-hidden className="size-6" strokeWidth={3} />
          ) : (
            <CircleAlert aria-hidden className="size-6" strokeWidth={2.5} />
          )}
          {status === "copied" ? "คัดลอกแล้ว" : "คัดลอกไม่สำเร็จ"}
        </div>
      )}
    </>
  );
}
