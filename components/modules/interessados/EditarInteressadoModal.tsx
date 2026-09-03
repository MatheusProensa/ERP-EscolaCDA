"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Turma } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { InteressadoFormFields } from "./InteressadoFormFields";
import type { ItemInteressado } from "./types";

export function EditarInteressadoModal({
  item,
  turmas,
  onClose,
}: {
  item: ItemInteressado | null;
  turmas: Turma[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!item) return;
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/interessados/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nomeCrianca: fd.get("nomeCrianca"),
        dataNascimento: fd.get("dataNascimento") || null,
        nomeResponsavel: fd.get("nomeResponsavel"),
        parentescoContato: fd.get("parentescoContato") || null,
        telefoneResponsavel: fd.get("telefoneResponsavel"),
        emailResponsavel: fd.get("emailResponsavel") || null,
        turmaDesejadaId: fd.get("turmaDesejadaId") || null,
        interesseTexto: fd.get("interesseTexto") || null,
        dataPrimeiroContato: fd.get("dataPrimeiroContato") || null,
        dataVisita: fd.get("dataVisita") || null,
        oQueBusca: fd.get("oQueBusca") || null,
        observacoes: fd.get("observacoes") || null,
        status: fd.get("status") || undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível salvar.");
      return;
    }
    onClose();
    router.refresh();
  }

  async function excluir() {
    if (!item || !confirm(`Remover ${item.nomeCrianca} da lista de interessados?`)) return;
    setLoading(true);
    const res = await fetch(`/api/interessados/${item.id}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      showToast("Não foi possível remover. Tente de novo.", "error");
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <Modal open={!!item} onClose={onClose} title="Editar interessado" className="max-w-xl">
      {item && (
        <form onSubmit={salvar} className="flex flex-col gap-4">
          <InteressadoFormFields turmas={turmas} inicial={item} />
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="ghost" className="text-cda-red hover:bg-cda-red/10" onClick={excluir} disabled={loading}>
              Remover
            </Button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" loading={loading}>
                Salvar
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
