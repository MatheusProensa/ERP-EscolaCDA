"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Download, ExternalLink, Check, CheckCircle2, Clock3, Printer, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { MetricCard } from "@/components/ui/MetricCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export type ItemImpressao = {
  tipo: "PLANEJAMENTO" | "ROTEIRO" | "ATIVIDADE_GRAFICA" | "TEMA_LITERARIO";
  label: string;
  aprovado: boolean;
  aprovadoEm: string | null;
  impresso: boolean;
  impressoEm: string | null;
  impressoPor: string | null;
  pdfHref: string;
  pdfLabel: string;
  pdfExternal: boolean;
};

export type TurmaImpressao = {
  id: string;
  nome: string;
  turno: string;
  regenteNome: string | null;
  observacao: string;
  itens: ItemImpressao[];
};

const TURNO_LABEL: Record<string, string> = { MANHA: "Manhã", TARDE: "Tarde" };

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

type Filtro = "todos" | "aguardando" | "impressos" | "porTurma";

/** Fila de Impressão — pedido do dono, out/2026, mockup de referência:
 * depois que a coordenadora aprova um documento pedagógico (Planejamento/
 * Roteiro/Atividade Gráfica/Tema Literário), ele entra aqui pra secretaria
 * imprimir e marcar. Fluxo completo: Professora preenche → Coordenadora
 * aprova → aparece aqui → secretaria imprime e confirma → professora vê
 * "Impresso" no card dela (ver DocumentoPedagogicoCard). */
