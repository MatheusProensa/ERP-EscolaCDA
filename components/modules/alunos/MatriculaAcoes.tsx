"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, XCircle, Trash2 } from "lucide-react";
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

// NOVO: toda mudança de situação agora explica o efeito prático — antes só CANCELADA e
// TRANSFERIDA confirmavam, e mesmo essas não diziam o que muda na prática. Ficava fácil
// mudar sem querer no <select> e não perceber (foi o que aconteceu com uma matrícula real).
const CONFIRMA: Record<SituacaoMatricula, string> = {
  ATIVA: "Reativar esta matrícula? Ela volta a contar como aluno ativo na turma.",
  TRANCADA: "Trancar esta matrícula? O aluno some das listagens de ativos, mas o histórico fica guardado — use pra uma pausa temporária (ex.: licença).",
  CANCELADA: "Cancelar esta matrícula? O aluno some das listagens de ativos — use quando ele realmente saiu da escola.",
  TRANSFERIDA: "Marcar esta matrícula como transferida? Use quando o aluno saiu pra outra escola.",
  CONCLUIDA: "Marcar esta matrícula como concluída? Use quando o aluno terminou o ciclo (ex.: formatura do Pré-Escola II).",
};

// Cor do <select> muda com a situação — dá pra perceber o estado atual num relance,
// sem precisar ler o texto pequeno.
const SITUACAO_COR: Record<SituacaoMatricula, string> = {
  ATIVA: "border-cda-green text-cda-green",
  TRANCADA: "border-cda-amber text-cda-amber",
  CANCELADA: "border-cda-red text-cda-red",
  TRANSFERIDA: "border-cda-text3 text-cda-text3",
  CONCLUIDA: "border-cda-blue text-cda-blue",
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
    if (!confirm(CONFIRMA[novaSituacao as SituacaoMatricula])) return;

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

  async function excluir() {
    if (!confirm("Excluir esta matrícula de vez? Some o card de contrato dela desta página e não dá pra desfazer.")) return;
    setError("");
    setLoading(true);
    const res = await fetch(`/api/matriculas/${matriculaId}`, { method: "DELETE" });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível excluir a matrícula.");
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
    <div className="flex flex-wrap items-center gap-2">
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
        label="Situação da matrícula"
        value={situacaoAtual}
        disabled={loading}
        onChange={(e) => alterar(e.target.value)}
        className={`h-8 w-40 text-xs font-medium ${SITUACAO_COR[situacaoAtual]}`}
      >
        {Object.entries(SITUACAO_LABEL).map(([valor, label]) => (
          <option key={valor} value={valor}>
            {label}
          </option>
        ))}
      </Select>
      {situacaoAtual !== "ATIVA" && (
        <button
          onClick={excluir}
          disabled={loading}
          title="Excluir matrícula"
          aria-label="Excluir matrícula"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-cda-text3 hover:bg-cda-red/5 hover:text-cda-red disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
      {error && <p className="text-xs text-cda-red">{error}</p>}

      <Modal open={transferindo} onClose={() => setTransferindo(false)} title="Transferir de turma">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-cda-text2">A matrícula muda de turma agora mesmo.</p>
          <Select value={novaTurmaId} onChange={(e) => setNovaTurmaId(e.target.value)} label="Nova turma">
            <option value="" disabled>
              Selecione a turma de destino
            </option>
            {/* Controle de vagas desativado por enquanto — números de capacidade não são confiáveis ainda. */}
            {turmasDisponiveis?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
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
