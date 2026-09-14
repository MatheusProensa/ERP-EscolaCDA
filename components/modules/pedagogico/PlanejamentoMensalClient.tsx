"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { semanasDoMes, isoData, segundaFeiraDe } from "@/lib/planejamento";
import { hojeBrasilia } from "@/lib/utils";
import { SemanaPlanejamento, type Projeto } from "./SemanaPlanejamento";

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

/** Planejamento organizado MÊS A MÊS (pedido do dono por áudio, set/2026:
 * "vamos fazer tipo mês a mês, tá? Tipo aba planejamento, tem mês a mês" —
 * bem didático, igual a pasta real de planejamento da escola é organizada).
 * Navega mês a mês; dentro de cada mês, lista as semanas que o tocam (ver
 * semanasDoMes) — cada semana carrega/salva sozinha (SemanaPlanejamento). A
 * semana atual já abre expandida quando o mês em tela é o mês corrente, pra
 * não precisar caçar onde continuar. */
export function PlanejamentoMensalClient({
  turmaId,
  projetos,
  anoMesInicial,
}: {
  turmaId: string;
  projetos: Projeto[];
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

      <a
        href={`/api/planejamentos/pdf?turmaId=${turmaId}&mes=${anoMes}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 self-end text-xs font-medium text-cda-blue hover:underline"
      >
        <Printer className="h-3.5 w-3.5" />
        Baixar PDF do mês inteiro
      </a>

      <div className="flex flex-col gap-3">
        {semanas.map((semanaIso) => (
          <SemanaPlanejamento
            key={semanaIso}
            turmaId={turmaId}
            projetos={projetos}
            semanaIso={semanaIso}
            abertaPorPadrao={semanaIso === semanaAtualIso}
          />
        ))}
      </div>
    </div>
  );
}
