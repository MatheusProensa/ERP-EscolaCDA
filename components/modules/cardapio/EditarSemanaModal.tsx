"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
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
  const [loading, setLoading] = useState(false);

  // O modal fica sempre montado (controlado pelo pai) — sem isso o estado do
  // bloco anterior vazava pro próximo ao trocar de "Editar" sem fechar antes.
  useEffect(() => {
    if (aberto) setDias(diasIniciais.map((d) => ({ ...d, refeicoes: d.refeicoes.map((r) => ({ ...r })) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, blocoId, campo]);

  function setRefeicao(diaIdx: number, refIdx: number, campoRef: "horario" | "itens", valor: string) {
    setDias((prev) =>
      prev.map((d, i) =>
        i !== diaIdx
          ? d
          : { ...d, refeicoes: d.refeicoes.map((r, j) => (j !== refIdx ? r : { ...r, [campoRef]: valor })) }
      )
    );
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/cardapio/${blocoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campo, dias }),
    });
    setLoading(false);
    if (!res.ok) {
      showToast("Não foi possível salvar. Tente de novo.", "error");
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <Modal open={aberto} onClose={onClose} title={tituloModal} className="max-w-3xl">
      <form onSubmit={salvar} className="flex flex-col gap-5">
        <div className="flex max-h-[65vh] flex-col gap-5 overflow-y-auto pr-1">
          {dias.map((dia, diaIdx) => (
            <div key={dia.dia} className="rounded-lg border border-cda-border p-3.5">
              <p className="mb-3 text-sm font-semibold text-cda-text">
                {DIA_LABEL_CARDAPIO[dia.dia] ?? dia.dia}
                {dia.datas.length > 0 && (
                  <span className="ml-1.5 font-normal text-cda-text3">({dia.datas.join(" · ")})</span>
                )}
              </p>
              <div className="flex flex-col gap-3">
                {dia.refeicoes.map((ref, refIdx) => (
                  <div key={ref.tipo} className="flex flex-col gap-1.5 sm:flex-row sm:items-start">
                    <div className="flex shrink-0 gap-1.5 sm:w-[168px]">
                      <span className="pt-2 text-xs font-medium text-cda-text2">{ref.label}</span>
                    </div>
                    <div className="flex flex-1 gap-2">
                      <input
                        value={ref.horario}
                        onChange={(e) => setRefeicao(diaIdx, refIdx, "horario", e.target.value)}
                        placeholder="Hora"
                        className="h-9 w-20 shrink-0 rounded-lg border border-cda-border bg-white px-2.5 text-sm text-cda-text outline-none focus:border-cda-blue"
                      />
                      <textarea
                        value={ref.itens}
                        onChange={(e) => setRefeicao(diaIdx, refIdx, "itens", e.target.value)}
                        rows={3}
                        placeholder="Um item por linha"
                        className="flex-1 rounded-lg border border-cda-border bg-white px-2.5 py-1.5 text-sm text-cda-text outline-none focus:border-cda-blue"
                      />
                    </div>
                  </div>
                ))}
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
