"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ThumbsUp,
  Undo2,
  ClipboardCheck,
  ScrollText,
  Image as ImageIcon,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { showToast } from "@/components/ui/Toast";
import { PlanejamentoStepper } from "@/components/modules/pedagogico/PlanejamentoStepper";
import { STATUS_TURMA_MES_LABEL, STATUS_TURMA_MES_BADGE, type StatusTurmaMes } from "@/lib/planejamento";

const TURNO_LABEL: Record<string, string> = { MANHA: "Manhã", TARDE: "Tarde" };

type SemanaResumo = { id: string; semanaInicio: string; status: "ENVIADO" | "APROVADO" | "DEVOLVIDO" };

export type TurmaResumoPainel = {
  id: string;
  nome: string;
  turno: string;
  regenteNome: string | null;
  regenteFoto: string | null;
  statusTurma: StatusTurmaMes;
  semanasEnviadas: number;
  semanasTotal: number;
  folhas: { grafica: number; literario: number };
  semanas: SemanaResumo[];
  roteiroHref: string;
  pontualidadePct: number | null;
};

const FILTROS = [
  { valor: "TODAS", label: "Todas" },
  { valor: "APROVADO", label: "Em dia" },
  { valor: "ENVIADO", label: "Aguardando aprovação" },
  { valor: "DEVOLVIDO", label: "Devolvido" },
  { valor: "ATRASADO", label: "Atrasadas" },
] as const;

function formatarDiaMes(iso: string): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

function statusParaStepper(status: StatusTurmaMes): "RASCUNHO" | "ENVIADO" | "APROVADO" | "DEVOLVIDO" {
  if (status === "APROVADO" || status === "ENVIADO" || status === "DEVOLVIDO") return status;
  return "RASCUNHO";
}

/** Painel mestre-detalhe da coordenadora — lista de turmas à esquerda,
 * detalhe + aprovar/devolver rápido à direita. Pedido do dono, set/2026,
 * inspirado num mockup que ele trouxe do Gemini pra essa tela: "quero o
 * máximo parecido, quero todas aquelas funções". Busca/filtro/seleção são
 * só no cliente — o servidor já manda os dados de TODAS as turmas prontos
 * (não são muitas, é 1 escola só), sem ida e volta a cada tecla digitada. */
