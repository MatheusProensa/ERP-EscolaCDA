"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SituacaoMatricula } from "@prisma/client";
import { Select } from "@/components/ui/Select";

const SITUACAO_LABEL: Record<SituacaoMatricula, string> = {
  ATIVA: "Ativa",
  TRANCADA: "Trancada",
  CANCELADA: "Cancelada",
  TRANSFERIDA: "Transferida",
  CONCLUIDA: "Concluída",
};

const CONFIRMA: Partial<Record<SituacaoMatricula, string>> = {
  CANCELADA: "Cancelar esta matrícula? As mensalidades já geradas continuam no histórico.",
  TRANSFERIDA: "Marcar esta matrícula como transferida?",
};

export function MatriculaAcoes({
  matriculaId,
  situacaoAtual,
}: {
  matriculaId: string;
  situacaoAtual: SituacaoMatricula;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function alterar(novaSituacao: string) {
    if (novaSituacao === situacaoAtual) return;
    const confirmacao = CONFIRMA[novaSituacao as SituacaoMatricula];
    if (confirmacao && !confirm(confirmacao)) return;

    setError("");
    setLoading(true);
    const res = await fetch(`/api/matriculas/${matriculaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ situacao: novaSituacao }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível alterar a situação da matrícula.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={situacaoAtual}
        disabled={loading}
        onChange={(e) => alterar(e.target.value)}
        className="h-8 w-40 text-xs"
      >
        {Object.entries(SITUACAO_LABEL).map(([valor, label]) => (
          <option key={valor} value={valor}>
            {label}
          </option>
        ))}
      </Select>
      {error && <p className="text-xs text-cda-red">{error}</p>}
    </div>
  );
}
