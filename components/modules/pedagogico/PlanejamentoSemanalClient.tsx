"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronDown, NotebookPen, ScrollText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { showToast } from "@/components/ui/Toast";
import type { ConteudoDiaPlanejamento } from "@/lib/planejamento";

type TipoDia = "TEMATICA" | "CONTEXTO";
type Projeto = { id: string; nome: string; ativo: boolean };
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

/** Um dia do planejamento — estrutura real do documento MODELO_PLANEJAMENTO
 * (achado real, set/2026): alterna entre "Temática do dia" (temática +
 * momento inicial/fundamental) e "Contexto organizado" (contexto + roda de
 * conversa + organização), com o "Momento final" (registro) comum aos 2.
 * Recolhido por padrão pra não virar uma tela gigante com os 5 dias abertos
 * ao mesmo tempo — abre um resumo do que já tem preenchido. */
function DiaPlanejamento({
  indice,
  dia,
  atualizar,
  podeEditar,
}: {
  indice: number;
  dia: DiaForm;
  atualizar: (patch: Partial<DiaForm>) => void;
  podeEditar: boolean;
}) {
  const [aberto, setAberto] = useState(indice === 0);
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
        </div>
      )}
    </div>
  );
}

/** Formulário semanal do planejamento — a professora regente preenche cada
 * dia dentro do projeto pedagógico ativo da turma. Navega semana a semana
 * com os botões, sem precisar de calendário. Estrutura de cada dia copiada
 * do documento real da escola (ver DiaPlanejamento acima). */
export function PlanejamentoSemanalClient({
  turmaId,
  projetos,
  semanaInicialIso,
}: {
  turmaId: string;
  projetos: Projeto[];
  semanaInicialIso: string;
}) {
  const [semana, setSemana] = useState(semanaInicialIso);
  const [projetoId, setProjetoId] = useState<string>("");
  const [materiais, setMateriais] = useState("");
  const [dias, setDias] = useState<DiaForm[]>([]);
  const [podeEditar, setPodeEditar] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      setCarregando(true);
      setErro("");
      const res = await fetch(`/api/planejamentos?turmaId=${turmaId}&semana=${semana}`);
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
      setPodeEditar(data.podeEditar);
      setCarregando(false);
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, [turmaId, semana]);

  function atualizarDia(index: number, patch: Partial<DiaForm>) {
    setDias((atual) => atual.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  async function salvar() {
    setSalvando(true);
    setErro("");
    const res = await fetch("/api/planejamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turmaId, semana, projetoId: projetoId || null, materiais, dias }),
    });
    setSalvando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Não foi possível salvar o planejamento.");
      return;
    }
    showToast("Planejamento da semana salvo.");
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setSemana((s) => somarDias(s, -7))}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-cda-border text-cda-text2 hover:bg-cda-bg"
          aria-label="Semana anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-cda-text">
          Semana de {formatarDiaMes(semana)} a {formatarDiaMes(somarDias(semana, 4))}
        </span>
        <button
          type="button"
          onClick={() => setSemana((s) => somarDias(s, 7))}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-cda-border text-cda-text2 hover:bg-cda-bg"
          aria-label="Próxima semana"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 flex justify-end">
        <Link href={`/pedagogico/planejamento/${turmaId}/roteiro?semana=${semana}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-cda-blue hover:underline">
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
              <DiaPlanejamento key={dia.data} indice={i} dia={dia} atualizar={(patch) => atualizarDia(i, patch)} podeEditar={podeEditar} />
            ))}
          </div>
        </>
      )}

      {erro && <p className="mt-3 text-sm text-cda-red">{erro}</p>}

      {podeEditar && (
        <div className="mt-4 flex justify-end">
          <Button onClick={salvar} loading={salvando} disabled={carregando}>
            <NotebookPen className="h-3.5 w-3.5" />
            Salvar planejamento
          </Button>
        </div>
      )}
      {!carregando && !podeEditar && (
        <p className="mt-3 text-xs text-cda-text3">Só a professora regente dessa turma edita o planejamento.</p>
      )}
    </Card>
  );
}
