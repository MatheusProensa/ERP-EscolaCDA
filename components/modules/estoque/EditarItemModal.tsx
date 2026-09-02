"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ItemEstoque } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";

export function EditarItemModal({ item, onClose }: { item: ItemEstoque | null; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!item) return;
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/estoque/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: fd.get("nome"),
          categoria: fd.get("categoria"),
          unidade: fd.get("unidade"),
          minimo: fd.get("minimo"),
          localizacao: fd.get("localizacao"),
          fornecedor: fd.get("fornecedor"),
        }),
      });
      if (!res.ok) throw new Error();
      onClose();
      router.refresh();
    } catch {
      showToast("Não foi possível salvar o item. Tente de novo.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={!!item} onClose={onClose} title="Editar item">
      {item && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Nome" name="nome" required defaultValue={item.nome} />
          <Input label="Categoria" name="categoria" required defaultValue={item.categoria} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Unidade" name="unidade" required defaultValue={item.unidade} />
            <Input label="Mínimo" name="minimo" type="number" defaultValue={item.minimo} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Localização (opcional)" name="localizacao" defaultValue={item.localizacao ?? ""} />
            <Input label="Fornecedor (opcional)" name="fornecedor" defaultValue={item.fornecedor ?? ""} />
          </div>
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
