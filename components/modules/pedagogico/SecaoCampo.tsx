"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

/** Card de seção com borda colorida à esquerda (6px) — pedido do dono,
 * redesign v4: "fundo colorido ficava pesado, quero fundo sempre branco e a
 * cor só na borda". Reutilizado pelas 5 seções de cada dia do Planejamento
 * (Temática/Contexto, Momento Inicial, Fundamental, Final, Folhas
 * Imprimíveis) — 1 cor de identidade por seção, sempre a mesma em toda a
 * tela (ver PALETA_SECAO em SemanaPlanejamento.tsx). */
export function SecaoCampo({
  titulo,
  cor,
  opcional,
  destaque,
  children,
}: {
  titulo: string;
  /** CSS var, ex.: "var(--cda-blue)". */
  cor: string;
  opcional?: boolean;
  /** ★ — pedido do dono: Momento Fundamental é o bloco principal do dia. */
  destaque?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-cda-border bg-white p-4 shadow-sm" style={{ borderLeftWidth: 6, borderLeftColor: cor }}>
      <p className="mb-3 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide" style={{ color: cor }}>
        {titulo}
        {destaque && <span aria-hidden>★</span>}
        {opcional && <span className="font-normal normal-case text-cda-text3">(opcional)</span>}
      </p>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

/** "Questionamentos possíveis" recolhido por padrão dentro da seção — pedido
 * do dono, redesign v4: são campos de apoio (nunca obrigatórios, ver
 * estadoDoDia), não precisam competir por espaço com o campo principal. */
export function Disclosure({ label, children }: { label: string; children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="inline-flex items-center gap-1 text-xs font-medium text-cda-text3 hover:text-cda-text2"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${aberto ? "rotate-180" : ""}`} />
        {label}
      </button>
      {aberto && <div className="mt-2">{children}</div>}
    </div>
  );
}
