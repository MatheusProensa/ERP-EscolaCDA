"use client";

import { useState } from "react";
import { Pencil, UtensilsCrossed } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/Badge";
import { EditarSemanaModal } from "./EditarSemanaModal";
import { COR_REFEICAO, DIA_LABEL_CARDAPIO } from "./constants";
import type { DiaCardapio, ItemCardapioMes } from "./types";

function TabelaSemana({ dias }: { dias: DiaCardapio[] }) {
  if (dias.length === 0) {
    return <p className="p-4 text-sm text-cda-text3">Ainda não tem cardápio cadastrado pra este padrão de semana.</p>;
  }
  // As refeições (tipo/ordem) são as mesmas em todos os dias de um mesmo
  // público — usa o primeiro dia só pra saber quais linhas desenhar.
  const refeicoesBase = dias[0].refeicoes;

  return (
    // overflow-x-auto sem overflow-y travado em "visible" clipa qualquer
    // sombra/ring que vaze da tabela — py garante a folga (mesmo ajuste já
    // aplicado em Horários da Equipe).
    <div className="overflow-x-auto py-1">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-[150px] shrink-0 border-b border-cda-border p-2.5 text-left text-xs font-semibold uppercase tracking-wide text-cda-text3">
              Refeição
            </th>
            {dias.map((dia) => (
              <th key={dia.dia} className="border-b border-cda-border p-2.5 text-left align-bottom">
                <div className="text-xs font-semibold text-cda-text">{DIA_LABEL_CARDAPIO[dia.dia] ?? dia.dia}</div>
                {dia.datas.length > 0 && (
                  <div className="text-[11px] font-normal text-cda-text3">{dia.datas.join(" · ")}</div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {refeicoesBase.map((refBase, i) => (
            <tr key={refBase.tipo} className={i % 2 === 1 ? "bg-cda-bg/50" : undefined}>
              <td className="border-b border-cda-border p-2.5 align-top">
                <Badge variant={COR_REFEICAO[refBase.tipo] ?? "neutral"}>{refBase.label}</Badge>
                {refBase.horario && <div className="mt-1 text-xs font-medium text-cda-text3">{refBase.horario}</div>}
              </td>
              {dias.map((dia) => {
                const ref = dia.refeicoes.find((r) => r.tipo === refBase.tipo);
                return (
                  <td key={dia.dia} className="border-b border-cda-border p-2.5 align-top text-cda-text2">
                    {ref?.itens ? (
                      <p className="whitespace-pre-line leading-relaxed">{ref.itens}</p>
                    ) : (
                      <span className="text-cda-text3">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CardapioPublicoCard({ item, label, notaPublico }: { item: ItemCardapioMes; label: string; notaPublico?: string }) {
  const [editando, setEditando] = useState<"impar" | "par" | null>(null);

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-cda-border px-5 py-4">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-4 w-4 text-cda-blue" />
          <h3 className="text-sm font-semibold text-cda-text">{label}</h3>
        </div>
      </div>
      {notaPublico && <p className="border-b border-cda-border bg-cda-bg px-5 py-2 text-xs text-cda-text3">{notaPublico}</p>}

      <div className="flex flex-col divide-y divide-cda-border">
        <div>
          <div className="flex items-center justify-between px-5 pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-cda-text3">Semanas 1 e 3</h4>
            <IconButton icon={Pencil} label="Editar semanas 1 e 3" size="sm" onClick={() => setEditando("impar")} />
          </div>
          <div className="px-5 pb-4">
            <TabelaSemana dias={item.semanas.impar} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between px-5 pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-cda-text3">Semanas 2 e 4</h4>
            <IconButton icon={Pencil} label="Editar semanas 2 e 4" size="sm" onClick={() => setEditando("par")} />
          </div>
          <div className="px-5 pb-4">
            <TabelaSemana dias={item.semanas.par} />
          </div>
        </div>
      </div>

      <EditarSemanaModal
        aberto={editando === "impar"}
        onClose={() => setEditando(null)}
        blocoId={item.id}
        campo="impar"
        tituloModal={`${label} — semanas 1 e 3`}
        diasIniciais={item.semanas.impar}
      />
      <EditarSemanaModal
        aberto={editando === "par"}
        onClose={() => setEditando(null)}
        blocoId={item.id}
        campo="par"
        tituloModal={`${label} — semanas 2 e 4`}
        diasIniciais={item.semanas.par}
      />
    </Card>
  );
}
