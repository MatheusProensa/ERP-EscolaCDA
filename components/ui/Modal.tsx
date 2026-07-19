"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-cda-navy/40" onClick={onClose} />
      <div
        className={cn(
          "relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[10px] bg-cda-surface shadow-xl",
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-cda-border px-5 py-4">
            <h3 className="text-sm font-semibold text-cda-text">{title}</h3>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-cda-text3 hover:bg-cda-bg hover:text-cda-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
