"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
  const [loading, setLoading] = useState(false);
  const emprestimo = chave.emprestimos[0] ?? null;

  async function retirar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await fetch(`/api/chaves/${chave.id}/emprestimos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responsavel: fd.get("responsavel") }),
    });
    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  async function devolver() {
    if (!emprestimo) return;
    setLoading(true);
    await fetch(`/api/chaves/${chave.id}/emprestimos/${emprestimo.id}`, { method: "PATCH" });
    setLoading(false);
    router.refresh();
  }

  return (
    <Card className="flex flex-col p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-semibold text-cda-text">{chave.sala}</p>
        <Badge variant={emprestimo ? "amber" : "green"}>{emprestimo ? "Emprestada" : "Disponível"}</Badge>
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

      <Modal open={open} onClose={() => setOpen(false)} title={`Retirar chave — ${chave.sala}`}>
        <form onSubmit={retirar} className="flex flex-col gap-4">
          <Input label="Responsável pela retirada" name="responsavel" required />
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
    </Card>
  );
}
