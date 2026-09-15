"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { semanasDoMes, isoData, segundaFeiraDe } from "@/lib/planejamento";
import { hojeBrasilia } from "@/lib/utils";
import { SemanaFolha, type TipoFolha } from "./SemanaFolha";

const MESES_LABEL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function anoMesDeData(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function somarMes(anoMes: string, delta: number): string {
  const [ano, mes] = anoMes.split("-").map(Number);
  return anoMesDeData(new Date(Date.UTC(ano, mes - 1 + delta, 1)));
}

/** Mês a mês pra Atividade Gráfica/Tema Literário — mesmo padrão de
 * navegação do Planejamento (PlanejamentoMensalClient), bem mais simples:
 * sem duplicar-mês-anterior, sem strip de progresso (não pedido pra essas
 * 2 abas) — só a lista de semanas do mês. */
export function FolhaMensalClient({
  turmaId,
  tipo,
  anoMesInicial,
}: {
  turmaId: string;
  tipo: TipoFolha;
  anoMesInicial: string;
}) {
  const [anoMes, setAnoMes] = useState(anoMesInicial);
  const [ano, mes] = anoMes.split("-").map(Number);
  const referencia = new Date(Date.UTC(ano, mes - 1, 15));
  const semanas = semanasDoMes(referencia).map(isoData);
  const semanaAtualIso = isoData(segundaFeiraDe(hojeBrasilia()));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setAnoMes((am) => somarMes(am, -1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-cda-border text-cda-text2 hover:bg-cda-bg"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-base font-semibold text-cda-text">
          {MESES_LABEL[mes - 1]} de {ano}
        </span>
        <button
          type="button"
          onClick={() => setAnoMes((am) => somarMes(am, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-cda-border text-cda-text2 hover:bg-cda-bg"
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {semanas.map((semanaIso) => (
          <SemanaFolha key={semanaIso} turmaId={turmaId} tipo={tipo} semanaIso={semanaIso} abertaPorPadrao={semanaIso === semanaAtualIso} />
        ))}
      </div>
    </div>
  );
}
