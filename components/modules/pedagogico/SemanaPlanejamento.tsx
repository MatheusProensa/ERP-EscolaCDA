"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, NotebookPen, ScrollText, Printer, CheckCircle2, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { showToast } from "@/components/ui/Toast";
import type { ConteudoDiaPlanejamento } from "@/lib/planejamento";

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

  return (
    <div className="rounded-lg border border-cda-border">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-cda-text">
            {LABEL_DIA[indice]} <span className="font-normal text-cda-text3">({formatarDiaMes(dia.data)})</span>
          </p>
          {resumo && <p className="mt-0.5 text-xs text-cda-text3">{resumo}</p>}
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

          <Campo
            label="Momento final — registro do dia (opcional, se não se aplicar deixe em branco)"
            value={c.momentoFinal ?? ""}
            onChange={(v) => atualizarConteudo({ momentoFinal: v })}
            disabled={!podeEditar}
          />
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
  const [projetoId, setProjetoId] = useState<string>("");
  const [materiais, setMateriais] = useState("");
  const [dias, setDias] = useState<DiaForm[]>([]);
  const [status, setStatus] = useState<"RASCUNHO" | "ENVIADO">("RASCUNHO");
  const [podeEditar, setPodeEditar] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

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
      setProjetoId(data.projetoId ?? "");
      setMateriais(data.materiais ?? "");
      setDias(data.dias);
      setStatus(data.status ?? "RASCUNHO");
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
      body: JSON.stringify({ turmaId, semana: semanaIso, projetoId: projetoId || null, materiais, dias, status: novoStatus }),
    });
    setSalvando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Não foi possível salvar o planejamento.");
      return;
    }
    if (novoStatus) setStatus(novoStatus);
    showToast(novoStatus === "ENVIADO" ? "Planejamento da semana finalizado." : novoStatus === "RASCUNHO" ? "Planejamento reaberto." : "Planejamento da semana salvo.");
  }

  const preenchida = carregado && dias.some((d) => Object.keys(d.conteudo).length > 0);

  return (
    <Card className="p-0">
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-cda-text">
          Semana de {formatarDiaMes(semanaIso)} a {formatarDiaMes(somarDias(semanaIso, 4))}
        </span>
        <div className="flex items-center gap-2">
          {carregado && (
            <Badge variant={status === "ENVIADO" ? "success" : preenchida ? "warning" : "neutral"}>
              {status === "ENVIADO" ? "Enviado" : preenchida ? "Rascunho" : "Vazia"}
            </Badge>
          )}
          <ChevronDown className={`h-4 w-4 shrink-0 text-cda-text3 transition-transform ${aberta ? "rotate-180" : ""}`} />
        </div>
      </button>

      {aberta && (
        <div className="border-t border-cda-border p-5">
          <div className="mb-4 flex flex-wrap justify-end gap-x-4 gap-y-1.5">
            <a
              href={`/api/planejamentos/pdf?turmaId=${turmaId}&semana=${semanaIso}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-cda-blue hover:underline"
            >
              <Printer className="h-3.5 w-3.5" />
              Baixar PDF dessa semana
            </a>
            <Link
              href={`/pedagogico/planejamento/${turmaId}/roteiro?semana=${semanaIso}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-cda-blue hover:underline"
            >
              <ScrollText className="h-3.5 w-3.5" />
              Ver roteiro dessa semana
            </Link>
          </div>

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

          {carregando ? (
            <p className="text-sm text-cda-text3">Carregando...</p>
          ) : (
            <>
              <div className="mb-4">
                <Campo label="Materiais da semana" value={materiais} onChange={setMateriais} disabled={!podeEditar} rows={2} />
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
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => salvar()} loading={salvando} disabled={carregando}>
                <NotebookPen className="h-3.5 w-3.5" />
                Salvar planejamento
              </Button>
              {status === "ENVIADO" ? (
                <Button variant="outline" onClick={() => salvar("RASCUNHO")} loading={salvando} disabled={carregando}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reabrir
                </Button>
              ) : (
                <Button onClick={() => salvar("ENVIADO")} loading={salvando} disabled={carregando}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Finalizar
                </Button>
              )}
            </div>
          )}
          {!carregando && !podeEditar && (
            <p className="mt-3 text-xs text-cda-text3">Só a professora regente dessa turma edita o planejamento.</p>
          )}
        </div>
      )}
    </Card>
  );
}
