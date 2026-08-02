"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { Turma } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

export function NovaListaEsperaModal({ turmas }: { turmas: Turma[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function adicionar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/lista-espera", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nomeCrianca: fd.get("nomeCrianca"),
        dataNascimento: fd.get("dataNascimento") || null,
        nomeResponsavel: fd.get("nomeResponsavel"),
        telefoneResponsavel: fd.get("telefoneResponsavel"),
        emailResponsavel: fd.get("emailResponsavel") || null,
        turmaDesejadaId: fd.get("turmaDesejadaId") || null,
        observacoes: fd.get("observacoes") || null,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível adicionar.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Adicionar à lista
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Adicionar à lista de espera">
        <form onSubmit={adicionar} className="flex flex-col gap-4">
          <Input label="Nome da criança" name="nomeCrianca" required />
          <Input label="Data de nascimento" name="dataNascimento" type="date" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nome do responsável" name="nomeResponsavel" required />
            <Input label="Telefone" name="telefoneResponsavel" required />
          </div>
          <Input label="E-mail (opcional)" name="emailResponsavel" type="email" />
          <Select label="Turma desejada (opcional)" name="turmaDesejadaId" defaultValue="">
            <option value="">Sem preferência</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </Select>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-cda-text2">Observações</label>
            <textarea
              name="observacoes"
              rows={3}
              className="w-full rounded-lg border border-cda-border bg-white px-3 py-2 text-sm text-cda-text outline-none transition-colors focus:border-cda-blue"
            />
          </div>
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Adicionar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
