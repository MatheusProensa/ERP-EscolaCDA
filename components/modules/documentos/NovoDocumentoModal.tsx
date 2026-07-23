"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { CATEGORIAS_DOCUMENTO } from "./categorias";

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
        subcategoria: fd.get("subcategoria"),
        arquivoUrl: fd.get("arquivoUrl"),
        descricao: fd.get("descricao"),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível salvar o documento.");
      return;
    }

    setOpen(false);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Novo documento
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo documento">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Título" name="titulo" required placeholder="Alvará de Funcionamento" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Categoria" name="categoria" required defaultValue={CATEGORIAS_DOCUMENTO[0].value}>
              {CATEGORIAS_DOCUMENTO.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
            <Input label="Subcategoria (opcional)" name="subcategoria" placeholder="Credenciamento" />
          </div>
          <Input label="Link do arquivo" name="arquivoUrl" required placeholder="https://drive.google.com/..." />
          <Input label="Descrição (opcional)" name="descricao" />
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Salvar documento
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
