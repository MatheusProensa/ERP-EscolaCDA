"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { NotebookPen, ScrollText, Printer, CheckCircle2, RotateCcw, ThumbsUp, Undo2, MessageSquareWarning, History, CalendarClock, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { showToast } from "@/components/ui/Toast";
import { PlanejamentoStepper } from "@/components/modules/pedagogico/PlanejamentoStepper";
import { SecaoCampo, Disclosure } from "@/components/modules/pedagogico/SecaoCampo";
import { tituloDoDia, bulletsDoDia, estadoDoDia, type ConteudoDiaPlanejamento, type EstadoDia } from "@/lib/planejamento";

type TipoDia = "TEMATICA" | "CONTEXTO";
export type Projeto = { id: string; nome: string; ativo: boolean };
type DiaForm = { data: string; tipo: TipoDia; conteudo: ConteudoDiaPlanejamento; especializadas: string };

const LABEL_DIA = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];
const LABEL_DIA_CURTO = ["Seg", "Ter", "Qua", "Qui", "Sex"];

/** Pontinho de estado do dia — pedido do dono, ajuste fino, set/2026: os 3
 * estados precisam ser diferenciáveis de relance (o desenho anterior, com
 * anel fino pra parcial/vazio, ficava "tudo cinza" a essa distância).
 * Completo/parcial agora são PREENCHIDOS (verde/âmbar); só vazio fica oco.
 * Tamanho "sm" = 12px (card de semana no painel esquerdo); "xs" = 8px (aba
 * de dia, mais compacto). Exportado — reaproveitado pelo card de resumo de
 * cada semana em PlanejamentoMensalClient (redesign v4, painel dividido). */
