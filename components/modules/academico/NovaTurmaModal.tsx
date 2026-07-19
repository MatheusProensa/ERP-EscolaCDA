"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

export function NovaTurmaModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/turmas", {
      method: "POST",
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
      setError(data.error ?? "Não foi possível criar a turma.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Nova turma
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nova turma">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Nome da turma" name="nome" placeholder="Maternal I, Contraturno I..." required />
          <Select label="Turno" name="turno" defaultValue="TARDE" required>
            <option value="TARDE">Tarde — Ensino regular</option>
            <option value="MANHA">Manhã — Contraturno</option>
          </Select>
          <Input label="Capacidade" name="capacidade" type="number" defaultValue="25" />
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Criar turma
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
