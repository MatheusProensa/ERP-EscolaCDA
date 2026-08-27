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

  // cn() aqui é só concatenação (sem dedupe tipo tailwind-merge) — se o className vier com um
  // "max-w-*" próprio, tem que substituir o padrão "max-w-lg", não empilhar os dois: com as duas
  // classes juntas, quem "ganha" no CSS depende da ordem em que o Tailwind gerou o stylesheet, não
  // da ordem no atributo class, e isso já deixou modal grande preso no tamanho pequeno (max-w-lg).
  const temLarguraPropria = className?.includes("max-w-");

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-cda-navy/40" onClick={onClose} />
      <div
        className={cn(
          "relative max-h-[90vh] w-full overflow-y-auto rounded-[10px] bg-cda-surface shadow-xl",
          !temLarguraPropria && "max-w-lg",
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-cda-border px-5 py-4">
            <h3 className="text-sm font-semibold text-cda-text">{title}</h3>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="rounded-md p-1 text-cda-text3 hover:bg-cda-bg hover:text-cda-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cda-blue/40"
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
