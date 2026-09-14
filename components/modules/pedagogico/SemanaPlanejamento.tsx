"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, NotebookPen, ScrollText, Printer, CheckCircle2, RotateCcw, ThumbsUp, Undo2, MessageSquareWarning, History } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { showToast } from "@/components/ui/Toast";
import { PlanejamentoStepper } from "@/components/modules/pedagogico/PlanejamentoStepper";
import { tituloDoDia, bulletsDoDia, type ConteudoDiaPlanejamento } from "@/lib/planejamento";

type TipoDia = "TEMATICA" | "CONTEXTO";
export type Projeto = { id: string; nome: string; ativo: boolean };
type DiaForm = { data: string; tipo: TipoDia; conteudo: ConteudoDiaPlanejamento; especializadas: string };

const LABEL_DIA = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];

function somarDias(iso: string, dias: number): string {
  const data = new Date(`${iso}T00:00:00.000Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

function formatarDiaMes(iso: string): string {
  const data = new Date(`${iso}T00:00:00.000Z`);
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

type VersaoApi = {
  numero: number;
  conteudo: {
    projetoNome: string | null;
    dias: { data: string; tipo: TipoDia; conteudo: ConteudoDiaPlanejamento }[];
  };
  enviadoPorNome: string;
  enviadoEm: string;
  veredito: "APROVADO" | "DEVOLVIDO" | null;
  comentario: string | null;
  decididoPorNome: string | null;
  decididoEm: string | null;
};

/** Histórico de versões — pedido do dono, set/2026: "o sistema guarda v1 e
 * v2, nunca substitui sem rastro... importante pra auditoria ou
 * questionamento futuro". Carrega só quando abre (não pesa a tela toda vez
 * que a semana carrega, é consulta rara). */
function HistoricoVersoes({ planejamentoId }: { planejamentoId: string }) {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [versoes, setVersoes] = useState<VersaoApi[] | null>(null);

  async function alternar() {
    const proximo = !aberto;
    setAberto(proximo);
    if (proximo && versoes === null) {
      setCarregando(true);
      const res = await fetch(`/api/planejamentos/${planejamentoId}/versoes`);
      if (res.ok) setVersoes(await res.json());
      setCarregando(false);
    }
  }

  return (
    <div className="mt-4 border-t border-cda-border pt-3">
      <button type="button" onClick={alternar} className="inline-flex items-center gap-1.5 text-xs font-medium text-cda-text3 hover:text-cda-blue">
        <History className="h-3.5 w-3.5" />
        {aberto ? "Ocultar histórico de versões" : "Ver histórico de versões"}
      </button>
      {aberto && (
        <div className="mt-2 flex flex-col gap-2">
          {carregando && <p className="text-xs text-cda-text3">Carregando...</p>}
          {versoes?.length === 0 && <p className="text-xs text-cda-text3">Nenhum envio registrado ainda.</p>}
          {versoes?.map((v) => (
            <div key={v.numero} className="rounded-lg border border-cda-border bg-cda-bg p-3">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-cda-text">
                  Versão {v.numero} — enviada {formatarDataHora(v.enviadoEm)} por {v.enviadoPorNome}
                </span>
                {v.veredito && (
                  <Badge variant={v.veredito === "APROVADO" ? "success" : "danger"}>
                    {v.veredito === "APROVADO" ? "Aprovado" : "Devolvido"}
                  </Badge>
                )}
              </div>
              {v.decididoPorNome && v.decididoEm && (
                <p className="mb-2 text-xs text-cda-text3">
                  por {v.decididoPorNome} em {formatarDataHora(v.decididoEm)}
                  {v.comentario && <>: “{v.comentario}”</>}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {v.conteudo.projetoNome && <p className="text-xs text-cda-text2">Projeto: {v.conteudo.projetoNome}</p>}
                {v.conteudo.dias.map((d) => {
                  const titulo = tituloDoDia(d.tipo, d.conteudo);
                  const bullets = bulletsDoDia(d.tipo, d.conteudo);
                  const resumo = titulo || bullets[0] || null;
                  if (!resumo) return null;
                  return (
                    <p key={d.data} className="text-xs text-cda-text3">
                      <span className="font-medium">{formatarDiaMes(d.data)}:</span> {resumo}
                    </p>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Um campo de texto com rótulo, no mesmo padrão visual usado em toda a
 * Área Pedagógica — só que compacto o bastante pra caber vários por dia. */
function Campo({
  label,
  value,
  onChange,
  disabled,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  rows?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-cda-text2">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={rows}
        className="w-full rounded-lg border border-cda-border bg-white px-3 py-2 text-sm text-cda-text outline-none transition-colors focus:border-cda-blue disabled:bg-cda-bg disabled:text-cda-text3"
      />
    </div>
  );
}

/** Campo de texto de uma folha imprimível pontual (Tema Literário/Atividade
 * Gráfica) + link pra baixar o PDF (aparece só quando já tem texto salvo —
 * o PDF é gerado a partir do que está no banco, então baixa a versão salva
 * mais recente, não o rascunho ainda não salvo na tela). */
function FolhaImprimivel({
  turmaId,
  data,
  tipo,
  label,
  value,
  onChange,
  podeEditar,
}: {
  turmaId: string;
  data: string;
  tipo: "TEMA_LITERARIO" | "ATIVIDADE_GRAFICA";
  label: string;
  value: string;
  onChange: (v: string) => void;
  podeEditar: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Campo label={label} value={value} onChange={onChange} disabled={!podeEditar} rows={2} />
      {value && (
        <a
          href={`/api/planejamentos/folha?turmaId=${turmaId}&data=${data}&tipo=${tipo}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-cda-blue hover:underline"
        >
          <Printer className="h-3.5 w-3.5" />
          Baixar folha em PDF (versão já salva)
        </a>
      )}
    </div>
  );
}

