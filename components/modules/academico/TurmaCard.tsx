"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

export interface TurmaCardProps {
  id: string;
  nome: string;
  turno: "MANHA" | "TARDE";
  capacidade: number;
  matriculados: number;
}

const TURNO_STYLE = {
  TARDE: { label: "Tarde", bg: "#EBF4FF", text: "#1A6FD8" },
  MANHA: { label: "Manhã", bg: "#EEEDFE", text: "#3C3489" },
};

export function TurmaCard({ id, nome, turno, capacidade, matriculados }: TurmaCardProps) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const turnoStyle = TURNO_STYLE[turno];

  async function salvarEdicao(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/turmas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: fd.get("nome"),
        turno: fd.get("turno"),
        capacidade: fd.get("capacidade"),
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível salvar.");
      return;
    }

    setEditando(false);
    router.refresh();
  }

  async function excluir() {
    if (!confirm(`Excluir a turma "${nome}"?`)) return;
    const res = await fetch(`/api/turmas/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Não foi possível excluir.");
      return;
    }
    router.refresh();
  }

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="font-semibold text-cda-text">{nome}</p>
        <div className="flex shrink-0 items-center gap-1">
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ backgroundColor: turnoStyle.bg, color: turnoStyle.text }}
          >
            {turnoStyle.label}
          </span>
          <button
            onClick={() => setEditando(true)}
            title="Editar"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-cda-text2 hover:bg-cda-bg hover:text-cda-text"
          >
            <Pencil className="h-[18px] w-[18px]" />
          </button>
          <button
            onClick={excluir}
            title="Excluir"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-cda-text2 hover:bg-cda-bg hover:text-cda-red"
          >
            <Trash2 className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      <p className="text-sm text-cda-text2">
        {matriculados} aluno{matriculados === 1 ? "" : "s"} matriculado{matriculados === 1 ? "" : "s"}
      </p>

      <div className="mt-3 flex items-center justify-end">
        <Link href={`/academico/turmas/${id}`} className={cn("text-sm font-medium text-cda-blue hover:underline")}>
          Ver alunos
        </Link>
      </div>

      <Modal open={editando} onClose={() => setEditando(false)} title="Editar turma">
        <form onSubmit={salvarEdicao} className="flex flex-col gap-4">
          <Input label="Nome da turma" name="nome" required defaultValue={nome} />
          <Select label="Turno" name="turno" defaultValue={turno} required>
            <option value="TARDE">Tarde — Ensino regular</option>
            <option value="MANHA">Manhã — Contraturno</option>
          </Select>
          <Input label="Capacidade" name="capacidade" type="number" defaultValue={capacidade} />
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
