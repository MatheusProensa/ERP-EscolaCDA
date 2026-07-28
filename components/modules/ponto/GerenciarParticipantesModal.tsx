"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

type FuncionarioResumo = {
  id: string;
  nome: string;
  cargo: string;
  setor: string;
  participaPonto: boolean;
};

export function GerenciarParticipantesModal({ funcionarios }: { funcionarios: FuncionarioResumo[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [alterandoId, setAlterandoId] = useState<string | null>(null);

  async function alternar(f: FuncionarioResumo) {
    setAlterandoId(f.id);
    const res = await fetch(`/api/funcionarios/${f.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participaPonto: !f.participaPonto }),
    });
    setAlterandoId(null);
    if (!res.ok) {
      alert("Não foi possível alterar.");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-cda-border bg-white px-3 py-1.5 text-xs font-medium text-cda-text hover:bg-cda-bg"
      >
        <Users className="h-3.5 w-3.5" />
        Gerenciar participantes
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Quem participa do Ponto">
        <div className="flex flex-col gap-1">
          <p className="mb-2 text-xs text-cda-text3">
            Marque quem deve aparecer na listagem do Ponto pra lançamento e cálculo de horas.
          </p>
          <div className="max-h-[60vh] overflow-y-auto">
            {funcionarios.map((f) => (
              <label
                key={f.id}
                className="flex items-center gap-3 border-b border-cda-border px-1 py-2.5 last:border-0"
              >
                <input
                  type="checkbox"
                  checked={f.participaPonto}
                  disabled={alterandoId === f.id}
                  onChange={() => alternar(f)}
                  className="h-4 w-4 rounded border-cda-border disabled:opacity-50"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-cda-text">{f.nome}</p>
                  <p className="truncate text-xs text-cda-text3">
                    {f.cargo} · {f.setor}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}
