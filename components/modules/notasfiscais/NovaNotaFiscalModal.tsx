"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import { Button } from "@/components/ui/Button";

export function NovaNotaFiscalModal({ alunos }: { alunos: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [alunoId, setAlunoId] = useState<string | null>(null);
  const [competencia, setCompetencia] = useState(() => new Date().toISOString().slice(0, 7));
  const [valorServico, setValorServico] = useState("");
  const [discriminacao, setDiscriminacao] = useState("");

  async function emitir() {
    if (!alunoId || !competencia || !valorServico) {
      setError("Aluno, competência e valor são obrigatórios.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/notas-fiscais", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        alunoId,
        competencia,
        valorServico: Number(valorServico),
        discriminacao: discriminacao || undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível criar a nota.");
      return;
    }
    setOpen(false);
    setAlunoId(null);
    setValorServico("");
    setDiscriminacao("");
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Receipt className="h-4 w-4" />
        Nova nota fiscal
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nova nota fiscal">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-cda-text2">
            Fica registrada mesmo se a emissão de verdade ainda não estiver ligada — dá pra tentar de novo depois.
          </p>
          <Combobox
            label="Aluno"
            items={alunos}
            value={alunoId}
            onChange={setAlunoId}
            getId={(a) => a.id}
            getLabel={(a) => a.nome}
            getAvatar={(a) => ({ nome: a.nome })}
            placeholder="Selecione o aluno"
            countNoun="alunos"
          />
          <Input
            label="Competência (mês de referência)"
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
          />
          <Input
            label="Valor do serviço"
            type="number"
            step="0.01"
            min="0"
            value={valorServico}
            onChange={(e) => setValorServico(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-cda-text2">Discriminação (opcional)</label>
            <textarea
              value={discriminacao}
              onChange={(e) => setDiscriminacao(e.target.value)}
              rows={2}
              placeholder="Prestação de serviços educacionais — referente a [mês]"
              className="w-full rounded-lg border border-cda-border bg-white px-3 py-2 text-sm text-cda-text outline-none transition-colors focus:border-cda-blue"
            />
          </div>
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={emitir} loading={loading}>
              Emitir
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
