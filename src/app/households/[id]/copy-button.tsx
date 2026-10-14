"use client";

import { useEffect, useState } from "react";

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
  className = "",
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
    const timer = setTimeout(() => setStatus("idle"), 2000);
    return () => clearTimeout(timer);
  }, [status]);

  return (
    <>
      <button
        type="button"
        aria-label={label}
        onClick={() =>
          writeClipboard(text).then(
            () => setStatus("copied"),
            () => setStatus("failed"),
          )
        }
        className={`min-h-11 min-w-11 rounded border border-gray-300 px-3 text-sm text-gray-700 active:bg-gray-100 ${className}`}
      >
        {children}
      </button>
      {status !== "idle" && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-6 z-10 mx-auto w-fit rounded-full bg-gray-900 px-4 py-2 text-white shadow-lg"
        >
          {status === "copied" ? "คัดลอกแล้ว" : "คัดลอกไม่สำเร็จ"}
        </div>
      )}
    </>
  );
}
