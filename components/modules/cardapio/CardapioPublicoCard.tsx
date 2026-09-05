"use client";

import { useState } from "react";
import { Pencil, UtensilsCrossed } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { BADGE_VARIANT_STYLE, type BadgeVariant } from "@/components/ui/Badge";
import { EditarSemanaModal } from "./EditarSemanaModal";
import { COR_REFEICAO, DIA_LABEL_CARDAPIO } from "./constants";
import { gerarEsqueletoSemanas } from "./esqueleto";
import type { DiaCardapio, ItemCardapioMes } from "./types";

/** Mesmo truque de cor da linha inteira (borda + fundo tingidos, não só um
 * badge solto) já usado em Interessados — dá identidade visual à refeição
 * sem virar uma grade cinza de planilha. */
function TabelaSemana({ dias }: { dias: DiaCardapio[] }) {
  // As refeições (tipo/ordem) são as mesmas em todos os dias de um mesmo
  // público — usa o primeiro dia só pra saber quais linhas desenhar.
  const refeicoesBase = dias[0].refeicoes;

  return (
    // overflow-y explícito (não "visible") em vez de só overflow-x-auto —
    // além de evitar o clipe vertical do ajuste em Horários da Equipe, aqui
    // também deixa os cantos arredondados do quadro coerentes ao rolar.
    <div className="overflow-x-auto overflow-y-hidden">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-cda-border bg-cda-bg/60">
            <th className="w-[180px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-cda-text3">
              Refeição
            </th>
            {dias.map((dia) => (
              <th key={dia.dia} className="px-4 py-3 text-left align-bottom">
                <div className="text-xs font-semibold text-cda-text">{DIA_LABEL_CARDAPIO[dia.dia] ?? dia.dia}</div>
                {dia.datas.length > 0 && (
                  <div className="text-[11px] font-normal text-cda-text3">{dia.datas.join(" · ")}</div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-cda-border">
          {refeicoesBase.map((refBase) => {
            const cor = (BADGE_VARIANT_STYLE[COR_REFEICAO[refBase.tipo] ?? "neutral"].color as string) ?? "var(--text-body)";
            return (
              <tr
                key={refBase.tipo}
                style={{
                  borderLeft: `3px solid color-mix(in oklch, ${cor} 55%, transparent)`,
                  backgroundColor: `color-mix(in oklch, ${cor} 4%, white)`,
                }}
              >
                <td className="px-4 py-3.5 align-top">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
                    <span className="text-sm font-semibold text-cda-text">{refBase.label}</span>
                  </div>
                  {refBase.horario && <div className="mt-0.5 pl-4 text-xs font-medium text-cda-text3">{refBase.horario}</div>}
                </td>
                {dias.map((dia) => {
                  const ref = dia.refeicoes.find((r) => r.tipo === refBase.tipo);
                  return (
                    <td key={dia.dia} className="px-4 py-3.5 align-top text-cda-text2">
                      {ref?.itens ? (
                        <p className="whitespace-pre-line leading-relaxed">{ref.itens}</p>
                      ) : (
                        <span className="text-cda-text3">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PainelSemana({
  publicoLabel,
  titulo,
  dias,
  onEditar,
}: {
  /** Repete o nome do público aqui dentro (não só lá em cima no card) — numa
   * tela comprida com os 3 públicos empilhados, rolar até o meio de um card
   * já não mostra mais o cabeçalho de cima, e ficava fácil perder de vista
   * qual público aquela tabela era. */
  publicoLabel: string;
  titulo: string;
  dias: DiaCardapio[];
  onEditar: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-cda-border">
      <div className="flex items-center justify-between gap-3 bg-cda-bg px-4 py-3">
        <h4 className="text-base font-bold text-cda-text">
          {publicoLabel}
          <span className="mx-2 font-normal text-cda-text3">·</span>
          <span className="text-xs font-semibold uppercase tracking-wide text-cda-text2">{titulo}</span>
        </h4>
        <IconButton icon={Pencil} label={`Editar ${titulo.toLowerCase()}`} size="sm" onClick={onEditar} />
      </div>
      <TabelaSemana dias={dias} />
    </div>
  );
}

export function CardapioPublicoCard({
  item,
  label,
  notaPublico,
  cor,
}: {
  item: ItemCardapioMes;
  label: string;
  notaPublico?: string;
  cor: BadgeVariant;
}) {
  const [editando, setEditando] = useState<"impar" | "par" | null>(null);
  const corBorda = BADGE_VARIANT_STYLE[cor].color as string;

  // Mês ainda sem nada cadastrado: mostra a grade certinha (dias reais do
  // calendário, refeições e horários do público) só com os itens em branco —
  // em vez de uma tela vazia, já dá pra editar direto por cima dela.
  const esqueleto = gerarEsqueletoSemanas(item.publico, item.ano, item.mes);
  const diasImpar = item.semanas.impar.length > 0 ? item.semanas.impar : esqueleto.impar;
  const diasPar = item.semanas.par.length > 0 ? item.semanas.par : esqueleto.par;

  return (
    <Card className="flex flex-col" style={{ borderLeft: `4px solid ${corBorda}` }}>
      <div
        className="flex items-center justify-between gap-3 border-b border-cda-border px-5 py-4"
        style={{ backgroundColor: `color-mix(in oklch, ${corBorda} 6%, white)` }}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: `color-mix(in oklch, ${corBorda} 18%, white)` }}
          >
            <UtensilsCrossed className="h-5 w-5" style={{ color: corBorda }} />
          </span>
          <h3 className="text-2xl font-bold text-cda-text">{label}</h3>
        </div>
      </div>
      {notaPublico && <p className="border-b border-cda-border bg-cda-bg px-5 py-2 text-xs text-cda-text3">{notaPublico}</p>}

      <div className="flex flex-col gap-4 p-5">
        <PainelSemana publicoLabel={label} titulo="Semanas 1 e 3" dias={diasImpar} onEditar={() => setEditando("impar")} />
        <PainelSemana publicoLabel={label} titulo="Semanas 2 e 4" dias={diasPar} onEditar={() => setEditando("par")} />
      </div>

      <EditarSemanaModal
        aberto={editando === "impar"}
        onClose={() => setEditando(null)}
        blocoId={item.id}
        campo="impar"
        tituloModal={`${label} — semanas 1 e 3`}
        diasIniciais={diasImpar}
      />
      <EditarSemanaModal
        aberto={editando === "par"}
        onClose={() => setEditando(null)}
        blocoId={item.id}
        campo="par"
        tituloModal={`${label} — semanas 2 e 4`}
        diasIniciais={diasPar}
      />
    </Card>
  );
}