/** Um dia do planejamento — estrutura real do documento MODELO_PLANEJAMENTO
 * (achado real, set/2026): alterna entre "Temática do dia" (temática +
 * momento inicial/fundamental) e "Contexto organizado" (contexto + roda de
 * conversa + organização), com o "Momento final" (registro) comum aos 2.
 * Recolhido por padrão pra não virar uma tela gigante com os 5 dias abertos
 * ao mesmo tempo — abre um resumo do que já tem preenchido. */
function DiaPlanejamento({
  turmaId,
  indice,
  dia,
  atualizar,
  podeEditar,
}: {
  turmaId: string;
  indice: number;
  dia: DiaForm;
  atualizar: (patch: Partial<DiaForm>) => void;
  podeEditar: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const c = dia.conteudo;

  function atualizarConteudo(patch: Partial<ConteudoDiaPlanejamento>) {
    atualizar({ conteudo: { ...c, ...patch } });
  }

  const resumo = dia.tipo === "TEMATICA" ? c.tematicaDia : c.contextoOrganizado;
  const temConteudo = Object.keys(c).length > 0;

  return (
    <div className="rounded-lg border border-cda-border">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-cda-text">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: temConteudo ? "var(--status-info)" : "var(--cda-border)" }}
              aria-hidden
            />
            {LABEL_DIA[indice]} <span className="font-normal text-cda-text3">({formatarDiaMes(dia.data)})</span>
          </p>
          {resumo && <p className="mt-0.5 pl-3.5 text-xs text-cda-text3">{resumo}</p>}
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-cda-text3 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>

      {aberto && (
        <div className="flex flex-col gap-3 border-t border-cda-border p-4">
          <Select
            label="Formato do dia"
            value={dia.tipo}
            onChange={(e) => atualizar({ tipo: e.target.value as TipoDia })}
            disabled={!podeEditar}
          >
            <option value="TEMATICA">Temática do dia</option>
            <option value="CONTEXTO">Contexto organizado</option>
          </Select>
          <p className="-mt-2 text-xs text-cda-text3">
            <span className="font-medium text-cda-text2">Temática do dia:</span> assunto novo, com momento inicial e
            fundamental. <span className="font-medium text-cda-text2">Contexto organizado:</span> ambiente livre, com roda
            de conversa.
          </p>

          {dia.tipo === "TEMATICA" ? (
            <>
              <Campo label="Temática do dia" value={c.tematicaDia ?? ""} onChange={(v) => atualizarConteudo({ tematicaDia: v })} disabled={!podeEditar} rows={1} />
              <Campo label="Momento inicial" value={c.momentoInicial ?? ""} onChange={(v) => atualizarConteudo({ momentoInicial: v })} disabled={!podeEditar} />
              <Campo
                label="Questionamentos e diálogos possíveis"
                value={c.questionamentosInicial ?? ""}
                onChange={(v) => atualizarConteudo({ questionamentosInicial: v })}
                disabled={!podeEditar}
              />
              <Campo label="Momento fundamental" value={c.momentoFundamental ?? ""} onChange={(v) => atualizarConteudo({ momentoFundamental: v })} disabled={!podeEditar} />
              <Campo
                label="Questionamentos e diálogos possíveis"
                value={c.questionamentosFundamental ?? ""}
                onChange={(v) => atualizarConteudo({ questionamentosFundamental: v })}
                disabled={!podeEditar}
              />
            </>
          ) : (
            <>
              <Campo label="Contexto organizado" value={c.contextoOrganizado ?? ""} onChange={(v) => atualizarConteudo({ contextoOrganizado: v })} disabled={!podeEditar} rows={1} />
              <Campo label="Roda de conversa" value={c.rodaDeConversa ?? ""} onChange={(v) => atualizarConteudo({ rodaDeConversa: v })} disabled={!podeEditar} />
              <Campo
                label="Questionamentos e diálogos possíveis"
                value={c.questionamentosRoda ?? ""}
                onChange={(v) => atualizarConteudo({ questionamentosRoda: v })}
                disabled={!podeEditar}
              />
              <Campo label="Organização do contexto" value={c.organizacaoContexto ?? ""} onChange={(v) => atualizarConteudo({ organizacaoContexto: v })} disabled={!podeEditar} />
              <Campo
                label="Questionamentos e diálogos possíveis"
                value={c.questionamentosContexto ?? ""}
                onChange={(v) => atualizarConteudo({ questionamentosContexto: v })}
                disabled={!podeEditar}
              />
            </>
          )}

          <div className="flex flex-col gap-1">
            <Campo
              label="Momento final (opcional)"
              value={c.momentoFinal ?? ""}
              onChange={(v) => atualizarConteudo({ momentoFinal: v })}
              disabled={!podeEditar}
            />
            <p className="text-xs text-cda-text3">Registro de fechamento do dia — deixe em branco se não se aplicar.</p>
          </div>
          <Campo
            label="Questionamentos e diálogos possíveis"
            value={c.questionamentosFinal ?? ""}
            onChange={(v) => atualizarConteudo({ questionamentosFinal: v })}
            disabled={!podeEditar}
          />
          <Campo label="Aulas especializadas nesse dia" value={dia.especializadas} onChange={(v) => atualizar({ especializadas: v })} disabled={!podeEditar} rows={1} />

          <div className="flex flex-col gap-3 border-t border-cda-border pt-3">
            <p className="text-xs font-medium text-cda-text2">Folhas imprimíveis (opcional, só se esse dia tiver uma)</p>
            <FolhaImprimivel
              turmaId={turmaId}
              data={dia.data}
              tipo="TEMA_LITERARIO"
              label="Tema Literário — texto da folha"
              value={c.folhaTemaLiterario ?? ""}
              onChange={(v) => atualizarConteudo({ folhaTemaLiterario: v })}
              podeEditar={podeEditar}
            />
            <FolhaImprimivel
              turmaId={turmaId}
              data={dia.data}
              tipo="ATIVIDADE_GRAFICA"
              label="Atividade Gráfica — texto da folha"
              value={c.folhaAtividadeGrafica ?? ""}
              onChange={(v) => atualizarConteudo({ folhaAtividadeGrafica: v })}
              podeEditar={podeEditar}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** Uma semana dentro do mês — carrega e salva sozinha (achado real, set/2026:
 * o documento é organizado em semanas dentro do mês/projeto). Recolhida por
 * padrão (abre só a semana atual, quando o mês em tela é o mês corrente),
 * mostra um resumo de "preenchida/vazia" no cabeçalho mesmo fechada. */
export function SemanaPlanejamento({
  turmaId,
  projetos,
  semanaIso,
  abertaPorPadrao,
}: {
  turmaId: string;
  projetos: Projeto[];
  semanaIso: string;
  abertaPorPadrao: boolean;
}) {
  const [aberta, setAberta] = useState(abertaPorPadrao);
  const [carregado, setCarregado] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [projetoId, setProjetoId] = useState<string>("");
  const [projetoJustificativa, setProjetoJustificativa] = useState("");
  const [materiais, setMateriais] = useState("");
  const [tardeCulturalApresentacao, setTardeCulturalApresentacao] = useState("");
  const [tardeCulturalMateriais, setTardeCulturalMateriais] = useState("");
  const [dias, setDias] = useState<DiaForm[]>([]);
  const [status, setStatus] = useState<"RASCUNHO" | "ENVIADO" | "APROVADO" | "DEVOLVIDO">("RASCUNHO");
  const [comentarioCoordenadora, setComentarioCoordenadora] = useState("");
  const [comentarioAutorNome, setComentarioAutorNome] = useState("");
  const [liComentarioEm, setLiComentarioEm] = useState<string | null>(null);
  const [souCoordenadora, setSouCoordenadora] = useState(false);
  const [podeEditar, setPodeEditar] = useState(false);
  const [carregando, setCarregando] = useState(true);
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
      const res = await fetch(`/api/planejamentos?turmaId=${turmaId}&semana=${semanaIso}`);
      if (cancelado) return;
      if (!res.ok) {
        setCarregando(false);
        setErro("Não foi possível carregar o planejamento dessa semana.");
        return;
      }
      const data = await res.json();
      if (cancelado) return;
      setId(data.id ?? null);
      setProjetoId(data.projetoId ?? "");
      setProjetoJustificativa(data.projetoJustificativa ?? "");
      setMateriais(data.materiais ?? "");
      setTardeCulturalApresentacao(data.tardeCulturalApresentacao ?? "");
      setTardeCulturalMateriais(data.tardeCulturalMateriais ?? "");
      setDias(data.dias);
      setStatus(data.status ?? "RASCUNHO");
      setComentarioCoordenadora(data.comentarioCoordenadora ?? "");
      setComentarioAutorNome(data.comentarioAutorNome ?? "");
      setLiComentarioEm(data.liComentarioEm ?? null);
      setSouCoordenadora(!!data.souCoordenadora);
      setPodeEditar(data.podeEditar);
      setCarregando(false);
      setCarregado(true);
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, [turmaId, semanaIso]);

  function atualizarDia(index: number, patch: Partial<DiaForm>) {
    setDias((atual) => atual.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  async function salvar(novoStatus?: "ENVIADO" | "RASCUNHO") {
    setSalvando(true);
    setErro("");
    const res = await fetch("/api/planejamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        turmaId,
        semana: semanaIso,
        projetoId: projetoId || null,
        materiais,
        tardeCulturalApresentacao,
        tardeCulturalMateriais,
        dias,
        status: novoStatus,
      }),
    });
    setSalvando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Não foi possível salvar o planejamento.");
      return;
    }
    if (novoStatus) setStatus(novoStatus);
    if (novoStatus === "ENVIADO") {
      setComentarioCoordenadora("");
      setLiComentarioEm(null);
    }
    showToast(novoStatus === "ENVIADO" ? "Planejamento da semana finalizado." : novoStatus === "RASCUNHO" ? "Planejamento reaberto." : "Planejamento da semana salvo.");
  }

  async function revisar(novoStatus: "APROVADO" | "DEVOLVIDO") {
    if (!id) return;
    setRevisando(true);
    setErro("");
    const res = await fetch(`/api/planejamentos/${id}/revisar`, {
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
    setLiComentarioEm(null);
    setComentarioForm("");
    setMostrarDevolver(false);
    showToast(novoStatus === "APROVADO" ? "Planejamento aprovado." : "Planejamento devolvido pra revisão.");
  }

  async function confirmarLeitura() {
    if (!id) return;
    const res = await fetch(`/api/planejamentos/${id}/li-entendi`, { method: "PATCH" });
    if (res.ok) {
      setLiComentarioEm(new Date().toISOString());
      showToast("Confirmado — a coordenadora vê que você leu.");
    }
  }

  const preenchida = carregado && dias.some((d) => Object.keys(d.conteudo).length > 0);
  const diasPreenchidos = dias.filter((d) => Object.keys(d.conteudo).length > 0).length;

  return (
    <Card className="p-0">
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div>
          <span className="text-sm font-semibold text-cda-text">
            Semana de {formatarDiaMes(semanaIso)} a {formatarDiaMes(somarDias(semanaIso, 4))}
          </span>
          {carregado && <p className="mt-0.5 text-xs text-cda-text3">{diasPreenchidos} de 5 dias preenchidos</p>}
        </div>
        <div className="flex items-center gap-2">
          {carregado && (
            <Badge
              variant={
                status === "APROVADO" ? "success" : status === "DEVOLVIDO" ? "danger" : status === "ENVIADO" ? "info" : preenchida ? "warning" : "neutral"
              }
            >
              {status === "APROVADO" ? "Aprovado" : status === "DEVOLVIDO" ? "Devolvido" : status === "ENVIADO" ? "Enviado" : preenchida ? "Rascunho" : "Vazia"}
            </Badge>
          )}
          <ChevronDown className={`h-4 w-4 shrink-0 text-cda-text3 transition-transform ${aberta ? "rotate-180" : ""}`} />
        </div>
      </button>

      {aberta && (
        <div className="border-t border-cda-border p-5">
          {/* Trilho de etapas em destaque no topo — pedido do dono, set/2026:
              ver de cara onde a semana está entre "preenchendo" e "aprovado",
              sem ter que decifrar um badge de texto. */}
          <div className="mb-4 flex flex-col gap-3 rounded-lg border border-cda-border bg-cda-bg px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <PlanejamentoStepper status={status} />
            <Link
              href={`/pedagogico/planejamento/${turmaId}/roteiro?semana=${semanaIso}`}
              className="inline-flex shrink-0 items-center gap-1.5 self-start text-xs font-medium text-cda-blue hover:underline sm:self-auto"
            >
              <ScrollText className="h-3.5 w-3.5" />
              Ver roteiro dessa semana
            </Link>
          </div>

          {comentarioCoordenadora && (
            <div className={`mb-4 rounded-lg border p-3 ${status === "DEVOLVIDO" ? "border-cda-red/30 bg-cda-red/5" : "border-cda-border bg-cda-bg"}`}>
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-cda-text">
                <MessageSquareWarning className="h-3.5 w-3.5" />
                Comentário {comentarioAutorNome ? `de ${comentarioAutorNome}` : "da coordenadora"}
              </div>
              <p className="whitespace-pre-line text-sm text-cda-text2">{comentarioCoordenadora}</p>
              {status === "DEVOLVIDO" && podeEditar && (
                <div className="mt-2">
                  {liComentarioEm ? (
                    <span className="text-xs text-cda-text3">Você já confirmou que leu.</span>
                  ) : (
                    <Button variant="outline" size="sm" onClick={confirmarLeitura}>
                      Li e entendi
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Projeto pedagógico" value={projetoId} onChange={(e) => setProjetoId(e.target.value)} disabled={!podeEditar}>
              <option value="">Sem projeto vinculado</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} {p.ativo ? "(ativo)" : ""}
                </option>
              ))}
            </Select>
          </div>
          {projetoJustificativa && (
            <p className="-mt-2 mb-4 rounded-lg border border-cda-border bg-cda-bg px-3 py-2 text-xs text-cda-text3">
              <span className="font-medium text-cda-text2">Justificativa do projeto: </span>
              {projetoJustificativa}
            </p>
          )}

          {carregando ? (
            <p className="text-sm text-cda-text3">Carregando...</p>
          ) : (
            <>
              <div className="mb-4 flex flex-col gap-4">
                <Campo label="Materiais da semana" value={materiais} onChange={setMateriais} disabled={!podeEditar} rows={2} />
                <div className="flex flex-col gap-3 rounded-lg border border-cda-border p-3">
                  <p className="text-xs font-medium text-cda-text2">OBS: Em caso de Tarde Cultural (opcional, só se essa semana tiver)</p>
                  <Campo
                    label="Apresentação da turma — o que será feito, se for o dia da turma apresentar"
                    value={tardeCulturalApresentacao}
                    onChange={setTardeCulturalApresentacao}
                    disabled={!podeEditar}
                    rows={2}
                  />
                  <Campo
                    label="Lista de materiais necessários (quantidade, item, tamanho, cor, detalhes)"
                    value={tardeCulturalMateriais}
                    onChange={setTardeCulturalMateriais}
                    disabled={!podeEditar}
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {dias.map((dia, i) => (
                  <DiaPlanejamento key={dia.data} turmaId={turmaId} indice={i} dia={dia} atualizar={(patch) => atualizarDia(i, patch)} podeEditar={podeEditar} />
                ))}
              </div>
            </>
          )}

          {erro && <p className="mt-3 text-sm text-cda-red">{erro}</p>}

          {podeEditar && (
            <div className="mt-4">
              {(status === "RASCUNHO" || status === "DEVOLVIDO") && (
                <p className="mb-2 text-right text-xs text-cda-text3">
                  “Salvar” guarda o rascunho sem enviar. “{status === "DEVOLVIDO" ? "Reenviar" : "Finalizar"}” manda pra
                  revisão da coordenadora.
                </p>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => salvar()} loading={salvando} disabled={carregando}>
                  <NotebookPen className="h-3.5 w-3.5" />
                  Salvar planejamento
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
            </div>
          )}
          {!carregando && !podeEditar && !souCoordenadora && (
            <p className="mt-3 text-xs text-cda-text3">Só a professora regente dessa turma edita o planejamento.</p>
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

          {id && status !== "RASCUNHO" && <HistoricoVersoes planejamentoId={id} />}
        </div>
      )}
    </Card>
  );
}
