"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type MenuButtonItem = {
  label: string;
  icon?: LucideIcon;
  href?: string;
  onClick?: () => void;
};

const VARIANT_CLASSES = {
  outline: "bg-white text-cda-text border border-cda-border hover:bg-cda-bg",
  primary: "bg-cda-blue text-white hover:bg-cda-blue/90",
};

const SIZE_CLASSES = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
};

// Botão com um menu de opções embaixo (não dois botões grudados) — usado onde antes
// tinha "CSV + PDF" ou "Importar planilha + Importar ficha(s)" lado a lado poluindo
// a barra de ações. Mesmo padrão de portal + fecha-ao-clicar-fora do ItemMenu (estoque).
export function MenuButton({
  label,
  icon: Icon,
  items,
  variant = "outline",
  size = "md",
}: {
  label: string;
  icon?: LucideIcon;
  items: MenuButtonItem[];
  variant?: "outline" | "primary";
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest("[data-menu-button]")) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen((v) => !v);
  }

  return (
    <div data-menu-button className="inline-block">
      <button
        ref={btnRef}
        onClick={toggle}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size]
        )}
      >
        {Icon && <Icon className="h-4 w-4" />}
        {label}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open &&
        createPortal(
          <div
            data-menu-button
            style={{ position: "fixed", top: pos.top, left: pos.left }}
            className="z-50 w-56 rounded-lg border border-cda-border bg-white p-1.5 shadow-lg"
          >
            {items.map((item, i) => {
              const conteudo = (
                <>
                  {item.icon && <item.icon className="h-3.5 w-3.5" />}
                  {item.label}
                </>
              );
              const classe =
                "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-xs font-medium text-cda-text2 hover:bg-cda-bg hover:text-cda-text";
              return item.href ? (
                <Link key={i} href={item.href} onClick={() => setOpen(false)} className={classe}>
                  {conteudo}
                </Link>
              ) : (
                <button
                  key={i}
                  onClick={() => {
                    setOpen(false);
                    item.onClick?.();
                  }}
                  className={classe}
                >
                  {conteudo}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
