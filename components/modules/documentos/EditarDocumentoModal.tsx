"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Documento } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { CATEGORIAS_DOCUMENTO } from "./categorias";

export function EditarDocumentoModal({ documento, onClose }: { documento: Documento | null; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!documento) return;
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/documentos/${documento.id}`, {
      method: "PATCH",
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
      setError(data.error ?? "Não foi possível salvar as alterações.");
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <Modal open={!!documento} onClose={onClose} title="Editar documento">
      {documento && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Título" name="titulo" required defaultValue={documento.titulo} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Categoria" name="categoria" required defaultValue={documento.categoria}>
              {CATEGORIAS_DOCUMENTO.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
            <Input label="Subcategoria (opcional)" name="subcategoria" defaultValue={documento.subcategoria ?? ""} />
          </div>
          <Input label="Link do arquivo" name="arquivoUrl" required defaultValue={documento.arquivoUrl} />
          <Input label="Descrição (opcional)" name="descricao" defaultValue={documento.descricao ?? ""} />
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Salvar alterações
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
