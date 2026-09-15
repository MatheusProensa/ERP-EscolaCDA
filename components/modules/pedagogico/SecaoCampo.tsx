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
  fundo,
  opcional,
  destaque,
  children,
}: {
  titulo: string;
  /** CSS var, ex.: "var(--cda-blue)". */
  cor: string;
  /** Fundo levemente colorido, compatível com `cor` — pedido do dono, ajuste
   * de contraste: "fundo branco puro deixava todas as seções iguais". */
  fundo: string;
  opcional?: boolean;
  /** ★ — pedido do dono: Momento Fundamental é o bloco principal do dia. */
  destaque?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg border border-cda-border p-5 shadow-sm lg:p-4"
      style={{ borderLeftWidth: 6, borderLeftColor: cor, backgroundColor: fundo }}
    >
      <p
        className="mb-3 flex items-center gap-1 font-bold uppercase"
        style={{ color: cor, fontSize: 13, letterSpacing: "0.5px" }}
      >
        {titulo}
        {destaque && <span aria-hidden>★</span>}
        {opcional && (
          <span className="font-normal normal-case tracking-normal text-cda-text3" style={{ fontSize: 12 }}>
            (opcional)
          </span>
        )}
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
        className="flex min-h-11 items-center gap-1 text-xs font-medium text-cda-text3 hover:text-cda-text2 lg:min-h-0"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${aberto ? "rotate-180" : ""}`} />
        {label}
      </button>
      {aberto && <div className="mt-2">{children}</div>}
    </div>
  );
}
