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
  /** Ação destrutiva (ex.: "Remover") — item colorido em vermelho, mesma
   * convenção do Button variant="danger". */
  danger?: boolean;
};

const VARIANT_CLASSES = {
  outline: "bg-white text-cda-text border border-cda-border hover:bg-cda-bg",
  primary: "bg-cda-blue text-white hover:bg-cda-blue/90",
};

const SIZE_CLASSES = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
};

// Gatilho só de ícone (sem rótulo/seta) — pra caber num cabeçalho de card
// apertado (ex.: ações da matrícula), no lugar de 2+ botões com texto soltos.
const SIZE_CLASSES_ICON = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
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
  iconOnly = false,
}: {
  label: string;
  icon?: LucideIcon;
  items: MenuButtonItem[];
  variant?: "outline" | "primary";
  size?: "sm" | "md";
  /** Mostra só o ícone, sem texto nem seta — o `label` vira title/aria-label
   * (acessibilidade). Ex.: menu de "⋮" num cabeçalho de card apertado. */
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest("[data-menu-button]")) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  // Achado real (relatado pelo dono do sistema, set/2026): ancorar pela borda
  // esquerda do botão (left: r.left) estourava a tela toda vez que o gatilho
  // ficava perto da borda direita — que é o caso mais comum, já que quase todo
  // uso desse menu é o botão "Exportar"/"Ações" no canto direito do cabeçalho
  // da página. Mesma solução que o ItemMenu do Estoque ("Mais ações") já usa:
  // ancora pela borda direita do botão, abrindo pra esquerda — cabe na tela
  // não importa o quão perto da borda o gatilho esteja.
  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen((v) => !v);
  }

  return (
    <div data-menu-button className="inline-block">
      <button
        ref={btnRef}
        onClick={toggle}
        title={iconOnly ? label : undefined}
        aria-label={iconOnly ? label : undefined}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
          VARIANT_CLASSES[variant],
          iconOnly ? SIZE_CLASSES_ICON[size] : SIZE_CLASSES[size]
        )}
      >
        {Icon && <Icon className="h-4 w-4" />}
        {!iconOnly && label}
        {!iconOnly && <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open &&
        createPortal(
          <div
            data-menu-button
            style={{ position: "fixed", top: pos.top, right: pos.right }}
            className="z-50 w-56 rounded-lg border border-cda-border bg-white p-1.5 shadow-lg"
          >
            {items.map((item, i) => {
              const conteudo = (
                <>
                  {item.icon && <item.icon className="h-3.5 w-3.5" />}
                  {item.label}
                </>
              );
              const classe = cn(
                "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-xs font-medium",
                item.danger
                  ? "text-cda-red hover:bg-cda-red/5"
                  : "text-cda-text2 hover:bg-cda-bg hover:text-cda-text"
              );
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
