"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function NovoItemModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/estoque", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: fd.get("nome"),
        categoria: fd.get("categoria"),
        unidade: fd.get("unidade"),
        quantidade: fd.get("quantidade"),
        minimo: fd.get("minimo"),
        localizacao: fd.get("localizacao"),
        fornecedor: fd.get("fornecedor"),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível criar o item.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Novo item
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo item de estoque">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Nome" name="nome" required placeholder="Papel A4" />
          <Input label="Categoria" name="categoria" required placeholder="Material Escolar" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input label="Unidade" name="unidade" required placeholder="un" />
            <Input label="Quantidade inicial" name="quantidade" type="number" defaultValue="0" />
            <Input label="Mínimo" name="minimo" type="number" defaultValue="5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Localização (opcional)" name="localizacao" placeholder="Armário 2, Depósito..." />
            <Input label="Fornecedor (opcional)" name="fornecedor" placeholder="Papelaria Central" />
          </div>
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Criar item
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
