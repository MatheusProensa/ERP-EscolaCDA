"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, NotebookPen } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { showToast } from "@/components/ui/Toast";

type Tema = { id: string; titulo: string; estrutura: string | null };
type DiaForm = { data: string; conteudo: string };

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

/** Formulário semanal do planejamento — a professora regente escolhe (ou
 * troca) o tema da semana e preenche o que vai ter em cada dia útil. O
 * roteiro do tema aparece ao lado como guia (achado confirmado, out/2026:
 * "facilitar em um tema já pronto layout, aí elas só põe o dia e o que vai
 * ter"). Navega semana a semana com os botões, sem precisar de calendário. */
export function PlanejamentoSemanalClient({
  turmaId,
  temas,
  semanaInicialIso,
}: {
  turmaId: string;
  temas: Tema[];
  semanaInicialIso: string;
}) {
  const [semana, setSemana] = useState(semanaInicialIso);
  const [temaId, setTemaId] = useState<string>("");
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
      setTemaId(data.temaId ?? "");
      setDias(data.dias);
      setPodeEditar(data.podeEditar);
      setCarregando(false);
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, [turmaId, semana]);

  const temaSelecionado = temas.find((t) => t.id === temaId);

  function atualizarDia(index: number, conteudo: string) {
    setDias((atual) => atual.map((d, i) => (i === index ? { ...d, conteudo } : d)));
  }

  async function salvar() {
    setSalvando(true);
    setErro("");
    const res = await fetch("/api/planejamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turmaId, semana, temaId: temaId || null, dias }),
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
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <Card className="flex-1 p-5">
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

        <div className="mb-4">
          <Select label="Tema da semana" value={temaId} onChange={(e) => setTemaId(e.target.value)} disabled={!podeEditar}>
            <option value="">Sem tema definido</option>
            {temas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.titulo}
              </option>
            ))}
          </Select>
        </div>

        {carregando ? (
          <p className="text-sm text-cda-text3">Carregando...</p>
        ) : (
          <div className="flex flex-col gap-4">
            {dias.map((dia, i) => (
              <div key={dia.data} className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-cda-text2">
                  {LABEL_DIA[i]} <span className="text-cda-text3">({formatarDiaMes(dia.data)})</span>
                </label>
                <textarea
                  value={dia.conteudo}
                  onChange={(e) => atualizarDia(i, e.target.value)}
                  disabled={!podeEditar}
                  rows={2}
                  placeholder="O que vai ter nesse dia..."
                  className="w-full rounded-lg border border-cda-border bg-white px-3 py-2 text-sm text-cda-text outline-none transition-colors focus:border-cda-blue disabled:bg-cda-bg disabled:text-cda-text3"
                />
              </div>
            ))}
          </div>
        )}

        {erro && <p className="mt-3 text-sm text-cda-red">{erro}</p>}

        {podeEditar && (
          <div className="mt-4 flex justify-end">
            <Button onClick={salvar} loading={salvando} disabled={carregando}>
              Salvar planejamento
            </Button>
          </div>
        )}
        {!carregando && !podeEditar && (
          <p className="mt-3 text-xs text-cda-text3">Só a professora regente dessa turma edita o planejamento.</p>
        )}
      </Card>

      {temaSelecionado?.estrutura && (
        <Card
          className="w-full lg:w-72 lg:shrink-0"
          title={
            <div className="flex items-center gap-2">
              <NotebookPen className="h-4 w-4 text-cda-blue" />
              Roteiro do tema
            </div>
          }
        >
          <p className="whitespace-pre-line px-5 py-4 text-xs text-cda-text2">{temaSelecionado.estrutura}</p>
        </Card>
      )}
    </div>
  );
}
