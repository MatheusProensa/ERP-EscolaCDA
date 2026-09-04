"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterSelectOption = { value: string; label: string };

/** Select de filtro com popup 100% estilizado nosso — não o <select> nativo, cujo
 * popup é desenhado pelo SO/navegador e a gente não controla (no Android/iOS saía
 * com texto quase ilegível). Mesmo padrão de portal + fecha-ao-clicar-fora do
 * MenuButton, só que troca um valor em vez de disparar uma ação. */
export function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  triggerStyle,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: FilterSelectOption[];
  placeholder: string;
  className?: string;
  /** Estilo do botão fechado — ex.: fundo/cor colorida acompanhando o valor
   * escolhido (status de Interessados). O popup de opções continua branco. */
  triggerStyle?: React.CSSProperties;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest("[data-filter-select]")) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen((v) => !v);
  }

  const selecionado = options.find((o) => o.value === value);

  return (
    <div data-filter-select className={cn("relative", className)}>
      <button
        type="button"
        ref={btnRef}
        onClick={toggle}
        disabled={disabled}
        style={triggerStyle}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-white pl-3 pr-3 text-sm text-cda-text outline-none transition-colors hover:border-cda-text3/50 focus-visible:ring-2 focus-visible:ring-cda-blue/40 disabled:cursor-not-allowed disabled:opacity-60",
          !triggerStyle && (open ? "border-cda-blue ring-2 ring-cda-blue/40" : "border-cda-border")
        )}
      >
        <span className={cn("truncate", !selecionado?.value && !triggerStyle && "text-cda-text3")}>{selecionado?.label ?? placeholder}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", !triggerStyle && "text-cda-text3", open && "rotate-180")} />
      </button>
      {open &&
        createPortal(
          <>
            {/* NOVO: fundo esmaecido enquanto o menu tá aberto — antes dava pra ver
                pedaço da tabela "vazando" do lado do popup, ficava com cara de bug. */}
            <div className="fixed inset-0 z-40 bg-cda-text/10 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
            <div
              data-filter-select
              // Largura acompanha o conteúdo (min. a do botão, até um teto), e o
              // texto quebra linha em vez de truncar com "..." — opções como
              // "3º Ano, tarde ou contraturno" ficavam ilegíveis cortadas.
              style={{ position: "fixed", top: pos.top, left: pos.left, minWidth: Math.max(pos.width, 220), maxWidth: 340 }}
              className="z-50 max-h-72 overflow-auto rounded-lg border border-cda-border bg-white p-1.5 shadow-xl"
            >
              {options.map((o) => {
                const ativo = o.value === value;
                return (
                  <button
                    key={o.value || "__todos"}
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium transition-colors",
                      ativo ? "bg-cda-blue/10 text-cda-blue" : "text-cda-text2 hover:bg-cda-bg hover:text-cda-text"
                    )}
                  >
                    <span className="whitespace-normal break-words">{o.label}</span>
                    {ativo && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
