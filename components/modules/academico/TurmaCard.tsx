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
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { showToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

export interface TurmaCardProps {
  id: string;
  nome: string;
  turno: "MANHA" | "TARDE";
  capacidade: number;
  matriculados: number;
}

// Categórica (handoff de design, etapa 3.4): turno é categoria, não estado —
// o #3C3489/#EEEDFE de Manhã saem do sistema, não existiam em nenhum outro lugar.
const TURNO_STYLE: Record<TurmaCardProps["turno"], { label: string; variant: BadgeVariant }> = {
  TARDE: { label: "Tarde", variant: "cat1" },
  MANHA: { label: "Manhã", variant: "cat3" },
};

export function TurmaCard({ id, nome, turno, capacidade, matriculados, podeEditar = true }: TurmaCardProps & { podeEditar?: boolean }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
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
    setExcluindo(true);
    const res = await fetch(`/api/turmas/${id}`, { method: "DELETE" });
    setExcluindo(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "Não foi possível excluir.", "error");
      return;
    }
    setConfirmandoExclusao(false);
    router.refresh();
  }

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="font-semibold text-cda-text">{nome}</p>
        <div className="flex shrink-0 items-center gap-1">
          <Badge variant={turnoStyle.variant}>{turnoStyle.label}</Badge>
          {podeEditar && (
            <>
              <IconButton icon={Pencil} label="Editar turma" onClick={() => setEditando(true)} />
              <IconButton icon={Trash2} label="Excluir turma" variant="danger" onClick={() => setConfirmandoExclusao(true)} />
            </>
          )}
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

      <ConfirmDialog
        open={confirmandoExclusao}
        onClose={() => setConfirmandoExclusao(false)}
        onConfirm={excluir}
        title={`Excluir a turma "${nome}"?`}
        confirmLabel="Excluir turma"
        loading={excluindo}
      />
    </Card>
  );
}
