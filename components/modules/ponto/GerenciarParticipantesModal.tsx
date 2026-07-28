"use client";

import { useState, type FocusEvent } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { minParaHora } from "@/lib/ponto";

type FuncionarioResumo = {
  id: string;
  nome: string;
  cargo: string;
  setor: string;
  participaPonto: boolean;
  jornadaPrevistaMinutos: number | null;
};

export function GerenciarParticipantesModal({ funcionarios }: { funcionarios: FuncionarioResumo[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [alterandoId, setAlterandoId] = useState<string | null>(null);
  const [erroJornadaId, setErroJornadaId] = useState<string | null>(null);

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

  async function salvarJornada(f: FuncionarioResumo, e: FocusEvent<HTMLInputElement>) {
    const valor = e.target.value.trim();
    const atual = f.jornadaPrevistaMinutos != null ? minParaHora(f.jornadaPrevistaMinutos) : "";
    if (valor === atual) return;

    if (valor && !/^\d{1,2}:\d{2}$/.test(valor)) {
      setErroJornadaId(f.id);
      return;
    }
    setErroJornadaId(null);

    const res = await fetch(`/api/funcionarios/${f.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jornadaPrevista: valor || null }),
    });
    if (!res.ok) {
      alert("Não foi possível salvar a jornada prevista.");
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

      <Modal open={open} onClose={() => setOpen(false)} title="Configurar o Ponto por funcionário" className="max-w-2xl">
        <div className="flex flex-col gap-1">
          <p className="mb-2 text-xs text-cda-text3">
            Marque quem deve aparecer na listagem do Ponto e defina a jornada prevista de cada um (formato HH:MM).
          </p>
          <div className="max-h-[60vh] overflow-y-auto">
            {funcionarios.map((f) => (
              <div key={f.id} className="flex items-center gap-3 border-b border-cda-border px-1 py-2.5 last:border-0">
                <input
                  type="checkbox"
                  checked={f.participaPonto}
                  disabled={alterandoId === f.id}
                  onChange={() => alternar(f)}
                  className="h-4 w-4 shrink-0 rounded border-cda-border disabled:opacity-50"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-cda-text">{f.nome}</p>
                  <p className="truncate text-xs text-cda-text3">
                    {f.cargo} · {f.setor}
                  </p>
                </div>
                <div className="w-24 shrink-0">
                  <input
                    type="text"
                    placeholder="04:30"
                    defaultValue={f.jornadaPrevistaMinutos != null ? minParaHora(f.jornadaPrevistaMinutos) : ""}
                    onBlur={(e) => salvarJornada(f, e)}
                    className="h-9 w-full rounded-lg border border-cda-border px-2 text-center text-sm text-cda-text outline-none focus:border-cda-blue"
                  />
                  {erroJornadaId === f.id && <p className="mt-0.5 text-[10px] text-cda-red">Use HH:MM</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}
