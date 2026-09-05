"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, LogIn, LogOut, Pencil, StickyNote, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { showToast } from "@/components/ui/Toast";
import { EditarBlocoModal } from "./EditarBlocoModal";
import type { ItemEscalaBloco, PessoaEvento } from "./types";

/** Vizinho na mesma seção (Turnos ou Organização e avisos), pra "mover pra
 * cima/baixo" — só a ordem importa, o resto do bloco não precisa viajar. */
type VizinhoBloco = { id: string; ordem: number };

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
    // NOVO: py-1.5 (não só pb-1) dá espaço vertical pro anel da bolinha —
    // com overflow-x:auto e overflow-y no padrão (visible), o navegador força
    // overflow-y a virar auto também, e sem folga o anel saía cortado em cima.
    <div className="flex gap-0 overflow-x-auto py-1.5">
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

/** Subir/descer troca a `ordem` com o vizinho na mesma seção (2 PUTs) —
 * excluir pede confirmação (não dá pra desfazer, some com o histórico do
 * bloco). Os três ficam juntos aqui porque as duas telas (Turno e Nota) usam
 * exatamente a mesma barra de controles. */
function ControlesBloco({
  bloco,
  anterior,
  proximo,
  onEditar,
}: {
  bloco: ItemEscalaBloco;
  anterior?: VizinhoBloco;
  proximo?: VizinhoBloco;
  onEditar: () => void;
}) {
  const router = useRouter();
  const [movendo, setMovendo] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  async function mover(vizinho: VizinhoBloco) {
    setMovendo(true);
    const [r1, r2] = await Promise.all([
      fetch(`/api/horarios-equipe/${bloco.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordem: vizinho.ordem }),
      }),
      fetch(`/api/horarios-equipe/${vizinho.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordem: bloco.ordem }),
      }),
    ]);
    setMovendo(false);
    if (!r1.ok || !r2.ok) {
      showToast("Não foi possível mover. Tente de novo.", "error");
      return;
    }
    router.refresh();
  }

  async function excluir() {
    setExcluindo(true);
    const res = await fetch(`/api/horarios-equipe/${bloco.id}`, { method: "DELETE" });
    setExcluindo(false);
    if (!res.ok) {
      showToast("Não foi possível excluir. Tente de novo.", "error");
      return;
    }
    setConfirmando(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton
          icon={ChevronUp}
          label="Mover pra cima"
          size="sm"
          disabled={!anterior || movendo}
          onClick={() => anterior && mover(anterior)}
        />
        <IconButton
          icon={ChevronDown}
          label="Mover pra baixo"
          size="sm"
          disabled={!proximo || movendo}
          onClick={() => proximo && mover(proximo)}
        />
        <IconButton icon={Pencil} label="Editar bloco" size="sm" onClick={onEditar} />
        <IconButton icon={Trash2} label="Excluir bloco" size="sm" variant="danger" onClick={() => setConfirmando(true)} />
      </div>
      <ConfirmDialog
        open={confirmando}
        onClose={() => setConfirmando(false)}
        onConfirm={excluir}
        title={`Excluir "${bloco.titulo}"?`}
        consequence="Apaga o bloco inteiro — entradas, saídas e horários cadastrados nele."
        confirmLabel="Excluir"
        loading={excluindo}
      />
    </>
  );
}

export function EscalaBlocoCard({
  bloco,
  anterior,
  proximo,
  podeEditar = true,
}: {
  bloco: ItemEscalaBloco;
  /** Vizinhos na mesma seção (Turnos ou Organização e avisos) — undefined nas
   * pontas, desabilita a seta correspondente. */
  anterior?: VizinhoBloco;
  proximo?: VizinhoBloco;
  podeEditar?: boolean;
}) {
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
            {podeEditar && (
              <ControlesBloco bloco={bloco} anterior={anterior} proximo={proximo} onEditar={() => setEditando(true)} />
            )}
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
          {podeEditar && (
            <ControlesBloco bloco={bloco} anterior={anterior} proximo={proximo} onEditar={() => setEditando(true)} />
          )}
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