export function FilaImpressaoClient({
  turmas,
  anoMes,
  turmasCompletas,
  totalTurmas,
  documentosImpressos,
  documentosAprovados,
  aguardandoAprovacao,
}: {
  turmas: TurmaImpressao[];
  anoMes: string;
  turmasCompletas: number;
  totalTurmas: number;
  documentosImpressos: number;
  documentosAprovados: number;
  aguardandoAprovacao: number;
}) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const [pendentes, setPendentes] = useState<Set<string>>(new Set());
  const [observacaoLocal, setObservacaoLocal] = useState<Record<string, string>>({});

  const turmasFiltradas = useMemo(() => {
    let lista = turmas;
    if (filtro === "aguardando") lista = lista.filter((t) => t.itens.some((i) => i.aprovado && !i.impresso));
    if (filtro === "impressos") lista = lista.filter((t) => t.itens.some((i) => i.aprovado) && t.itens.every((i) => !i.aprovado || i.impresso));
    if (filtro === "porTurma" && busca.trim()) {
      const termo = busca.trim().toLowerCase();
      lista = lista.filter((t) => t.nome.toLowerCase().includes(termo) || (t.regenteNome ?? "").toLowerCase().includes(termo));
    }
    return lista;
  }, [turmas, filtro, busca]);

  const selecionada = turmas.find((t) => t.id === selecionadaId) ?? null;

  async function marcar(turmaId: string, tipo: ItemImpressao["tipo"], impresso: boolean) {
    const chave = `${turmaId}|${tipo}`;
    setPendentes((atual) => new Set(atual).add(chave));
    try {
      const res = await fetch("/api/impressao/marcar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turmaId, anoMes, tipo, impresso }),
      });
      if (res.ok) router.refresh();
    } finally {
      setPendentes((atual) => {
        const novo = new Set(atual);
        novo.delete(chave);
        return novo;
      });
    }
  }

  async function imprimirTodos(turma: TurmaImpressao) {
    const pendentesTurma = turma.itens.filter((i) => i.aprovado && !i.impresso);
    await Promise.all(pendentesTurma.map((i) => marcar(turma.id, i.tipo, true)));
  }

  async function salvarObservacao(turmaId: string, texto: string) {
    await fetch("/api/impressao/observacao", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turmaId, anoMes, texto }),
    });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={filtro}
          onChange={setFiltro}
          options={[
            { value: "todos", label: "Todos" },
            { value: "aguardando", label: "Aguardando" },
            { value: "impressos", label: "Impressos" },
            { value: "porTurma", label: "Por turma" },
          ]}
        />
        {filtro === "porTurma" && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cda-text3" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar turma ou regente..."
              className="h-8 rounded-lg border border-cda-border bg-white pl-8 pr-3 text-xs text-cda-text outline-none focus:border-cda-blue"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {turmasFiltradas.length === 0 ? (
            <Card>
              <EmptyState icon={Printer} title="Nenhuma turma nesse filtro" subtitle="Tente outro filtro ou volte pra Todos." />
            </Card>
          ) : (
            turmasFiltradas.map((turma) => {
              const totalAprovados = turma.itens.filter((i) => i.aprovado).length;
              const totalImpressos = turma.itens.filter((i) => i.aprovado && i.impresso).length;
              return (
                <Card key={turma.id} className={`p-4 ${selecionadaId === turma.id ? "border-cda-blue" : ""}`}>
                  <button
                    type="button"
                    onClick={() => setSelecionadaId(turma.id)}
                    className="mb-3 flex w-full flex-wrap items-center justify-between gap-2 text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cda-bg">
                        <Users className="h-4 w-4 text-cda-text3" />
                      </div>
                      <span className="text-sm font-semibold text-cda-text">
                        {turma.nome} <span className="font-normal text-cda-text3">({TURNO_LABEL[turma.turno] ?? turma.turno})</span>
                        {turma.regenteNome && <span className="font-normal text-cda-text3"> · {turma.regenteNome}</span>}
                      </span>
                    </div>
                    {totalAprovados === 0 ? (
                      <span className="text-xs font-medium text-cda-text3">Nenhum documento aprovado ainda</span>
                    ) : totalImpressos === totalAprovados ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-cda-green">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Todos impressos
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-cda-text3">
                        {totalImpressos} de {totalAprovados} impressos
                      </span>
                    )}
                  </button>

                  <div className="flex flex-col gap-1.5">
                    {turma.itens.map((item) => {
                      const chave = `${turma.id}|${item.tipo}`;
                      const carregando = pendentes.has(chave);
                      if (!item.aprovado) {
                        return (
                          <div key={item.tipo} className="flex items-center gap-3 rounded-lg bg-cda-bg px-3 py-2 text-cda-text3">
                            <span className="h-4 w-4 shrink-0 rounded border border-cda-border" />
                            <span className="flex-1 text-xs">{item.label} · Aguardando aprovação</span>
                            <span className="text-[11px]">— indisponível —</span>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={item.tipo}
                          className={`flex flex-wrap items-center gap-3 rounded-lg px-3 py-2 ${item.impresso ? "bg-cda-green/10" : "bg-white border border-cda-border"}`}
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${item.impresso ? "border-cda-green bg-cda-green text-white" : "border-cda-border"}`}
                          >
                            {item.impresso && <Check className="h-3 w-3" />}
                          </span>
                          <span className="flex-1 text-xs text-cda-text">
                            {item.label} Aprovado{item.aprovadoEm ? ` ${formatarData(item.aprovadoEm)}` : ""}
                          </span>
                          <Link
                            href={item.pdfHref}
                            target={item.pdfExternal ? "_blank" : undefined}
                            rel={item.pdfExternal ? "noopener noreferrer" : undefined}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-cda-blue hover:underline"
                          >
                            {item.pdfExternal ? <Download className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
                            {item.pdfLabel}
                          </Link>
                          {item.impresso ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-cda-green">
                              <Check className="h-3 w-3" /> Impresso
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={carregando}
                              onClick={() => marcar(turma.id, item.tipo, true)}
                              className="rounded-md border border-cda-border px-2 py-1 text-[11px] font-medium text-cda-text2 hover:bg-cda-bg disabled:opacity-50"
                            >
                              {carregando ? "..." : "Marcar como impresso"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })
          )}
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          {!selecionada ? (
            <Card className="p-4">
              <EmptyState icon={Users} title="Selecione uma turma" subtitle="Clique numa turma pra ver o detalhe e imprimir tudo de uma vez." />
            </Card>
          ) : (
            <Card className="p-4">
              <p className="text-sm font-semibold text-cda-text">{selecionada.nome}</p>
              <p className="mb-3 text-xs text-cda-text3">
                {TURNO_LABEL[selecionada.turno] ?? selecionada.turno}
                {selecionada.regenteNome && ` · ${selecionada.regenteNome}`}
              </p>

              {selecionada.itens.some((i) => i.aprovado && !i.impresso) && (
                <Button className="mb-3 w-full" onClick={() => imprimirTodos(selecionada)}>
                  Imprimir todos de uma vez
                </Button>
              )}

              <div className="mb-3 flex flex-col gap-1.5">
                {selecionada.itens.map((item) => (
                  <div key={item.tipo} className="flex items-center justify-between gap-2 text-xs">
                    <span className={item.aprovado ? "text-cda-text2" : "text-cda-text3"}>{item.label}</span>
                    {!item.aprovado ? (
                      <span className="text-cda-text3">—</span>
                    ) : item.impresso ? (
                      <span className="inline-flex items-center gap-1 text-cda-green">
                        <Check className="h-3 w-3" /> Impresso
                      </span>
                    ) : (
                      <Link href={item.pdfHref} target={item.pdfExternal ? "_blank" : undefined} className="text-cda-blue hover:underline">
                        {item.pdfLabel}
                      </Link>
                    )}
                  </div>
                ))}
              </div>

              {(() => {
                const ultimaImpressao = selecionada.itens.reduce<string | null>(
                  (max, i) => (i.impressoEm && (!max || i.impressoEm > max) ? i.impressoEm : max),
                  null
                );
                return (
                  <p className="mb-3 flex items-center gap-1.5 text-[11px] text-cda-text3">
                    <Clock3 className="h-3 w-3" />
                    {ultimaImpressao ? `Última impressão: hoje às ${formatarHora(ultimaImpressao)}` : "Nenhuma impressão ainda"}
                  </p>
                );
              })()}

              <textarea
                value={observacaoLocal[selecionada.id] ?? selecionada.observacao}
                onChange={(e) => setObservacaoLocal((atual) => ({ ...atual, [selecionada.id]: e.target.value }))}
                onBlur={(e) => salvarObservacao(selecionada.id, e.target.value)}
                placeholder="Observação pra impressão..."
                rows={3}
                className="w-full resize-none rounded-lg border border-cda-border bg-white px-3 py-2 text-xs text-cda-text outline-none focus:border-cda-blue"
              />
            </Card>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard icon={CheckCircle2} tone="success" value={`${turmasCompletas} de ${totalTurmas}`} label="Turmas completas" />
        <MetricCard icon={Printer} tone="cat1" value={`${documentosImpressos} de ${documentosAprovados}`} label="Documentos impressos" />
        <MetricCard icon={Clock3} tone={aguardandoAprovacao > 0 ? "warning" : "neutral"} value={aguardandoAprovacao} label="Aguardando aprovação" subtext="documentos" />
      </div>
    </div>
  );
}
