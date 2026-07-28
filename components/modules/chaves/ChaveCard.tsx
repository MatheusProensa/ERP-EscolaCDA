"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import type { Chave, EmprestimoChave } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatarDataHora } from "@/lib/utils";

export function ChaveCard({ chave }: { chave: Chave & { emprestimos: EmprestimoChave[] } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const emprestimo = chave.emprestimos[0] ?? null;

  async function salvarEdicao(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/chaves/${chave.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sala: fd.get("sala") }),
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
    if (!confirm(`Excluir a chave "${chave.sala}"?`)) return;
    setError("");
    const res = await fetch(`/api/chaves/${chave.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Não foi possível excluir.");
      return;
    }
    router.refresh();
  }

  async function retirar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/chaves/${chave.id}/emprestimos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responsavel: fd.get("responsavel") }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível registrar a retirada.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  async function devolver() {
    if (!emprestimo) return;
    setError("");
    setLoading(true);
    const res = await fetch(`/api/chaves/${chave.id}/emprestimos/${emprestimo.id}`, { method: "PATCH" });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível registrar a devolução.");
      return;
    }

    router.refresh();
  }

  return (
    <Card className="flex flex-col p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-semibold text-cda-text">{chave.sala}</p>
        <div className="flex shrink-0 items-center gap-1">
          <Badge variant={emprestimo ? "amber" : "green"}>{emprestimo ? "Emprestada" : "Disponível"}</Badge>
          <button
            onClick={() => setEditando(true)}
            title="Editar"
            className="flex h-6 w-6 items-center justify-center rounded text-cda-text3 hover:bg-cda-bg hover:text-cda-text"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={excluir}
            title="Excluir"
            className="flex h-6 w-6 items-center justify-center rounded text-cda-text3 hover:bg-cda-bg hover:text-cda-red"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {emprestimo ? (
        <p className="flex-1 text-sm text-cda-text2">
          Com <span className="font-medium text-cda-text">{emprestimo.responsavel}</span>, desde{" "}
          {formatarDataHora(emprestimo.retirada)}
        </p>
      ) : (
        <p className="flex-1 text-sm text-cda-text3">Chave no lugar.</p>
      )}

      {emprestimo ? (
        <Button size="sm" variant="outline" className="mt-3" onClick={devolver} loading={loading}>
          Registrar devolução
        </Button>
      ) : (
        <Button size="sm" className="mt-3" onClick={() => setOpen(true)}>
          Retirar chave
        </Button>
      )}
      {error && !open && <p className="mt-2 text-xs text-cda-red">{error}</p>}

      <Modal open={open} onClose={() => setOpen(false)} title={`Retirar chave — ${chave.sala}`}>
        <form onSubmit={retirar} className="flex flex-col gap-4">
          <Input label="Responsável pela retirada" name="responsavel" required />
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Confirmar retirada
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={editando} onClose={() => setEditando(false)} title="Editar chave">
        <form onSubmit={salvarEdicao} className="flex flex-col gap-4">
          <Input label="Sala" name="sala" required defaultValue={chave.sala} />
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
