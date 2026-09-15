"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Printer, Copy } from "lucide-react";
import { semanasDoMes, isoData, segundaFeiraDe, STATUS_TURMA_MES_LABEL, STATUS_TURMA_MES_COR } from "@/lib/planejamento";
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

type ResumoMes = {
  semanasPreenchidas: number;
  semanasTotal: number;
  diasCompletos: number;
  diasTotal: number;
  status: "APROVADO" | "DEVOLVIDO" | "ENVIADO" | "EM_PREENCHIMENTO" | "ATRASADO" | "PENDENTE";
  diasParaPrazo: number | null;
};

const STATUS_LABEL_EXTRA: Record<string, string> = { ...STATUS_TURMA_MES_LABEL, EM_PREENCHIMENTO: "Em preenchimento" };
const STATUS_COR_EXTRA: Record<string, string> = { ...STATUS_TURMA_MES_COR, EM_PREENCHIMENTO: "var(--status-warning)" };

function textoPrazoStrip(dias: number | null): string {
  if (dias === null) return "Sem prazo definido";
  if (dias < 0) return `Vencido há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? "" : "s"}`;
  if (dias === 0) return "Vence hoje";
  return `${dias} dia${dias === 1 ? "" : "s"} restantes`;
}

/** Strip de 4 números acima das semanas — pedido do dono, mockup do Gemini
 * ("Semanas preenchidas: X de Y" / "Dias completos: X de Y" / "Status" /
 * "Prazo"). Carrega junto com o mês em tela (recarrega ao navegar ou depois
 * de duplicar/salvar). */
function StripProgresso({ turmaId, anoMes, versao }: { turmaId: string; anoMes: string; versao: string }) {
  const [resumo, setResumo] = useState<ResumoMes | null>(null);

  useEffect(() => {
    let cancelado = false;
    // Não zera o resumo antes de buscar o novo — deixa o número anterior na
    // tela até o próximo chegar, sem piscar pra vazio a cada troca de mês.
    fetch(`/api/planejamentos/resumo-mes?turmaId=${turmaId}&mes=${anoMes}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelado && data) setResumo(data);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [turmaId, anoMes, versao]);

  if (!resumo) return null;
  const pctSemanas = resumo.semanasTotal > 0 ? (resumo.semanasPreenchidas / resumo.semanasTotal) * 100 : 0;
  const pctDias = resumo.diasTotal > 0 ? (resumo.diasCompletos / resumo.diasTotal) * 100 : 0;
  const prazoUrgente = resumo.diasParaPrazo !== null && resumo.diasParaPrazo <= 3;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
      <div className="rounded-lg border border-cda-border bg-white p-3">
        <p className="text-xs text-cda-text3">Semanas preenchidas</p>
        <p className="mb-1.5 text-sm font-semibold text-cda-text">
          {resumo.semanasPreenchidas} de {resumo.semanasTotal}
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-cda-bg">
          <div className="h-full rounded-full bg-cda-blue" style={{ width: `${pctSemanas}%` }} />
        </div>
      </div>
      <div className="rounded-lg border border-cda-border bg-white p-3">
        <p className="text-xs text-cda-text3">Dias completos</p>
        <p className="mb-1.5 text-sm font-semibold text-cda-text">
          {resumo.diasCompletos} de {resumo.diasTotal}
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-cda-bg">
          <div className="h-full rounded-full" style={{ width: `${pctDias}%`, backgroundColor: "var(--cda-amber)" }} />
        </div>
      </div>
      <div className="flex flex-col justify-center rounded-lg border border-cda-border bg-white p-3">
        <p className="mb-1 text-xs text-cda-text3">Status</p>
        <span
          className="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ backgroundColor: `color-mix(in srgb, ${STATUS_COR_EXTRA[resumo.status]} 15%, transparent)`, color: STATUS_COR_EXTRA[resumo.status] }}
        >
          {STATUS_LABEL_EXTRA[resumo.status]}
        </span>
      </div>
      <div className="flex flex-col justify-center rounded-lg border border-cda-border bg-white p-3">
        <p className="mb-1 text-xs text-cda-text3">Prazo</p>
        <span
          className="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{
            backgroundColor: `color-mix(in srgb, ${prazoUrgente ? "var(--status-danger)" : "var(--status-success)"} 15%, transparent)`,
            color: prazoUrgente ? "var(--status-danger)" : "var(--status-success)",
          }}
        >
          {textoPrazoStrip(resumo.diasParaPrazo)}
        </span>
      </div>
    </div>
  );
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
  // Contador à parte pro strip de progresso reagir a um salvamento de
  // qualquer semana sem remontar as semanas (remontar faria a que acabou de
  // salvar fechar sozinha de novo — ruim logo depois de clicar "Finalizar").
  const [stripVersao, setStripVersao] = useState(0);

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

      <StripProgresso turmaId={turmaId} anoMes={anoMes} versao={`${versaoRecarga}-${stripVersao}`} />

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
            onSalvo={() => setStripVersao((v) => v + 1)}
          />
        ))}
      </div>
    </div>
  );
}
