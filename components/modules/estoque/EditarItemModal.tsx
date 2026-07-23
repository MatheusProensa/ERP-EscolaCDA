"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ItemEstoque } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function EditarItemModal({ item, onClose }: { item: ItemEstoque | null; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!item) return;
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await fetch(`/api/estoque/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: fd.get("nome"),
        categoria: fd.get("categoria"),
        unidade: fd.get("unidade"),
        minimo: fd.get("minimo"),
      }),
    });
    setLoading(false);
    onClose();
    router.refresh();
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
