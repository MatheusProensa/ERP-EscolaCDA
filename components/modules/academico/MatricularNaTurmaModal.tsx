"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Combobox } from "@/components/ui/Combobox";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function MatricularNaTurmaModal({
  turmaId,
  alunosDisponiveis,
}: {
  turmaId: string;
  alunosDisponiveis: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [alunoId, setAlunoId] = useState<string | null>(null);

  async function matricular(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!alunoId) return;
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/alunos/${alunoId}/matriculas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        turmaId,
        valorMensalidade: fd.get("valorMensalidade"),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível matricular.");
      return;
    }
    setOpen(false);
    setAlunoId(null);
    router.refresh();
  }

  if (alunosDisponiveis.length === 0) return null;

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" size="sm">
        <UserPlus className="h-3.5 w-3.5" />
        Matricular aluno
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Matricular aluno nesta turma">
        <form onSubmit={matricular} className="flex flex-col gap-4">
          <Combobox
            label="Aluno"
            items={alunosDisponiveis}
            value={alunoId}
            onChange={setAlunoId}
            getId={(a) => a.id}
            getLabel={(a) => a.nome}
            getAvatar={(a) => ({ nome: a.nome })}
            placeholder="Selecione um aluno já cadastrado"
            countNoun="alunos"
            required
          />
          <div className="flex flex-col gap-1">
            <Input label="Valor da mensalidade" name="valorMensalidade" type="number" step="0.01" min="0" defaultValue={450} />
            <p className="text-xs text-cda-text3">Só pra constar no contrato — a cobrança é feita fora do sistema.</p>
          </div>
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading} disabled={!alunoId}>
              Matricular
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
