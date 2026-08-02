"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
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

  async function matricular(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const alunoId = fd.get("alunoId");
    const res = await fetch(`/api/alunos/${alunoId}/matriculas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        turmaId,
        valorMensalidade: fd.get("valorMensalidade"),
        gerarMensalidades: fd.get("gerarMensalidades") === "on",
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível matricular.");
      return;
    }
    setOpen(false);
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
          <Select label="Aluno" name="alunoId" required defaultValue="">
            <option value="" disabled>
              Selecione um aluno já cadastrado
            </option>
            {alunosDisponiveis.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-2 text-sm text-cda-text2">
            <input type="checkbox" name="gerarMensalidades" defaultChecked className="h-4 w-4 rounded border-cda-border" />
            Gerar as 12 mensalidades do ano
          </label>
          <Input label="Valor da mensalidade" name="valorMensalidade" type="number" step="0.01" min="0" defaultValue={450} />
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Matricular
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
