"use client";

import { useEffect, useState } from "react";
import { ChevronDown, NotebookPen, Printer, CheckCircle2, RotateCcw, ThumbsUp, Undo2, MessageSquareWarning } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { showToast } from "@/components/ui/Toast";
import { PlanejamentoStepper } from "@/components/modules/pedagogico/PlanejamentoStepper";
import { diasDaSemana, isoData, segundaFeiraDe, type ConteudoDiaPlanejamento } from "@/lib/planejamento";

export type TipoFolha = "ATIVIDADE_GRAFICA" | "TEMA_LITERARIO";

const LABEL_DIA = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];
const CHAVE_POR_TIPO: Record<TipoFolha, keyof ConteudoDiaPlanejamento> = {
  ATIVIDADE_GRAFICA: "folhaAtividadeGrafica",
  TEMA_LITERARIO: "folhaTemaLiterario",
};

type DiaFolha = { data: string; texto: string };
type Status = "RASCUNHO" | "ENVIADO" | "APROVADO" | "DEVOLVIDO";

function somarDias(iso: string, dias: number): string {
  const data = new Date(`${iso}T00:00:00.000Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

function formatarDiaMes(iso: string): string {
  const data = new Date(`${iso}T00:00:00.000Z`);
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

/** Uma semana da Atividade Gráfica/Tema Literário — mesmo padrão visual e de
 * status do Planejamento (SemanaPlanejamento.tsx), bem mais simples: 1
 * parágrafo por dia, sem projeto/materiais/tarde-cultural/especializada. O
 * TEXTO de cada dia é o mesmo campo que já existe dentro do Planejamento
 * (PlanejamentoDia.conteudo.folhaAtividadeGrafica/folhaTemaLiterario) — essa
 * tela só dá um jeito mais direto de escrever e enviar isso, sem precisar
 * abrir o Planejamento e entrar em cada dia. O STATUS (Rascunho/Enviado/
 * Aprovado/Devolvido) é um documento à parte (FolhaMensal), independente do
 * status do Planejamento daquela semana. */
export function SemanaFolha({
  turmaId,
  tipo,
  semanaIso,
  abertaPorPadrao,
  onSalvo,
}: {
  turmaId: string;
  tipo: TipoFolha;
  semanaIso: string;
  abertaPorPadrao: boolean;
  onSalvo?: () => void;
}) {
  const [aberta, setAberta] = useState(abertaPorPadrao);
  const [carregado, setCarregado] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [id, setId] = useState<string | null>(null);
  const [dias, setDias] = useState<DiaFolha[]>([]);
  const [status, setStatus] = useState<Status>("RASCUNHO");
  const [comentarioCoordenadora, setComentarioCoordenadora] = useState("");
  const [comentarioAutorNome, setComentarioAutorNome] = useState("");
  const [souCoordenadora, setSouCoordenadora] = useState(false);
  const [podeEditar, setPodeEditar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [comentarioForm, setComentarioForm] = useState("");
  const [revisando, setRevisando] = useState(false);
  const [mostrarDevolver, setMostrarDevolver] = useState(false);

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      setCarregando(true);
      setErro("");
      const semanaInicio = segundaFeiraDe(new Date(`${semanaIso}T00:00:00.000Z`));
      const [resPlan, resFolha] = await Promise.all([
        fetch(`/api/planejamentos?turmaId=${turmaId}&semana=${semanaIso}`),
        fetch(`/api/folhas-mensais?turmaId=${turmaId}&tipo=${tipo}&semana=${semanaIso}`),
      ]);
      if (cancelado) return;
      if (!resPlan.ok || !resFolha.ok) {
        setCarregando(false);
        setErro("Não foi possível carregar essa semana.");
        return;
      }
      const dataPlan = await resPlan.json();
      const dataFolha = await resFolha.json();
      if (cancelado) return;
      const chave = CHAVE_POR_TIPO[tipo];
      const diasVindos: { data: string; conteudo: ConteudoDiaPlanejamento }[] =
        dataPlan.dias ?? diasDaSemana(semanaInicio).map((d) => ({ data: isoData(d), conteudo: {} }));
      setDias(diasVindos.map((d) => ({ data: d.data, texto: d.conteudo[chave] ?? "" })));
      setId(dataFolha.id ?? null);
      setStatus(dataFolha.status ?? "RASCUNHO");
      setComentarioCoordenadora(dataFolha.comentarioCoordenadora ?? "");
      setComentarioAutorNome(dataFolha.comentarioAutorNome ?? "");
      setSouCoordenadora(!!dataFolha.souCoordenadora);
      setPodeEditar(!!dataFolha.podeEditar);
      setCarregando(false);
      setCarregado(true);
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, [turmaId, tipo, semanaIso]);

  function atualizarDia(index: number, texto: string) {
    setDias((atual) => atual.map((d, i) => (i === index ? { ...d, texto } : d)));
  }

  async function salvar(novoStatus?: "ENVIADO" | "RASCUNHO") {
    setSalvando(true);
    setErro("");
    const resultados = await Promise.all(
      dias.map((d) =>
        fetch("/api/planejamentos/dia-folha", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ turmaId, data: d.data, tipo, texto: d.texto }),
        })
      )
    );
    if (resultados.some((r) => !r.ok)) {
      setSalvando(false);
      setErro("Não foi possível salvar algum dos dias — tente de novo.");
      return;
    }
    if (novoStatus) {
      const res = await fetch("/api/folhas-mensais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turmaId, tipo, semana: semanaIso, status: novoStatus }),
      });
      setSalvando(false);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErro(data.error ?? "Não foi possível atualizar o status.");
        return;
      }
      const data = await res.json();
      setId(data.id);
      setStatus(novoStatus);
      if (novoStatus === "ENVIADO") {
        setComentarioCoordenadora("");
      }
    } else {
      setSalvando(false);
    }
    onSalvo?.();
    showToast(novoStatus === "ENVIADO" ? "Enviado pra revisão." : novoStatus === "RASCUNHO" ? "Reaberto." : "Salvo.");
  }

  async function revisar(novoStatus: "APROVADO" | "DEVOLVIDO") {
    if (!id) return;
    setRevisando(true);
    setErro("");
    const res = await fetch(`/api/folhas-mensais/${id}/revisar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus, comentario: comentarioForm.trim() || undefined }),
    });
    setRevisando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Não foi possível revisar essa entrega.");
      return;
    }
    setStatus(novoStatus);
    setComentarioCoordenadora(comentarioForm.trim());
    setComentarioForm("");
    setMostrarDevolver(false);
    showToast(novoStatus === "APROVADO" ? "Aprovado." : "Devolvido pra revisão.");
  }

  const diasPreenchidos = dias.filter((d) => d.texto.trim()).length;

  return (
    <Card className="p-0">
      <button type="button" onClick={() => setAberta((v) => !v)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <div>
          <span className="text-sm font-semibold text-cda-text">
            Semana de {formatarDiaMes(semanaIso)} a {formatarDiaMes(somarDias(semanaIso, 4))}
          </span>
          {carregado && <p className="mt-0.5 text-xs text-cda-text3">{diasPreenchidos} de 5 dias preenchidos</p>}
        </div>
        <div className="flex items-center gap-2">
          {carregado && (
            <Badge variant={status === "APROVADO" ? "success" : status === "DEVOLVIDO" ? "danger" : status === "ENVIADO" ? "info" : diasPreenchidos > 0 ? "warning" : "neutral"}>
              {status === "APROVADO" ? "Aprovado" : status === "DEVOLVIDO" ? "Devolvido" : status === "ENVIADO" ? "Enviado" : diasPreenchidos > 0 ? "Rascunho" : "Vazia"}
            </Badge>
          )}
          <ChevronDown className={`h-4 w-4 shrink-0 text-cda-text3 transition-transform ${aberta ? "rotate-180" : ""}`} />
        </div>
      </button>

      {carregado && (
        <div className="border-t border-cda-border px-5 py-3">
          <PlanejamentoStepper status={status} />
        </div>
      )}

      {aberta && (
        <div className="border-t border-cda-border p-5">
          {comentarioCoordenadora && (
            <div className={`mb-4 rounded-lg border p-3 ${status === "DEVOLVIDO" ? "border-cda-red/30 bg-cda-red/5" : "border-cda-border bg-cda-bg"}`}>
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-cda-text">
                <MessageSquareWarning className="h-3.5 w-3.5" />
                Comentário {comentarioAutorNome ? `de ${comentarioAutorNome}` : "da coordenadora"}
              </div>
              <p className="whitespace-pre-line text-sm text-cda-text2">{comentarioCoordenadora}</p>
            </div>
          )}

          {carregando ? (
            <p className="text-sm text-cda-text3">Carregando...</p>
          ) : (
            <div className="flex flex-col gap-3">
              {dias.map((dia, i) => (
                <div key={dia.data} className="flex flex-col gap-1.5 rounded-lg border border-cda-border p-4">
                  <label className="text-sm font-semibold text-cda-text">
                    {LABEL_DIA[i]} <span className="font-normal text-cda-text3">({formatarDiaMes(dia.data)})</span>
                  </label>
                  <textarea
                    value={dia.texto}
                    onChange={(e) => atualizarDia(i, e.target.value)}
                    disabled={!podeEditar}
                    rows={3}
                    placeholder="Texto da instrução pra folha desse dia (opcional, só se esse dia tiver uma)..."
                    className="w-full rounded-lg border border-cda-border bg-white px-3 py-2 text-sm text-cda-text outline-none transition-colors focus:border-cda-blue disabled:bg-cda-bg disabled:text-cda-text3"
                  />
                  {dia.texto.trim() && (
                    <a
                      href={`/api/planejamentos/folha?turmaId=${turmaId}&data=${dia.data}&tipo=${tipo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-cda-blue hover:underline"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Gerar PDF (1 folha por aluno)
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {erro && <p className="mt-3 text-sm text-cda-red">{erro}</p>}

          {podeEditar && (
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => salvar()} loading={salvando} disabled={carregando}>
                <NotebookPen className="h-3.5 w-3.5" />
                Salvar
              </Button>
              {status !== "RASCUNHO" && (
                <Button variant="outline" onClick={() => salvar("RASCUNHO")} loading={salvando} disabled={carregando}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reabrir
                </Button>
              )}
              {status === "RASCUNHO" && (
                <Button onClick={() => salvar("ENVIADO")} loading={salvando} disabled={carregando}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Finalizar
                </Button>
              )}
              {status === "DEVOLVIDO" && (
                <Button onClick={() => salvar("ENVIADO")} loading={salvando} disabled={carregando}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Reenviar
                </Button>
              )}
            </div>
          )}
          {!carregando && !podeEditar && !souCoordenadora && (
            <p className="mt-3 text-xs text-cda-text3">Só a professora regente dessa turma edita.</p>
          )}

          {souCoordenadora && status !== "RASCUNHO" && (
            <div className="mt-4 rounded-lg border border-cda-blue/20 bg-cda-blue/5 p-4">
              <p className="mb-1 text-xs font-semibold text-cda-text2">Revisão da coordenadora</p>
              <p className="mb-3 text-xs text-cda-text3">Aprove se está tudo certo, ou devolva explicando o que precisa ajustar.</p>
              {mostrarDevolver && (
                <textarea
                  value={comentarioForm}
                  onChange={(e) => setComentarioForm(e.target.value)}
                  placeholder="O que precisa corrigir?"
                  rows={3}
                  className="mb-2 w-full rounded-lg border border-cda-border bg-white px-3 py-2 text-sm text-cda-text outline-none transition-colors focus:border-cda-blue"
                />
              )}
              <div className="flex flex-wrap justify-end gap-2">
                {mostrarDevolver ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setMostrarDevolver(false)} disabled={revisando}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={() => revisar("DEVOLVIDO")} loading={revisando} disabled={!comentarioForm.trim()}>
                      <Undo2 className="h-3.5 w-3.5" />
                      Devolver
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setComentarioForm("");
                        setMostrarDevolver(true);
                      }}
                      disabled={revisando}
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      Devolver com comentário
                    </Button>
                    <Button size="sm" onClick={() => revisar("APROVADO")} loading={revisando}>
                      <ThumbsUp className="h-3.5 w-3.5" />
                      Aprovar
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