export function PontoEstadoDia({ estado, size = "sm" }: { estado: EstadoDia; size?: "sm" | "xs" }) {
  const dimensao = size === "xs" ? "h-2 w-2" : "h-3 w-3";
  if (estado === "completo") {
    return <span className={`${dimensao} shrink-0 rounded-full`} style={{ backgroundColor: "#16a34a" }} aria-hidden />;
  }
  if (estado === "parcial") {
    return <span className={`${dimensao} shrink-0 rounded-full`} style={{ backgroundColor: "#d97706" }} aria-hidden />;
  }
  return <span className={`${dimensao} shrink-0 rounded-full border`} style={{ borderColor: "#e2e8f0", backgroundColor: "#e2e8f0" }} aria-hidden />;
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

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatarHora(d: Date): string {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Interruptor simples (Tarde Cultural) — pedido do dono, redesign v4: "só
 * mostra os campos quando a semana realmente tem Tarde Cultural". Só usado
 * aqui, por isso local em vez de virar componente de ui/ compartilhado. */
function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className={`inline-flex items-center gap-2 text-xs font-medium text-cda-text2 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-cda-blue" : "bg-cda-border"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
      {label}
    </label>
  );
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
      <label className="text-xs font-medium" style={{ color: "#475569" }}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={rows}
        className="w-full rounded-lg border-[1.5px] border-[#cbd5e1] bg-[#f8fafc] px-3 py-2 text-sm text-cda-text outline-none transition-colors placeholder:text-[#94a3b8] focus:border-[#2563eb] focus:bg-white focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] disabled:bg-cda-bg disabled:text-cda-text3"
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

/** Conteúdo do dia ATIVO (1 por vez, escolhido pelas abas Seg/Ter/Qua/Qui/
 * Sex) — pedido do dono, redesign v4: era um acordeão com os 5 dias
 * empilhados, agora é 1 dia por vez, campos em coluna única e largura
 * total (exceção explícita do dono ao mockup, que mostrava grid de 2
 * colunas: "os campos de texto precisam de largura total pra escrever
 * parágrafos longos confortavelmente"). Cada seção é um SecaoCampo com a
 * cor de identidade do bloco (mesma cor sempre, ver mockup Gemini v4). */
function DiaConteudo({
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
  const c = dia.conteudo;

  function atualizarConteudo(patch: Partial<ConteudoDiaPlanejamento>) {
    atualizar({ conteudo: { ...c, ...patch } });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-cda-text">
          {LABEL_DIA[indice]} <span className="font-normal text-cda-text3">({formatarDiaMes(dia.data)})</span>
        </h3>
        <div className="w-full sm:w-52">
          <Select value={dia.tipo} onChange={(e) => atualizar({ tipo: e.target.value as TipoDia })} disabled={!podeEditar}>
            <option value="TEMATICA">Temática do dia</option>
            <option value="CONTEXTO">Contexto organizado</option>
          </Select>
        </div>
      </div>
      <p className="-mt-2 text-xs text-cda-text3">
        <span className="font-medium text-cda-text2">Temática do dia:</span> assunto novo, com momento inicial e
        fundamental. <span className="font-medium text-cda-text2">Contexto organizado:</span> ambiente livre, com roda
        de conversa.
      </p>

      {dia.tipo === "TEMATICA" ? (
        <>
          <SecaoCampo titulo="Temática do dia" cor="var(--cda-blue)" fundo="#eff6ff">
            <Campo label="Temática do dia" value={c.tematicaDia ?? ""} onChange={(v) => atualizarConteudo({ tematicaDia: v })} disabled={!podeEditar} rows={1} />
          </SecaoCampo>
          <SecaoCampo titulo="Momento inicial" cor="var(--cda-teal)" fundo="#f0fdfa">
            <Campo label="Momento inicial" value={c.momentoInicial ?? ""} onChange={(v) => atualizarConteudo({ momentoInicial: v })} disabled={!podeEditar} />
            <Disclosure label="Questionamentos possíveis">
              <Campo
                label="Questionamentos e diálogos possíveis"
                value={c.questionamentosInicial ?? ""}
                onChange={(v) => atualizarConteudo({ questionamentosInicial: v })}
                disabled={!podeEditar}
              />
            </Disclosure>
          </SecaoCampo>
          <SecaoCampo titulo="Momento fundamental" cor="var(--cda-indigo)" fundo="#eef2ff" destaque>
            <Campo label="Momento fundamental" value={c.momentoFundamental ?? ""} onChange={(v) => atualizarConteudo({ momentoFundamental: v })} disabled={!podeEditar} />
            <Disclosure label="Questionamentos possíveis">
              <Campo
                label="Questionamentos e diálogos possíveis"
                value={c.questionamentosFundamental ?? ""}
                onChange={(v) => atualizarConteudo({ questionamentosFundamental: v })}
                disabled={!podeEditar}
              />
            </Disclosure>
          </SecaoCampo>
        </>
      ) : (
        <>
          <SecaoCampo titulo="Contexto organizado" cor="var(--cda-blue)" fundo="#eff6ff">
            <Campo label="Contexto organizado" value={c.contextoOrganizado ?? ""} onChange={(v) => atualizarConteudo({ contextoOrganizado: v })} disabled={!podeEditar} rows={1} />
          </SecaoCampo>
          <SecaoCampo titulo="Roda de conversa" cor="var(--cda-teal)" fundo="#f0fdfa">
            <Campo label="Roda de conversa" value={c.rodaDeConversa ?? ""} onChange={(v) => atualizarConteudo({ rodaDeConversa: v })} disabled={!podeEditar} />
            <Disclosure label="Questionamentos possíveis">
              <Campo
                label="Questionamentos e diálogos possíveis"
                value={c.questionamentosRoda ?? ""}
                onChange={(v) => atualizarConteudo({ questionamentosRoda: v })}
                disabled={!podeEditar}
              />
            </Disclosure>
          </SecaoCampo>
          <SecaoCampo titulo="Organização do contexto" cor="var(--cda-indigo)" fundo="#eef2ff" destaque>
            <Campo label="Organização do contexto" value={c.organizacaoContexto ?? ""} onChange={(v) => atualizarConteudo({ organizacaoContexto: v })} disabled={!podeEditar} />
            <Disclosure label="Questionamentos possíveis">
              <Campo
                label="Questionamentos e diálogos possíveis"
                value={c.questionamentosContexto ?? ""}
                onChange={(v) => atualizarConteudo({ questionamentosContexto: v })}
                disabled={!podeEditar}
              />
            </Disclosure>
          </SecaoCampo>
        </>
      )}

      <SecaoCampo titulo="Momento final" cor="var(--cda-purple)" fundo="#faf5ff" opcional>
        <Campo label="Momento final (opcional)" value={c.momentoFinal ?? ""} onChange={(v) => atualizarConteudo({ momentoFinal: v })} disabled={!podeEditar} />
        <p className="text-xs text-cda-text3">Registro de fechamento do dia — deixe em branco se não se aplicar.</p>
        <Disclosure label="Questionamentos possíveis">
          <Campo
            label="Questionamentos e diálogos possíveis"
            value={c.questionamentosFinal ?? ""}
            onChange={(v) => atualizarConteudo({ questionamentosFinal: v })}
            disabled={!podeEditar}
          />
        </Disclosure>
      </SecaoCampo>

      <SecaoCampo titulo="Folhas imprimíveis" cor="var(--cda-text3)" fundo="#f8fafc" opcional>
        <p className="-mt-1 text-xs text-cda-text3">Só se esse dia tiver uma folha pra imprimir.</p>
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
      </SecaoCampo>

      {/* Só-leitura — pedido do dono, mockup do Gemini: puxa direto do
          Horário fixo cadastrado da turma (a API já resolve isso, ver
          GET /api/planejamentos), a professora não digita de novo aqui.
          Pra mudar, é na aba Horário fixo, não campo a campo. */}
      <div className="flex items-center gap-1.5 rounded-lg border border-cda-border bg-cda-bg px-3 py-2 text-sm text-cda-text3">
        <CalendarClock className="h-3.5 w-3.5 shrink-0" />
        {dia.especializadas ? `Especializada: ${dia.especializadas}` : "Nenhuma especializada cadastrada pra esse dia"}
      </div>
    </div>
  );
}

/** Uma semana — carrega e salva sozinha (achado real, set/2026: o documento é
 * organizado em semanas dentro do mês/projeto). Redesign v4 (mockup Gemini,
 * pedido do dono): antes era um card de acordeão numa lista com as outras
 * semanas; agora é sempre o CONTEÚDO INTEIRO do painel direito — só a semana
 * selecionada no painel esquerdo (PlanejamentoMensalClient) é montada aqui. */
export function SemanaPlanejamento({
  turmaId,
  projetos,
  semanaIso,
  onSalvo,
}: {
  turmaId: string;
  projetos: Projeto[];
  semanaIso: string;
  /** Avisa o mês (PlanejamentoMensalClient) que essa semana salvou algo —
   * pro strip de progresso e o card dessa semana no painel esquerdo
   * atualizarem sem precisar trocar de semana e voltar. */
  onSalvo?: () => void;
}) {
  const [carregado, setCarregado] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [projetoId, setProjetoId] = useState<string>("");
  const [projetoJustificativa, setProjetoJustificativa] = useState("");
  const [materiais, setMateriais] = useState("");
  const [tardeCulturalApresentacao, setTardeCulturalApresentacao] = useState("");
  const [tardeCulturalMateriais, setTardeCulturalMateriais] = useState("");
  const [dias, setDias] = useState<DiaForm[]>([]);
  const [diaAtivo, setDiaAtivo] = useState(0);
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
  // Barra de contexto compacta (Fix do mockup v4) — Materiais e Tarde
  // Cultural nascem recolhidos, só o resumo aparece na barra; clicar abre o(s)
  // campo(s) de verdade. Tarde Cultural também funciona como toggle: quando
  // já tem conteúdo salvo, os campos nascem visíveis (não some o que já tem).
  const [mostrarMateriais, setMostrarMateriais] = useState(false);
  const [mostrarTardeCultural, setMostrarTardeCultural] = useState(false);
  const [ultimoSalvoEm, setUltimoSalvoEm] = useState<Date | null>(null);
  // "Sujo" = tem edição não salva — liga o autosave (pedido do dono: "salvar
  // automaticamente a cada 30s, sem precisar clicar", toast discreto, sem
  // interromper a digitação). Só liga DEPOIS do carregamento inicial —
  // preencher os campos com o que veio da API não conta como "edição".
  const [sujo, setSujo] = useState(false);

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
      setMostrarTardeCultural(!!(data.tardeCulturalApresentacao || data.tardeCulturalMateriais));
      setDias(data.dias);
      setDiaAtivo(0);
      setStatus(data.status ?? "RASCUNHO");
      setComentarioCoordenadora(data.comentarioCoordenadora ?? "");
      setComentarioAutorNome(data.comentarioAutorNome ?? "");
      setLiComentarioEm(data.liComentarioEm ?? null);
      setSouCoordenadora(!!data.souCoordenadora);
      setPodeEditar(data.podeEditar);
      setSujo(false);
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
    setSujo(true);
  }

  async function salvar(novoStatus?: "ENVIADO" | "RASCUNHO", opts?: { silencioso?: boolean }) {
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
      // Autosave falhar não interrompe a professora com erro em vermelho na
      // tela — só não avisa nada e tenta de novo no próximo ciclo de 30s.
      if (opts?.silencioso) return;
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Não foi possível salvar o planejamento.");
      return;
    }
    setSujo(false);
    setUltimoSalvoEm(new Date());
    if (novoStatus) setStatus(novoStatus);
    if (novoStatus === "ENVIADO") {
      setComentarioCoordenadora("");
      setLiComentarioEm(null);
    }
    onSalvo?.();
    if (opts?.silencioso) {
      showToast("Rascunho salvo automaticamente.");
      return;
    }
    showToast(novoStatus === "ENVIADO" ? "Planejamento da semana finalizado." : novoStatus === "RASCUNHO" ? "Planejamento reaberto." : "Dia salvo.");
  }

  // Autosave a cada 30s — só quando tem edição não salva (evita toast/POST
  // repetido sem necessidade). Intervalo fixo criado 1x (não reinicia a cada
  // tecla); lê sempre o estado mais atual via ref, pro closure nunca ficar
  // desatualizado.
  const maisRecenteRef = useRef({ sujo, podeEditar, salvando, salvar });
  useEffect(() => {
    maisRecenteRef.current = { sujo, podeEditar, salvando, salvar };
  });
  useEffect(() => {
    const id = setInterval(() => {
      const atual = maisRecenteRef.current;
      if (atual.sujo && atual.podeEditar && !atual.salvando) atual.salvar(undefined, { silencioso: true });
    }, 30000);
    return () => clearInterval(id);
  }, []);

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

  if (carregando && !carregado) {
    return <p className="text-sm text-cda-text3">Carregando semana...</p>;
  }

  const diaAtual = dias[diaAtivo];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-cda-text">
            Semana de {formatarDiaMes(semanaIso)} a {formatarDiaMes(somarDias(semanaIso, 4))}
          </h2>
          <Link
            href={`/pedagogico/planejamento/${turmaId}/roteiro?semana=${semanaIso}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-cda-blue hover:underline"
          >
            <ScrollText className="h-3.5 w-3.5" />
            Ver roteiro dessa semana
          </Link>
        </div>
        {carregado && (
          <div className="mt-3 overflow-x-auto pb-1">
            <PlanejamentoStepper status={status} />
          </div>
        )}
      </div>

      {comentarioCoordenadora && (
        <div className={`rounded-lg border p-3 ${status === "DEVOLVIDO" ? "border-cda-red/30 bg-cda-red/5" : "border-cda-border bg-cda-bg"}`}>
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

      {/* Barra de contexto compacta — pedido do dono, redesign v4: Projeto +
          Materiais + Tarde Cultural em 1 linha só, em vez de campos grandes
          competindo com os 5 dias por atenção. */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-cda-border bg-white p-3">
        <div className="min-w-[200px] flex-1">
          <Select
            value={projetoId}
            onChange={(e) => {
              setProjetoId(e.target.value);
              setSujo(true);
            }}
            disabled={!podeEditar}
          >
            <option value="">Sem projeto vinculado</option>
            {projetos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} {p.ativo ? "(ativo)" : ""}
              </option>
            ))}
          </Select>
        </div>
        <button
          type="button"
          onClick={() => setMostrarMateriais((v) => !v)}
          className="max-w-[280px] truncate rounded-lg border border-cda-border bg-cda-bg px-3 py-2 text-left text-xs text-cda-text2 hover:bg-cda-border/40"
        >
          <span className="font-medium">Materiais: </span>
          {materiais ? materiais : <span className="text-cda-text3">não definidos</span>}
        </button>
        <Toggle checked={mostrarTardeCultural} onChange={setMostrarTardeCultural} label="Tarde Cultural" disabled={!podeEditar && !mostrarTardeCultural} />
      </div>
      {projetoJustificativa && (
        <p className="-mt-2 rounded-lg border border-cda-border bg-cda-bg px-3 py-2 text-xs text-cda-text3">
          <span className="font-medium text-cda-text2">Justificativa do projeto: </span>
          {projetoJustificativa}
        </p>
      )}
      {mostrarMateriais && (
        <Campo
          label="Materiais da semana"
          value={materiais}
          onChange={(v) => {
            setMateriais(v);
            setSujo(true);
          }}
          disabled={!podeEditar}
          rows={2}
        />
      )}
      {mostrarTardeCultural && (
        <div className="flex flex-col gap-3 rounded-lg border border-cda-border p-3">
          <p className="text-xs font-medium text-cda-text2">OBS: Em caso de Tarde Cultural</p>
          <Campo
            label="Apresentação da turma — o que será feito, se for o dia da turma apresentar"
            value={tardeCulturalApresentacao}
            onChange={(v) => {
              setTardeCulturalApresentacao(v);
              setSujo(true);
            }}
            disabled={!podeEditar}
            rows={2}
          />
          <Campo
            label="Lista de materiais necessários (quantidade, item, tamanho, cor, detalhes)"
            value={tardeCulturalMateriais}
            onChange={(v) => {
              setTardeCulturalMateriais(v);
              setSujo(true);
            }}
            disabled={!podeEditar}
            rows={2}
          />
        </div>
      )}

      {/* Abas por dia — pedido do dono, redesign v4: 1 dia por vez em vez de
          acordeão com os 5 empilhados. */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {dias.map((dia, i) => {
          const ativo = i === diaAtivo;
          return (
            <button
              key={dia.data}
              type="button"
              onClick={() => setDiaAtivo(i)}
              className={`flex shrink-0 items-center gap-1.5 rounded-t-lg border border-b-2 px-3 py-2 text-xs transition-colors ${
                ativo
                  ? "border-transparent border-b-[#2563eb] font-semibold"
                  : "border-cda-border bg-white font-medium text-cda-text2 hover:bg-cda-bg"
              }`}
              style={ativo ? { backgroundColor: "#eff6ff", color: "#2563eb" } : undefined}
            >
              <PontoEstadoDia estado={estadoDoDia(dia.tipo, dia.conteudo)} size="xs" />
              {LABEL_DIA_CURTO[i]} {formatarDiaMes(dia.data).slice(0, 2)}
            </button>
          );
        })}
      </div>

      {diaAtual && (
        <DiaConteudo turmaId={turmaId} indice={diaAtivo} dia={diaAtual} atualizar={(patch) => atualizarDia(diaAtivo, patch)} podeEditar={podeEditar} />
      )}

      {erro && <p className="text-sm text-cda-red">{erro}</p>}

      {podeEditar && (
        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-cda-border bg-cda-bg/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <span className="flex items-center gap-1.5 text-xs" style={{ color: "#64748b" }}>
            <Clock className="h-3.5 w-3.5" />
            {ultimoSalvoEm ? `Salvo às ${formatarHora(ultimoSalvoEm)}` : "Ainda não salvo nessa visita"}
          </span>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => salvar()} loading={salvando} disabled={carregando}>
              <NotebookPen className="h-3.5 w-3.5" />
              Salvar este dia agora
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
                Finalizar e enviar semana
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
        <p className="text-xs text-cda-text3">Só a professora regente dessa turma edita o planejamento.</p>
      )}

      {souCoordenadora && status !== "RASCUNHO" && (
        <div className="rounded-lg border border-cda-blue/20 bg-cda-blue/5 p-4">
          <p className="mb-1 text-xs font-semibold text-cda-text2">Revisão da coordenadora</p>
          <p className="mb-3 text-xs text-cda-text3">Aprove se está tudo certo, ou devolva explicando o que precisa ajustar.</p>
          {mostrarDevolver && (
            <textarea
              value={comentarioForm}
              onChange={(e) => setComentarioForm(e.target.value)}
              placeholder="O que precisa corrigir?"
              rows={3}
              className="mb-2 w-full rounded-lg border-[1.5px] border-[#cbd5e1] bg-[#f8fafc] px-3 py-2 text-sm text-cda-text outline-none transition-colors placeholder:text-[#94a3b8] focus:border-[#2563eb] focus:bg-white focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
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
  );
}
