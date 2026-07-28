"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function NovaCobrancaModal({ matriculaId }: { matriculaId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/financeiro/mensalidades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matriculaId,
        descricao: fd.get("descricao"),
        valor: fd.get("valor"),
        vencimento: fd.get("vencimento"),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível lançar a cobrança.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-cda-border bg-white px-3 py-1.5 text-xs font-medium text-cda-text hover:bg-cda-bg"
      >
        <Plus className="h-3.5 w-3.5" />
        Cobrança avulsa
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nova cobrança avulsa">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Descrição" name="descricao" required placeholder="Taxa de material, multa, evento..." />
          <Input label="Valor" name="valor" type="number" step="0.01" min="0.01" required />
          <Input label="Vencimento" name="vencimento" type="date" required />
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Lançar cobrança
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
