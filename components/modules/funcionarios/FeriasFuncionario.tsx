"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plane, Plus, Trash2 } from "lucide-react";
import type { Ferias } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatarData } from "@/lib/utils";

export function FeriasFuncionario({ funcionarioId, ferias }: { funcionarioId: string; ferias: Ferias[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<"novo" | Ferias | null>(null);
  const [loading, setLoading] = useState(false);
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const editando = modal && modal !== "novo" ? modal : null;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      dataInicio: fd.get("dataInicio"),
      dataFim: fd.get("dataFim"),
      tipo: fd.get("tipo"),
    };

    const res = editando
      ? await fetch(`/api/ferias/${editando.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/ferias", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ funcionarioId, ...payload }),
        });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível salvar as férias.");
      return;
    }

    setModal(null);
    router.refresh();
  }

  async function handleRemover(id: string) {
    setRemovendoId(id);
    await fetch(`/api/ferias/${id}`, { method: "DELETE" });
    setRemovendoId(null);
    router.refresh();
  }

  function dataInput(d?: Date) {
    return d ? new Date(d).toISOString().slice(0, 10) : "";
  }

  return (
    <>
      <Card
        title="Férias e recesso"
        action={
          <Button size="sm" variant="outline" onClick={() => setModal("novo")}>
            <Plus className="h-3.5 w-3.5" />
            Lançar período
          </Button>
        }
      >
        <div className="flex flex-col divide-y divide-cda-border">
          {ferias.length === 0 && (
            <p className="px-5 py-6 text-center text-sm text-cda-text3">Nenhum período de férias registrado.</p>
          )}
          {ferias.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cda-blue/10">
                  <Plane className="h-4 w-4 text-cda-blue" />
                </div>
                <div>
                  <p className="text-sm font-medium text-cda-text">
                    {formatarData(f.dataInicio)} a {formatarData(f.dataFim)}
                  </p>
                  <p className="text-xs text-cda-text3">
                    {f.dias} dia(s){f.tipo ? ` · ${f.tipo}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setModal(f)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-cda-text2 hover:bg-cda-bg"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleRemover(f.id)}
                  disabled={removendoId === f.id}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-cda-red hover:bg-cda-bg disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={!!modal} onClose={() => setModal(null)} title={editando ? "Editar período de férias" : "Lançar período de férias"}>
        <form key={editando?.id ?? "novo"} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Início" name="dataInicio" type="date" defaultValue={dataInput(editando?.dataInicio)} required />
            <Input label="Fim" name="dataFim" type="date" defaultValue={dataInput(editando?.dataFim)} required />
          </div>
          <Input
            label="Observação (opcional)"
            name="tipo"
            placeholder="1ª parcela, recesso de fim de ano..."
            defaultValue={editando?.tipo ?? ""}
          />
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              {editando ? "Salvar alterações" : "Salvar"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
