"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { CATEGORIAS_DOCUMENTO } from "@/lib/utils";

export function NovoDocumentoModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/documentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: fd.get("titulo"),
        categoria: fd.get("categoria"),
        link: fd.get("link"),
        validade: fd.get("validade") || null,
        observacao: fd.get("observacao") || null,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível salvar o documento.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Novo documento
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo documento institucional">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Título" name="titulo" required placeholder="Alvará de Funcionamento" />
          <Select label="Categoria" name="categoria" required defaultValue="">
            <option value="" disabled>
              Selecione a categoria
            </option>
            {CATEGORIAS_DOCUMENTO.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Input label="Link (Google Drive)" name="link" type="url" required placeholder="https://drive.google.com/..." />
          <Input label="Validade (opcional)" name="validade" type="date" />
          <Input label="Observação (opcional)" name="observacao" placeholder="Ex.: renovar até..." />
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
