"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { Turma } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { InteressadoFormFields } from "./InteressadoFormFields";

export function NovoInteressadoModal({ turmas }: { turmas: Turma[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function adicionar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/interessados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nomeCrianca: fd.get("nomeCrianca"),
        dataNascimento: fd.get("dataNascimento") || null,
        nomeResponsavel: fd.get("nomeResponsavel"),
        parentescoContato: fd.get("parentescoContato") || null,
        telefoneResponsavel: fd.get("telefoneResponsavel"),
        emailResponsavel: fd.get("emailResponsavel") || null,
        turmaDesejadaId: fd.get("turmaDesejadaId") || null,
        interesseTexto: fd.get("interesseTexto") || null,
        dataPrimeiroContato: fd.get("dataPrimeiroContato") || null,
        dataVisita: fd.get("dataVisita") || null,
        oQueBusca: fd.get("oQueBusca") || null,
        observacoes: fd.get("observacoes") || null,
        status: fd.get("status") || undefined,
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
        Novo interessado
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo interessado" className="max-w-xl">
        <form onSubmit={adicionar} className="flex flex-col gap-4">
          <InteressadoFormFields turmas={turmas} inicial={{ dataPrimeiroContato: new Date() }} />
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
