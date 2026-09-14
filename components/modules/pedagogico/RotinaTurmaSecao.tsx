"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Plus, Trash2, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { IconButton } from "@/components/ui/IconButton";
import { showToast } from "@/components/ui/Toast";

type Momento = { id: string | null; nome: string; descricao: string };

/** Planejamento do Cotidiano — a rotina fixa da turma (achado real, set/2026,
 * documento MODELO_PLANEJAMENTO_CDA: "Chegada/Acolhida", "Lanche", "Pracinha",
 * "Soninho" etc., cada um com como acontece, onde, materiais, rituais).
 * Diferente do planejamento semanal: não muda toda semana, só quando a
 * rotina em si muda — por isso fica aqui, separado, não dentro de cada mês. */
export function RotinaTurmaSecao({ turmaId, podeEditar }: { turmaId: string; podeEditar: boolean }) {
  const [momentos, setMomentos] = useState<Momento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      setCarregando(true);
      const res = await fetch(`/api/rotina-turma?turmaId=${turmaId}`);
      if (cancelado) return;
      if (res.ok) {
        const data = await res.json();
        setMomentos(data.momentos);
      }
      setCarregando(false);
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, [turmaId]);

  function atualizar(i: number, patch: Partial<Momento>) {
    setMomentos((atual) => atual.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }

  function adicionar() {
    setMomentos((atual) => [...atual, { id: null, nome: "", descricao: "" }]);
  }

  function remover(i: number) {
    setMomentos((atual) => atual.filter((_, idx) => idx !== i));
  }

  async function salvar() {
    setSalvando(true);
    setErro("");
    const res = await fetch("/api/rotina-turma", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turmaId, momentos }),
    });
    setSalvando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Não foi possível salvar a rotina.");
      return;
    }
    showToast("Rotina da turma salva.");
  }

  if (carregando) return null;

  return (
    <Card>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-cda-blue" />
          <span className="text-sm font-semibold text-cda-text">Planejamento do Cotidiano (rotina da turma)</span>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-cda-text3 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>

      {aberto && (
        <div className="border-t border-cda-border p-5">
          <p className="mb-4 text-xs text-cda-text3">
            Como cada momento do dia acontece na sua turma (chegada, lanche, pracinha, soninho...). Preenche 1 vez, só ajusta
            quando a rotina em si muda — diferente do planejamento semanal.
          </p>
          <div className="flex flex-col gap-3">
            {momentos.map((m, i) => (
              <div key={m.id ?? `novo-${i}`} className="flex flex-col gap-2 rounded-lg border border-cda-border p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Nome do momento (ex.: Chegada/Acolhida)"
                      value={m.nome}
                      onChange={(e) => atualizar(i, { nome: e.target.value })}
                      disabled={!podeEditar}
                    />
                  </div>
                  {podeEditar && (
                    <IconButton icon={Trash2} label="Remover momento" variant="danger" size="sm" onClick={() => remover(i)} />
                  )}
                </div>
                <textarea
                  placeholder="Como acontece, onde, quais ações, materiais, rituais..."
                  value={m.descricao}
                  onChange={(e) => atualizar(i, { descricao: e.target.value })}
                  disabled={!podeEditar}
                  rows={3}
                  className="w-full rounded-lg border border-cda-border bg-white px-3 py-2 text-sm text-cda-text outline-none transition-colors focus:border-cda-blue disabled:bg-cda-bg disabled:text-cda-text3"
                />
              </div>
            ))}
          </div>

          {podeEditar && (
            <Button type="button" variant="outline" size="sm" onClick={adicionar} className="mt-3">
              <Plus className="h-3.5 w-3.5" />
              Adicionar momento
            </Button>
          )}

          {erro && <p className="mt-3 text-sm text-cda-red">{erro}</p>}

          {podeEditar && (
            <div className="mt-4 flex justify-end">
              <Button onClick={salvar} loading={salvando}>
                Salvar rotina
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
