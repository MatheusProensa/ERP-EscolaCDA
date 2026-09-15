"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Printer, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import {
  semanasDoMes,
  isoData,
  segundaFeiraDe,
  estadoDoDia,
  STATUS_TURMA_MES_LABEL,
  STATUS_TURMA_MES_COR,
  type StatusTurmaMes,
  type ConteudoDiaPlanejamento,
} from "@/lib/planejamento";
import { hojeBrasilia } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { SemanaPlanejamento, PontoEstadoDia, type Projeto } from "./SemanaPlanejamento";

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

function somarDias(iso: string, dias: number): string {
  const data = new Date(`${iso}T00:00:00.000Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

function formatarDiaMes(iso: string): string {
  const data = new Date(`${iso}T00:00:00.000Z`);
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

/** Resumo pra 1 card de semana no painel esquerdo — status + 5 pontinhos de
 * dia, sem abrir a semana. Reaproveita o MESMO GET que o editor completo usa
 * (não existe endpoint "resumido" separado) — o payload de texto vem junto,
 * só não é exibido aqui; pra uma escola pequena (poucas semanas por mês) o
 * custo é desprezível e evita manter 2 rotas com a mesma fonte de verdade. */
function SemanaResumoCard({
  turmaId,
  semanaIso,
  selecionada,
  onSelecionar,
}: {
  turmaId: string;
  semanaIso: string;
  selecionada: boolean;
  onSelecionar: () => void;
}) {
  const [status, setStatus] = useState<"RASCUNHO" | "ENVIADO" | "APROVADO" | "DEVOLVIDO" | null>(null);
  const [dias, setDias] = useState<{ tipo: "TEMATICA" | "CONTEXTO"; conteudo: ConteudoDiaPlanejamento }[]>([]);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/planejamentos?turmaId=${turmaId}&semana=${semanaIso}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelado || !data) return;
        setStatus(data.status ?? "RASCUNHO");
        setDias(data.dias ?? []);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [turmaId, semanaIso]);

  const preenchida = dias.some((d) => Object.keys(d.conteudo).length > 0);
  const rotulo = status === "APROVADO" ? "Aprovado" : status === "DEVOLVIDO" ? "Devolvido" : status === "ENVIADO" ? "Em revisão" : preenchida ? "Rascunho" : "Vazia";
  const cor =
    status === "APROVADO" ? "var(--status-success)" : status === "DEVOLVIDO" ? "var(--status-danger)" : status === "ENVIADO" ? "var(--status-info)" : "var(--cda-text3)";

  return (
    <button
      type="button"
      onClick={onSelecionar}
      className={`w-full rounded-lg bg-white p-3 text-left shadow-sm transition-colors ${
        selecionada ? "border-l-4 border-l-cda-blue" : "border-l-4 border-l-transparent hover:bg-cda-bg/60"
      }`}
    >
      <p className="text-xs font-semibold text-cda-text">
        {formatarDiaMes(semanaIso)} - {formatarDiaMes(somarDias(semanaIso, 4))}
      </p>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {dias.length > 0
            ? dias.map((d, i) => <PontoEstadoDia key={i} estado={estadoDoDia(d.tipo, d.conteudo)} size="xs" />)
            : Array.from({ length: 5 }).map((_, i) => <span key={i} className="h-2 w-2 rounded-full bg-cda-border" />)}
        </div>
        {status !== null && (
          <span className="text-[11px] font-medium" style={{ color: cor }}>
            {rotulo}
          </span>
        )}
      </div>
    </button>
  );
}

/** Barra "X de Y dias · Z%" — versão compacta do progresso do mês pro painel
 * esquerdo (redesign v4, mockup Gemini). Reaproveita o mesmo GET /resumo-mes
 * já usado antes. */
function ProgressoDiasCompacto({ turmaId, anoMes, versao }: { turmaId: string; anoMes: string; versao: string }) {
  const [resumo, setResumo] = useState<{ diasCompletos: number; diasTotal: number } | null>(null);

  useEffect(() => {
    let cancelado = false;
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
  const pct = resumo.diasTotal > 0 ? Math.round((resumo.diasCompletos / resumo.diasTotal) * 100) : 0;

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-cda-text2">
        {resumo.diasCompletos} de {resumo.diasTotal} dias · {pct}%
      </p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-cda-border/60">
        <div className="h-full rounded-full bg-cda-blue" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Pills dos 4 documentos no rodapé do painel esquerdo — Planejamento tem
 * status próprio; Roteiro compartilha o sinal do Planejamento (é gerado a
 * partir dele); Atividade Gráfica/Tema Literário têm status PRÓPRIO agora
 * (FolhaMensal, fluxo de aprovação real — pedido do dono, set/2026). */
function PillDocumento({ label, status }: { label: string; status: StatusTurmaMes }) {
  const cor = STATUS_TURMA_MES_COR[status];
  const ok = status === "APROVADO";
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="flex items-center gap-1.5 text-cda-text2">
        {ok ? <CheckCircle2 className="h-3.5 w-3.5" style={{ color: cor }} /> : <AlertCircle className="h-3.5 w-3.5" style={{ color: cor }} />}
        {label}
      </span>
      <span className="font-medium" style={{ color: cor }}>
        {STATUS_TURMA_MES_LABEL[status]}
      </span>
    </div>
  );
}

/** Planejamento organizado MÊS A MÊS, em painel dividido (redesign v4,
 * pedido do dono a partir de um mockup gerado no Gemini: "quero o máximo
 * parecido dessa imagem"). Esquerda = "Semanas" (navegador — nav de mês,
 * cards de semana, duplicar/baixar, progresso, status dos 4 documentos);
 * direita = SemanaPlanejamento da semana selecionada, por inteiro (não mais
 * lista de semanas empilhadas em acordeão). */
export function PlanejamentoMensalClient({
  turmaId,
  turmaNome,
  regenteNome,
  projetos,
  anoMesInicial,
  podeEditar,
  documentos,
}: {
  turmaId: string;
  turmaNome: string;
  regenteNome: string | null;
  projetos: Projeto[];
  anoMesInicial: string;
  podeEditar: boolean;
  documentos: { label: string; status: StatusTurmaMes }[];
}) {
  const [anoMes, setAnoMes] = useState(anoMesInicial);
  const [ano, mes] = anoMes.split("-").map(Number);
  const referencia = new Date(Date.UTC(ano, mes - 1, 15));
  const semanas = semanasDoMes(referencia).map(isoData);
  const semanaAtualIso = isoData(segundaFeiraDe(hojeBrasilia()));
  const [semanaSelecionada, setSemanaSelecionada] = useState(() => (semanas.includes(semanaAtualIso) ? semanaAtualIso : semanas[0]));
  const [duplicando, setDuplicando] = useState(false);
  const [versaoRecarga, setVersaoRecarga] = useState(0);
  const [stripVersao, setStripVersao] = useState(0);

  // Troca de mês pode deixar a semana selecionada fora da lista nova — cai
  // pra semana atual (se o mês em tela for o corrente) ou pra 1ª semana do
  // mês, sem precisar de useEffect (ajuste durante o render, mesmo padrão já
  // usado em PainelCoordenadoraClient pra evitar o lint set-state-in-effect).
  const semanaValida = semanas.includes(semanaSelecionada) ? semanaSelecionada : semanas.includes(semanaAtualIso) ? semanaAtualIso : semanas[0];
  if (semanaValida !== semanaSelecionada) setSemanaSelecionada(semanaValida);

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
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      {/* Painel esquerdo — "Semanas". Fundo claro (fix do dono, redesign v4:
          "painel escuro ficava pesado, é navegação, não conteúdo"). */}
      <div className="flex w-full shrink-0 flex-col gap-4 rounded-xl border border-cda-border bg-cda-bg p-4 lg:w-72">
        <div>
          <h2 className="mb-2 text-sm font-semibold text-cda-text">Semanas</h2>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setAnoMes((am) => somarMes(am, -1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-cda-border bg-white text-cda-text2 hover:bg-cda-bg"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-cda-text">
              {MESES_LABEL[mes - 1]} {ano}
            </span>
            <button
              type="button"
              onClick={() => setAnoMes((am) => somarMes(am, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-cda-border bg-white text-cda-text2 hover:bg-cda-bg"
              aria-label="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-xs text-cda-text3">
            {turmaNome}
            {regenteNome && ` · ${regenteNome}`}
          </p>
        </div>

        <div key={versaoRecarga} className="flex flex-col gap-2">
          {semanas.map((semanaIso) => (
            <SemanaResumoCard
              key={semanaIso}
              turmaId={turmaId}
              semanaIso={semanaIso}
              selecionada={semanaIso === semanaValida}
              onSelecionar={() => setSemanaSelecionada(semanaIso)}
            />
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-cda-border pt-3">
          {podeEditar && (
            <Button variant="outline" size="sm" onClick={duplicarMesAnterior} loading={duplicando} className="justify-start bg-white">
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

        <div className="border-t border-cda-border pt-3">
          <ProgressoDiasCompacto turmaId={turmaId} anoMes={anoMes} versao={`${versaoRecarga}-${stripVersao}`} />
        </div>

        <div className="flex flex-col gap-2 border-t border-cda-border pt-3">
          {documentos.map((doc) => (
            <PillDocumento key={doc.label} label={doc.label} status={doc.status} />
          ))}
        </div>
      </div>

      {/* Painel direito — a semana selecionada, por inteiro. */}
      <div className="min-w-0 flex-1 rounded-xl border border-cda-border bg-white p-4 sm:p-6">
        <SemanaPlanejamento
          key={`${semanaValida}-${versaoRecarga}`}
          turmaId={turmaId}
          projetos={projetos}
          semanaIso={semanaValida}
          onSalvo={() => setStripVersao((v) => v + 1)}
        />
      </div>
    </div>
  );
}
