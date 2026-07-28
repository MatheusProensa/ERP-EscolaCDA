"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { DocumentoInstitucional } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { CATEGORIAS_DOCUMENTO } from "@/lib/utils";

export function EditarDocumentoModal({
  documento,
  onClose,
}: {
  documento: DocumentoInstitucional | null;
  onClose: () => void;
}) {
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

    onClose();
    router.refresh();
  }

  return (
    <Modal open={!!documento} onClose={onClose} title="Editar documento">
      {documento && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Título" name="titulo" required defaultValue={documento.titulo} />
          <Select label="Categoria" name="categoria" required defaultValue={documento.categoria}>
            {CATEGORIAS_DOCUMENTO.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Input label="Link (Google Drive)" name="link" type="url" required defaultValue={documento.link} />
          <Input
            label="Validade (opcional)"
            name="validade"
            type="date"
            defaultValue={documento.validade ? new Date(documento.validade).toISOString().slice(0, 10) : ""}
          />
          <Input label="Observação (opcional)" name="observacao" defaultValue={documento.observacao ?? ""} />
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
