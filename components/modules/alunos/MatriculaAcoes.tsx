"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, XCircle } from "lucide-react";
import type { SituacaoMatricula, Turma } from "@prisma/client";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

const SITUACAO_LABEL: Record<SituacaoMatricula, string> = {
  ATIVA: "Ativa",
  TRANCADA: "Trancada",
  CANCELADA: "Cancelada",
  TRANSFERIDA: "Transferida",
  CONCLUIDA: "Concluída",
};

const CONFIRMA: Partial<Record<SituacaoMatricula, string>> = {
  CANCELADA: "Cancelar esta matrícula?",
  TRANSFERIDA: "Marcar esta matrícula como transferida (saiu da escola)?",
};

type TurmaComVagas = Turma & { matriculados: number };

export function MatriculaAcoes({
  matriculaId,
  situacaoAtual,
  turmasDisponiveis,
}: {
  matriculaId: string;
  situacaoAtual: SituacaoMatricula;
  turmasDisponiveis?: TurmaComVagas[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [transferindo, setTransferindo] = useState(false);
  const [novaTurmaId, setNovaTurmaId] = useState("");

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

  async function transferir() {
    if (!novaTurmaId) return;
    setError("");
    setLoading(true);
    const res = await fetch(`/api/matriculas/${matriculaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turmaId: novaTurmaId }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível transferir de turma.");
      return;
    }
    setTransferindo(false);
    setNovaTurmaId("");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {situacaoAtual === "ATIVA" && turmasDisponiveis && turmasDisponiveis.length > 0 && (
        <button
          onClick={() => setTransferindo(true)}
          title="Transferir de turma"
          className="flex h-8 items-center gap-1.5 rounded-lg border border-cda-border bg-white px-2.5 text-xs font-medium text-cda-text hover:bg-cda-bg"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          Transferir turma
        </button>
      )}
      {situacaoAtual === "ATIVA" && (
        <button
          onClick={() => alterar("CANCELADA")}
          disabled={loading}
          title="Cancelar matrícula"
          className="flex h-8 items-center gap-1.5 rounded-lg border border-cda-border bg-white px-2.5 text-xs font-medium text-cda-red hover:bg-cda-red/5 disabled:opacity-50"
        >
          <XCircle className="h-3.5 w-3.5" />
          Cancelar matrícula
        </button>
      )}
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

      <Modal open={transferindo} onClose={() => setTransferindo(false)} title="Transferir de turma">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-cda-text2">A matrícula muda de turma agora mesmo.</p>
          <Select value={novaTurmaId} onChange={(e) => setNovaTurmaId(e.target.value)} label="Nova turma">
            <option value="" disabled>
              Selecione a turma de destino
            </option>
            {turmasDisponiveis?.map((t) => {
              const cheia = t.matriculados >= t.capacidade;
              return (
                <option key={t.id} value={t.id} disabled={cheia}>
                  {t.nome} — {cheia ? "lotada" : `${t.capacidade - t.matriculados} vaga(s)`}
                </option>
              );
            })}
          </Select>
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setTransferindo(false)}>
              Cancelar
            </Button>
            <Button onClick={transferir} loading={loading} disabled={!novaTurmaId}>
              Transferir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
