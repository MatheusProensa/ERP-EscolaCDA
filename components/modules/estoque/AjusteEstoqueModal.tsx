"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ItemEstoque } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function AjusteEstoqueModal({ item, onClose }: { item: ItemEstoque | null; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!item) return;
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/estoque/${item.id}/ajuste`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        novaQuantidade: fd.get("novaQuantidade"),
        motivo: fd.get("motivo"),
        responsavel: fd.get("responsavel"),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível ajustar o estoque.");
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <Modal open={!!item} onClose={onClose} title="Ajustar estoque (inventário)">
      {item && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-cda-text2">
            <span className="font-medium text-cda-text">{item.nome}</span> · estoque atual no sistema:{" "}
            {item.quantidade} {item.unidade}
          </p>
          <Input
            label={`Quantidade real (${item.unidade})`}
            name="novaQuantidade"
            type="number"
            min={0}
            required
            defaultValue={item.quantidade}
          />
          <Input label="Responsável" name="responsavel" required placeholder="Quem conferiu o estoque" />
          <Input
            label="Motivo (opcional)"
            name="motivo"
            placeholder="Contagem de inventário, perda, avaria..."
          />
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Salvar ajuste
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
