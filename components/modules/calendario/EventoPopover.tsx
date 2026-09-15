"use client";

import { X, Pencil, Trash2 } from "lucide-react";
import { corCategoria } from "@/lib/calendario";

type Evento = {
  id: string;
  titulo: string;
  data: string;
  categoria: string;
  descricao: string | null;
  responsavel?: string | null;
};

const LARGURA = 260;

/** Popup ao clicar num evento na grade — pedido do dono, mockup de
 * referência: nome completo, data, categoria e Editar/Excluir, em vez de ir
 * direto pro modal de edição. "Editar"/"Excluir" chamam as MESMAS funções
 * que o CalendarioCompleto já tinha (abrirEditar/ConfirmDialog) — isso aqui
 * é só um passo visual a mais antes, sem lógica nova. */
export function EventoPopover({
  evento,
  x,
  y,
  podeEditar,
  onEditar,
  onExcluir,
  onFechar,
}: {
  evento: Evento;
  x: number;
  y: number;
  podeEditar: boolean;
  onEditar: () => void;
  onExcluir: () => void;
  onFechar: () => void;
}) {
  const cor = corCategoria(evento.categoria);
  const left = typeof window !== "undefined" ? Math.min(x, window.innerWidth - LARGURA - 16) : x;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onFechar} />
      <div
        className="fixed z-50 rounded-lg border border-cda-border bg-white p-3.5 shadow-lg"
        style={{ left, top: y + 10, width: LARGURA }}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-cda-text">{evento.titulo}</p>
          <button onClick={onFechar} aria-label="Fechar" className="shrink-0 text-cda-text3 hover:text-cda-text">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-2 text-xs text-cda-text3">
          {new Date(evento.data).toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "long", year: "numeric" })}
        </p>
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{ backgroundColor: cor.bg, color: cor.text }}
        >
          {evento.categoria}
        </span>
        {podeEditar && (
          <div className="mt-3 flex gap-4 border-t border-cda-border pt-3">
            <button onClick={onEditar} className="flex items-center gap-1.5 text-xs font-medium text-cda-blue hover:underline">
              <Pencil className="h-3.5 w-3.5" /> Editar
            </button>
            <button onClick={onExcluir} className="flex items-center gap-1.5 text-xs font-medium text-cda-red hover:underline">
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </button>
          </div>
        )}
      </div>
    </>
  );
}