export function PainelCoordenadoraClient({
  turmas: turmasIniciais,
  prazoTexto,
  prazoVencido,
}: {
  turmas: TurmaResumoPainel[];
  prazoTexto: string | null;
  prazoVencido: boolean;
}) {
  const router = useRouter();

  // Cópia local editável (pro "aprovar/devolver" atualizar a semana na hora,
  // sem esperar o servidor) — ressincroniza durante a renderização quando o
  // servidor manda uma lista nova (depois de um router.refresh()), padrão
  // recomendado pra "ajustar estado quando uma prop muda" sem efeito (evita
  // o "cascading renders" que useEffect+setState causaria aqui).
  const [turmas, setTurmas] = useState(turmasIniciais);
  const [turmasIniciaisAnterior, setTurmasIniciaisAnterior] = useState(turmasIniciais);
  if (turmasIniciais !== turmasIniciaisAnterior) {
    setTurmasIniciaisAnterior(turmasIniciais);
    setTurmas(turmasIniciais);
  }

  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["valor"]>("TODAS");
  const [selecionadaId, setSelecionadaId] = useState<string | null>(turmasIniciais[0]?.id ?? null);

  const turmasFiltradas = useMemo(() => {
    const buscaNorm = busca.trim().toLowerCase();
    return turmas.filter((t) => {
      if (filtro !== "TODAS" && t.statusTurma !== filtro) return false;
      if (buscaNorm) {
        const alvo = `${t.nome} ${t.regenteNome ?? ""}`.toLowerCase();
        if (!alvo.includes(buscaNorm)) return false;
      }
      return true;
    });
  }, [turmas, busca, filtro]);

  // Se o filtro/busca tirar a turma selecionada da lista, mostra a primeira
  // que sobrou — calculado direto na renderização (não precisa de efeito
  // nem de guardar isso em estado; só o clique do usuário precisa virar
  // estado de verdade).
  const selecionadaIdEfetiva = turmasFiltradas.some((t) => t.id === selecionadaId) ? selecionadaId : (turmasFiltradas[0]?.id ?? null);
  const selecionada = turmas.find((t) => t.id === selecionadaIdEfetiva) ?? null;

  function atualizarSemanaLocal(turmaId: string, semanaId: string, status: "APROVADO" | "DEVOLVIDO") {
    setTurmas((atual) =>
      atual.map((t) => (t.id !== turmaId ? t : { ...t, semanas: t.semanas.map((s) => (s.id === semanaId ? { ...s, status } : s)) }))
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr] lg:items-start">
      <Card className="p-0">
        <div className="flex flex-col gap-3 border-b border-cda-border p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-cda-blue" />
              <span className="text-sm font-semibold text-cda-text">Planejamento do mês</span>
            </div>
            <span className="text-xs text-cda-text3">
              {turmasFiltradas.length} de {turmas.length}
            </span>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cda-text3" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar turma ou professora..."
              aria-label="Buscar turma ou professora"
              className="h-10 w-full rounded-lg border border-cda-border bg-white pl-9 pr-3 text-base text-cda-text placeholder:text-cda-text3 outline-none transition-colors focus:border-cda-blue sm:text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTROS.map((f) => (
              <button
                key={f.valor}
                type="button"
                onClick={() => setFiltro(f.valor)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  filtro === f.valor ? "bg-cda-navy text-white" : "bg-cda-bg text-cda-text2 hover:bg-cda-border"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[560px] overflow-y-auto">
          {turmasFiltradas.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-cda-text3">Nenhuma turma encontrada com esse filtro.</p>
          ) : (
            <div className="flex flex-col divide-y divide-cda-border">
              {turmasFiltradas.map((t) => {
                const ativa = t.id === selecionadaIdEfetiva;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelecionadaId(t.id)}
                    className={`flex items-start gap-3 px-4 py-3 text-left transition-colors ${ativa ? "bg-cda-blue/5" : "hover:bg-cda-bg"}`}
                    style={ativa ? { boxShadow: "inset 3px 0 0 var(--cda-blue)" } : undefined}
                  >
                    <Avatar nome={t.regenteNome ?? t.nome} foto={t.regenteFoto} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-cda-text">{t.regenteNome ?? "Sem regente"}</p>
                      <p className="truncate text-xs text-cda-text3">
                        {t.nome} · {TURNO_LABEL[t.turno] ?? t.turno}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <Badge variant={STATUS_TURMA_MES_BADGE[t.statusTurma]} className="text-[10px]">
                          {STATUS_TURMA_MES_LABEL[t.statusTurma]}
                        </Badge>
                        {t.folhas.grafica > 0 && (
                          <Badge variant="cat4" className="text-[10px]">
                            Ativ. Gráfica {t.folhas.grafica}
                          </Badge>
                        )}
                        {t.folhas.literario > 0 && (
                          <Badge variant="cat3" className="text-[10px]">
                            Tema Lit. {t.folhas.literario}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <Card className="p-0">
        {!selecionada ? (
          <EmptyState icon={ClipboardCheck} title="Selecione uma turma" subtitle="Escolha uma turma na lista pra ver o detalhe." />
        ) : (
          <PainelDetalheTurma
            key={selecionada.id}
            turma={selecionada}
            prazoTexto={prazoTexto}
            prazoVencido={prazoVencido}
            onDecidido={(semanaId, status) => {
              atualizarSemanaLocal(selecionada.id, semanaId, status);
              router.refresh();
            }}
          />
        )}
      </Card>
    </div>
  );
}

function PainelDetalheTurma({
  turma,
  prazoTexto,
  prazoVencido,
  onDecidido,
}: {
  turma: TurmaResumoPainel;
  prazoTexto: string | null;
  prazoVencido: boolean;
  onDecidido: (semanaId: string, status: "APROVADO" | "DEVOLVIDO") => void;
}) {
  const pendente = turma.semanas.find((s) => s.status === "ENVIADO") ?? null;
  const [comentario, setComentario] = useState("");
  const [mostrarDevolver, setMostrarDevolver] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function decidir(status: "APROVADO" | "DEVOLVIDO") {
    if (!pendente) return;
    setEnviando(true);
    const res = await fetch(`/api/planejamentos/${pendente.id}/revisar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, comentario: comentario.trim() || undefined }),
    });
    setEnviando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "Não foi possível revisar essa entrega.", "error");
      return;
    }
    showToast(status === "APROVADO" ? "Planejamento aprovado." : "Planejamento devolvido pra revisão.");
    onDecidido(pendente.id, status);
    setComentario("");
    setMostrarDevolver(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cda-border p-4">
        <div className="flex items-center gap-3">
          <Avatar nome={turma.regenteNome ?? turma.nome} foto={turma.regenteFoto} size="lg" />
          <div>
            <p className="text-sm font-semibold text-cda-text">{turma.regenteNome ?? "Sem regente vinculada"}</p>
            <p className="text-xs text-cda-text3">
              {turma.nome} · {TURNO_LABEL[turma.turno] ?? turma.turno}
            </p>
          </div>
        </div>
        {prazoTexto && <span className={`text-xs font-medium ${prazoVencido ? "text-cda-red" : "text-cda-text3"}`}>{prazoTexto}</span>}
      </div>

      <div className="border-b border-cda-border p-4">
        <PlanejamentoStepper status={statusParaStepper(turma.statusTurma)} />
      </div>

      <div className="border-b border-cda-border p-4">
        <p className="mb-2 text-xs font-semibold text-cda-text2">
          Planejamento — {turma.semanasEnviadas} de {turma.semanasTotal} semana{turma.semanasTotal === 1 ? "" : "s"} enviadas
          {turma.pontualidadePct !== null && ` · ${turma.pontualidadePct}% no prazo esse mês`}
        </p>
        <div className="flex flex-col gap-1.5">
          {turma.semanas.length === 0 && <p className="text-xs text-cda-text3">Nenhuma semana enviada ainda esse mês.</p>}
          {turma.semanas.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-cda-text2">Semana de {formatarDiaMes(s.semanaInicio)}</span>
              <Badge variant={STATUS_TURMA_MES_BADGE[s.status]}>{STATUS_TURMA_MES_LABEL[s.status]}</Badge>
            </div>
          ))}
        </div>

        {pendente && (
          <div className="mt-3 rounded-lg border border-cda-blue/20 bg-cda-blue/5 p-3">
            <p className="mb-2 text-xs font-medium text-cda-text2">Semana de {formatarDiaMes(pendente.semanaInicio)} aguardando revisão</p>
            {mostrarDevolver && (
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="O que precisa corrigir?"
                rows={2}
                className="mb-2 w-full rounded-lg border border-cda-border bg-white px-3 py-2 text-sm text-cda-text outline-none transition-colors focus:border-cda-blue"
              />
            )}
            <div className="flex flex-wrap justify-end gap-2">
              {mostrarDevolver ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setMostrarDevolver(false)} disabled={enviando}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={() => decidir("DEVOLVIDO")} loading={enviando} disabled={!comentario.trim()}>
                    <Undo2 className="h-3.5 w-3.5" />
                    Devolver
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => setMostrarDevolver(true)} disabled={enviando}>
                    <Undo2 className="h-3.5 w-3.5" />
                    Devolver
                  </Button>
                  <Button size="sm" onClick={() => decidir("APROVADO")} loading={enviando}>
                    <ThumbsUp className="h-3.5 w-3.5" />
                    Aprovar
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col divide-y divide-cda-border">
        <a
          href={turma.roteiroHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-cda-bg"
        >
          <span className="flex items-center gap-2 text-sm text-cda-text2">
            <ScrollText className="h-4 w-4" style={{ color: "var(--cat-2-dot)" }} />
            Roteiro
          </span>
          <span className="text-xs font-medium text-cda-blue">Baixar PDF</span>
        </a>
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <span className="flex items-center gap-2 text-sm text-cda-text2">
            <ImageIcon className="h-4 w-4" style={{ color: "var(--cat-4-dot)" }} />
            Atividade Gráfica
          </span>
          <span className="text-xs text-cda-text3">
            {turma.folhas.grafica} preenchida{turma.folhas.grafica === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <span className="flex items-center gap-2 text-sm text-cda-text2">
            <BookOpen className="h-4 w-4" style={{ color: "var(--cat-3-dot)" }} />
            Tema Literário
          </span>
          <span className="text-xs text-cda-text3">
            {turma.folhas.literario} preenchido{turma.folhas.literario === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="flex justify-end p-4">
        <Link
          href={`/pedagogico/planejamento/${turma.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-cda-blue hover:underline"
        >
          Abrir a turma inteira
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
