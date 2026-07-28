"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, ArrowDownToLine, ArrowUpFromLine, Pencil, Trash2 } from "lucide-react";

export function ItemMenu({
  onEntrada,
  onSaida,
  onEditar,
  onExcluir,
}: {
  onEntrada: () => void;
  onSaida: () => void;
  onEditar: () => void;
  onExcluir: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest("[data-item-menu]")) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen((v) => !v);
  }

  function item(label: string, Icon: typeof ArrowDownToLine, onClick: () => void, danger = false) {
    return (
      <button
        onClick={() => {
          setOpen(false);
          onClick();
        }}
        className={
          danger
            ? "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-xs font-medium text-cda-red hover:bg-cda-bg"
            : "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-xs font-medium text-cda-text2 hover:bg-cda-bg hover:text-cda-text"
        }
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </button>
    );
  }

  return (
    <div data-item-menu>
      <button
        ref={btnRef}
        onClick={toggle}
        className="flex h-7 w-7 items-center justify-center rounded-md text-cda-text3 hover:bg-cda-bg hover:text-cda-text"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open &&
        createPortal(
          <div
            data-item-menu
            style={{ position: "fixed", top: pos.top, right: pos.right }}
            className="z-50 w-48 rounded-lg border border-cda-border bg-white p-1.5 shadow-lg"
          >
            {item("Registrar entrada", ArrowDownToLine, onEntrada)}
            {item("Registrar saída", ArrowUpFromLine, onSaida)}
            {item("Editar item", Pencil, onEditar)}
            {item("Excluir item", Trash2, onExcluir, true)}
          </div>,
          document.body
        )}
    </div>
  );
}
