"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Printer, Copy } from "lucide-react";
import { semanasDoMes, isoData, segundaFeiraDe } from "@/lib/planejamento";
import { hojeBrasilia } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
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
  podeEditar,
}: {
  turmaId: string;
  projetos: Projeto[];
  anoMesInicial: string;
  podeEditar: boolean;
}) {
  const [anoMes, setAnoMes] = useState(anoMesInicial);
  const [ano, mes] = anoMes.split("-").map(Number);
  const referencia = new Date(Date.UTC(ano, mes - 1, 15));
  const semanas = semanasDoMes(referencia).map(isoData);
  const semanaAtualIso = isoData(segundaFeiraDe(hojeBrasilia()));
  const [duplicando, setDuplicando] = useState(false);
  const [versaoRecarga, setVersaoRecarga] = useState(0);

  async function duplicarMesAnterior() {
    setDuplicando(true);
    const res = await fetch("/api/planejamentos/duplicar-mes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turmaId, anoMes }),
    });
    setDuplicando(false);
    if (!res.ok) {
      showToast("Não foi possível duplicar o mês anterior.");
      return;
    }
    const data = await res.json();
    if (data.copiadas === 0) {
      showToast(data.puladas > 0 ? "Todas as semanas desse mês já têm conteúdo — nada foi sobrescrito." : "O mês anterior não tem planejamento preenchido pra copiar.");
      return;
    }
    setVersaoRecarga((v) => v + 1); // força as semanas a recarregar do banco
    showToast(`${data.copiadas} semana(s) copiada(s) do mês anterior como ponto de partida.`);
  }

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

      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1.5">
        {podeEditar && (
          <Button variant="outline" size="sm" onClick={duplicarMesAnterior} loading={duplicando}>
            <Copy className="h-3.5 w-3.5" />
            Duplicar do mês anterior
          </Button>
        )}
        <a
          href={`/api/planejamentos/pdf?turmaId=${turmaId}&mes=${anoMes}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-cda-blue hover:underline"
        >
          <Printer className="h-3.5 w-3.5" />
          Baixar PDF do mês inteiro
        </a>
      </div>

      <div className="flex flex-col gap-3">
        {semanas.map((semanaIso) => (
          <SemanaPlanejamento
            key={`${semanaIso}-${versaoRecarga}`}
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
