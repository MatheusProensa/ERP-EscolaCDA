"use client";

import { useState } from "react";
import { LogIn, LogOut, Pencil, StickyNote } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { EditarBlocoModal } from "./EditarBlocoModal";
import type { ItemEscalaBloco, PessoaEvento } from "./types";

const CAT_CICLO: BadgeVariant[] = ["cat1", "cat2", "cat3", "cat4", "cat5", "cat6"];
function corPorTexto(texto: string): BadgeVariant {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  return CAT_CICLO[h % CAT_CICLO.length];
}
/** Agrupa "Contraturno IV / 1º Ano EF" -> "Contraturno IV", pra blocos do
 * mesmo contraturno pegarem a mesma cor de identidade visual. */
function grupoDoTitulo(titulo: string): string {
  return titulo.split(" / ")[0].trim();
}

/** "17h15*" -> 1035, "13h às 14h10" -> 780 (pega só o primeiro horário
 * citado) — só pra ordenar a linha do tempo da esquerda pra direita. */
function paraMinutos(horario: string): number {
  const m = horario.match(/(\d{1,2})h(\d{2})?/);
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2] ?? 0);
}

/** Agrupa entradas/saídas por horário (várias pessoas podem começar/sair no
 * mesmo horário) e ordena a linha do tempo da esquerda pra direita. */
function agruparPorHorario(itens: PessoaEvento[]): { horario: string; pessoas: PessoaEvento[] }[] {
  const grupos = new Map<string, PessoaEvento[]>();
  for (const it of itens) {
    const chave = it.horario ?? "";
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push(it);
  }
  return Array.from(grupos.entries())
    .map(([horario, pessoas]) => ({ horario, pessoas }))
    .sort((a, b) => paraMinutos(a.horario) - paraMinutos(b.horario));
}

/** Linha do tempo horizontal: um "degrau" por horário, pessoas empilhadas
 * embaixo dele, conectados por um traço — pra ficar explícito e fácil de ler
 * a que horas cada pessoa entra/sai, igual o quadro original mostrava
 * visualmente pela posição. Some com o traço quando não sabe a hora exata
 * (bloco da Secretaria) e cai pra lista simples, sem inventar horário. */
function LinhaDoTempo({ itens, cor }: { itens: PessoaEvento[]; cor: string }) {
  const temHorario = itens.some((it) => it.horario);
  if (!temHorario) {
    return (
      <ul className="flex flex-col gap-1">
        {itens.map((it, i) => (
          <li key={i} className="text-sm text-cda-text">
            <span className="font-medium">{it.pessoa}</span>
            {it.nota && <span className="text-cda-text3"> — {it.nota}</span>}
          </li>
        ))}
        {itens.length === 0 && <li className="text-sm text-cda-text3">—</li>}
      </ul>
    );
  }

  const grupos = agruparPorHorario(itens);
  return (
    <div className="flex gap-0 overflow-x-auto pb-1">
      {grupos.map((g, i) => (
        <div key={i} className="flex items-start">
          {i > 0 && <div className="mt-[7px] h-px w-5 shrink-0" style={{ backgroundColor: "var(--cda-border)" }} />}
          <div className="flex w-[92px] shrink-0 flex-col items-center text-center">
            <div className="h-3 w-3 rounded-full ring-4" style={{ backgroundColor: cor, ["--tw-ring-color" as string]: `color-mix(in oklch, ${cor} 18%, transparent)` }} />
            <div className="mt-1.5 text-xs font-bold text-cda-text">{g.horario || "—"}</div>
            <div className="mt-1 flex flex-col gap-1">
              {g.pessoas.map((p, j) => (
                <div key={j}>
                  <div className="text-xs font-semibold text-cda-text">{p.pessoa}</div>
                  {p.nota && <div className="text-[11px] leading-tight text-cda-text3">{p.nota}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function EscalaBlocoCard({ bloco }: { bloco: ItemEscalaBloco }) {
  const [editando, setEditando] = useState(false);
  const variant = corPorTexto(grupoDoTitulo(bloco.titulo));

  if (bloco.tipo === "NOTA") {
    return (
      <>
        <Card className="p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-cda-text3" />
              <h3 className="text-sm font-semibold text-cda-text">{bloco.titulo}</h3>
            </div>
            <IconButton icon={Pencil} label="Editar bloco" size="sm" onClick={() => setEditando(true)} />
          </div>
          {bloco.horariosReferencia.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {bloco.horariosReferencia.map((h, i) => (
                <Badge key={i} variant="neutral">
                  {h}
                </Badge>
              ))}
            </div>
          )}
          <p className="whitespace-pre-line text-sm leading-relaxed text-cda-text2">{bloco.conteudoLivre}</p>
        </Card>
        <EditarBlocoModal bloco={editando ? bloco : null} onClose={() => setEditando(false)} />
      </>
    );
  }

  return (
    <>
      <Card
        className="flex flex-col p-5"
        style={{ borderLeft: `3px solid var(--cat-${variant.slice(3)}-dot)` }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-cda-text">{bloco.titulo}</h3>
          <IconButton icon={Pencil} label="Editar bloco" size="sm" onClick={() => setEditando(true)} />
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-cda-green">
              <LogIn className="h-3.5 w-3.5" />
              Entradas
            </div>
            <LinhaDoTempo itens={bloco.entradas ?? []} cor="var(--status-success)" />
          </div>
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-cda-text3">
              <LogOut className="h-3.5 w-3.5" />
              Saídas
            </div>
            <LinhaDoTempo itens={bloco.saidas ?? []} cor="var(--text-muted)" />
          </div>
        </div>
      </Card>
      <EditarBlocoModal bloco={editando ? bloco : null} onClose={() => setEditando(false)} />
    </>
  );
}
