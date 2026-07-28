"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ItemEstoque } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

export function MovimentacaoModal({
  item,
  tipoInicial = "ENTRADA",
  onClose,
}: {
  item: ItemEstoque | null;
  tipoInicial?: "ENTRADA" | "SAIDA";
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!item) return;
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/estoque/${item.id}/movimentacoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: fd.get("tipo"),
        quantidade: fd.get("quantidade"),
        motivo: fd.get("motivo"),
        responsavel: fd.get("responsavel"),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível registrar a movimentação.");
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <Modal open={!!item} onClose={onClose} title="Registrar movimentação">
      {item && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-cda-text2">
            <span className="font-medium text-cda-text">{item.nome}</span> · estoque atual: {item.quantidade}{" "}
            {item.unidade}
          </p>
          <Select label="Tipo" name="tipo" defaultValue={tipoInicial} required>
            <option value="ENTRADA">Entrada</option>
            <option value="SAIDA">Saída</option>
          </Select>
          <Input label="Quantidade" name="quantidade" type="number" min={1} required />
          <Input label="Responsável" name="responsavel" required placeholder="Quem está retirando/registrando" />
          <Input label="Motivo (opcional)" name="motivo" placeholder="Compra, uso em sala, etc." />
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Registrar
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
