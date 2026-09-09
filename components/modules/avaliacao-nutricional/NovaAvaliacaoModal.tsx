"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function NovaAvaliacaoModal({ alunoId, hojeISO }: { alunoId: string; hojeISO: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/alunos/${alunoId}/avaliacoes-nutricionais`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: fd.get("data"),
        pesoKg: fd.get("pesoKg"),
        alturaCm: fd.get("alturaCm"),
        observacoes: fd.get("observacoes"),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível salvar a avaliação.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Nova avaliação
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nova avaliação nutricional">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* text-base (16px) no celular: campo de número/data com menos de 16px
              de fonte faz o Safari/iOS dar zoom sozinho ao focar — problema real
              pra quem usa isso no telefone, na correria. Volta a 14px (padrão do
              resto do sistema) só a partir do sm: */}
          <Input
            label="Data da avaliação"
            name="data"
            type="date"
            required
            defaultValue={hojeISO}
            max={hojeISO}
            className="text-base sm:text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Peso (kg)" name="pesoKg" type="number" inputMode="decimal" step="0.01" min="0" required placeholder="Ex.: 14.2" className="text-base sm:text-sm" />
            <Input label="Altura (cm)" name="alturaCm" type="number" inputMode="decimal" step="0.1" min="0" required placeholder="Ex.: 92.5" className="text-base sm:text-sm" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-cda-text2">Observações (opcional)</label>
            <textarea
              name="observacoes"
              rows={2}
              placeholder="Alguma observação sobre essa avaliação..."
              className="w-full rounded-lg border border-cda-border bg-white px-3 py-2 text-base text-cda-text outline-none transition-colors focus:border-cda-blue sm:text-sm"
            />
          </div>
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Salvar avaliação
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
