"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { MuralAviso } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function EditarAvisoModal({ aviso, onClose }: { aviso: MuralAviso | null; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!aviso) return;
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/mural/${aviso.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: fd.get("titulo"),
        conteudo: fd.get("conteudo"),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível salvar o aviso.");
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <Modal open={!!aviso} onClose={onClose} title="Editar aviso">
      {aviso && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Título" name="titulo" required defaultValue={aviso.titulo} />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-cda-text2">Conteúdo</label>
            <textarea
              name="conteudo"
              required
              rows={4}
              defaultValue={aviso.conteudo}
              className="w-full rounded-lg border border-cda-border bg-white px-3 py-2 text-sm text-cda-text outline-none transition-colors focus:border-cda-blue"
            />
          </div>
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Salvar
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
