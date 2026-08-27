"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import type { Turma } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type TurmaComVagas = Turma & { matriculados: number };

export function NovaMatriculaModal({ alunoId, turmas }: { alunoId: string; turmas: TurmaComVagas[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function matricular(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/alunos/${alunoId}/matriculas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        turmaId: fd.get("turmaId"),
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
    router.refresh();
  }

  if (turmas.length === 0) return null;

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">
        <GraduationCap className="h-4 w-4" />
        Nova matrícula
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nova matrícula">
        <form onSubmit={matricular} className="flex flex-col gap-4">
          <p className="text-sm text-cda-text2">
            Matricula esse aluno em outra turma (ex.: contraturno, ou virada de ano) sem precisar recadastrar tudo.
          </p>
          <Select label="Turma" name="turmaId" required defaultValue="">
            <option value="" disabled>
              Selecione a turma
            </option>
            {/* Controle de vagas desativado por enquanto — números de capacidade não são confiáveis ainda. */}
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </Select>
          <div className="flex flex-col gap-1">
            <Input label="Valor da mensalidade" name="valorMensalidade" type="number" step="0.01" min="0" defaultValue={450} />
            <p className="text-xs text-cda-text3">Só pra constar no contrato — a cobrança é feita fora do sistema.</p>
          </div>
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
