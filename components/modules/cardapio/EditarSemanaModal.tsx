"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { showToast } from "@/components/ui/Toast";
import { DIA_LABEL_CARDAPIO } from "./constants";
import type { DiaCardapio } from "./types";

export function EditarSemanaModal({
  aberto,
  onClose,
  blocoId,
  campo,
  tituloModal,
  diasIniciais,
}: {
  aberto: boolean;
  onClose: () => void;
  blocoId: string;
  campo: "impar" | "par";
  tituloModal: string;
  diasIniciais: DiaCardapio[];
}) {
  const router = useRouter();
  const [dias, setDias] = useState<DiaCardapio[]>([]);
  // Texto livre das datas, separado do array — se normalizasse a cada tecla
  // (splitando por "·") o campo ficaria brigando com o que a pessoa está
  // digitando. Só vira array de verdade na hora de salvar.
  const [datasTexto, setDatasTexto] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // O modal fica sempre montado (controlado pelo pai) — sem isso o estado do
  // bloco anterior vazava pro próximo ao trocar de "Editar" sem fechar antes.
  useEffect(() => {
    if (aberto) {
      setDias(diasIniciais.map((d) => ({ ...d, refeicoes: d.refeicoes.map((r) => ({ ...r })) })));
      setDatasTexto(diasIniciais.map((d) => d.datas.join(" · ")));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, blocoId, campo]);

  function setDataTexto(diaIdx: number, valor: string) {
    setDatasTexto((prev) => prev.map((v, i) => (i === diaIdx ? valor : v)));
  }

  // Nome e horário da refeição são os MESMOS nos 5 dias (o "Almoço" é sempre
  // 11:00, não muda de segunda pra terça) — por isso edita uma vez só aqui e
  // aplica nos 5 dias juntos, em vez de repetir o campo em cada dia (isso
  // fazia editar terça não ter efeito nenhum, já que só o valor de segunda
  // aparecia na tabela).
  function setRefeicaoMeta(refIdx: number, campoMeta: "label" | "horario", valor: string) {
    setDias((prev) => prev.map((d) => ({ ...d, refeicoes: d.refeicoes.map((r, j) => (j !== refIdx ? r : { ...r, [campoMeta]: valor })) })));
  }

  // Itens já é por dia mesmo — cardápio de segunda é diferente de terça.
  function setItens(diaIdx: number, refIdx: number, valor: string) {
    setDias((prev) =>
      prev.map((d, i) =>
        i !== diaIdx ? d : { ...d, refeicoes: d.refeicoes.map((r, j) => (j !== refIdx ? r : { ...r, itens: valor })) }
      )
    );
  }

  function adicionarRefeicao() {
    const novoTipo = `EXTRA_${Date.now()}`;
    setDias((prev) => prev.map((d) => ({ ...d, refeicoes: [...d.refeicoes, { tipo: novoTipo, label: "Nova refeição", horario: "", itens: "" }] })));
  }

  function removerRefeicao(refIdx: number) {
    setDias((prev) => prev.map((d) => ({ ...d, refeicoes: d.refeicoes.filter((_, j) => j !== refIdx) })));
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const diasParaSalvar = dias.map((d, i) => ({
      ...d,
      datas: (datasTexto[i] ?? "")
        .split(/[·,]/)
        .map((s) => s.trim())
        .filter(Boolean),
    }));
    const res = await fetch(`/api/cardapio/${blocoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campo, dias: diasParaSalvar }),
    });
    setLoading(false);
    if (!res.ok) {
      showToast("Não foi possível salvar. Tente de novo.", "error");
      return;
    }
    onClose();
    router.refresh();
  }

  const refeicoesBase = dias[0]?.refeicoes ?? [];

  return (
    <Modal open={aberto} onClose={onClose} title={tituloModal} className="max-w-3xl">
      <form onSubmit={salvar} className="flex flex-col gap-5">
        <div className="flex max-h-[65vh] flex-col gap-5 overflow-y-auto pr-1">
          <div className="rounded-lg border border-cda-border p-3.5">
            <p className="mb-3 text-sm font-semibold text-cda-text">Refeições da semana</p>
            <p className="mb-3 text-xs text-cda-text3">
              Nome e horário valem pros 5 dias — só o que come em cada dia (embaixo) muda.
            </p>
            <div className="flex flex-col gap-2">
              {refeicoesBase.map((ref, refIdx) => (
                <div key={ref.tipo} className="flex items-center gap-2">
                  <input
                    value={ref.label}
                    onChange={(e) => setRefeicaoMeta(refIdx, "label", e.target.value)}
                    placeholder="Nome da refeição"
                    className="h-9 flex-1 rounded-lg border border-cda-border bg-white px-2.5 text-sm text-cda-text outline-none focus:border-cda-blue"
                  />
                  <input
                    value={ref.horario}
                    onChange={(e) => setRefeicaoMeta(refIdx, "horario", e.target.value)}
                    placeholder="Hora"
                    className="h-9 w-24 shrink-0 rounded-lg border border-cda-border bg-white px-2.5 text-sm text-cda-text outline-none focus:border-cda-blue"
                  />
                  <IconButton icon={Trash2} label="Remover refeição" size="sm" variant="danger" onClick={() => removerRefeicao(refIdx)} />
                </div>
              ))}
              <button
                type="button"
                onClick={adicionarRefeicao}
                className="flex h-9 items-center gap-1.5 self-start rounded-lg border border-dashed border-cda-border px-2.5 text-xs font-medium text-cda-text3 hover:border-cda-blue hover:text-cda-blue"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar refeição
              </button>
            </div>
          </div>

          {dias.map((dia, diaIdx) => (
            <div key={dia.dia} className="rounded-lg border border-cda-border p-3.5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <p className="shrink-0 text-sm font-semibold text-cda-text">{DIA_LABEL_CARDAPIO[dia.dia] ?? dia.dia}</p>
                <input
                  value={datasTexto[diaIdx] ?? ""}
                  onChange={(e) => setDataTexto(diaIdx, e.target.value)}
                  placeholder="Datas do mês (ex.: 10/08 · 24/08)"
                  className="h-7 min-w-[160px] flex-1 rounded-md border border-cda-border bg-white px-2 text-xs text-cda-text3 outline-none focus:border-cda-blue"
                />
              </div>
              <div className="flex flex-col gap-3">
                {dia.refeicoes.map((ref, refIdx) => (
                  <div key={ref.tipo} className="flex flex-col gap-1.5 sm:flex-row sm:items-start">
                    <div className="flex shrink-0 flex-col sm:w-[168px]">
                      <span className="pt-2 text-xs font-medium text-cda-text2">{ref.label || "(sem nome)"}</span>
                      {ref.horario && <span className="text-[11px] text-cda-text3">{ref.horario}</span>}
                    </div>
                    <textarea
                      value={ref.itens}
                      onChange={(e) => setItens(diaIdx, refIdx, e.target.value)}
                      rows={3}
                      placeholder="Um item por linha"
                      className="flex-1 rounded-lg border border-cda-border bg-white px-2.5 py-1.5 text-sm text-cda-text outline-none focus:border-cda-blue"
                    />
                  </div>
                ))}
                {dia.refeicoes.length === 0 && <p className="text-xs text-cda-text3">Nenhuma refeição cadastrada ainda.</p>}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 border-t border-cda-border pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
