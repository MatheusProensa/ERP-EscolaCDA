"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, MoreVertical, Trash2 } from "lucide-react";
import type { Turma } from "@prisma/client";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MenuButton } from "@/components/ui/MenuButton";

type TurmaComVagas = Turma & { matriculados: number };

// Simplificado a pedido: sem "situação" (ativa/trancada/cancelada/transferida/concluída) —
// ou o aluno está na escola (matrícula existe) ou não está (matrícula removida). Quem sai
// da escola não fica marcado como "cancelado" escondido no sistema, é removido de vez.
export function MatriculaAcoes({
  matriculaId,
  turmaNome,
  turmasDisponiveis,
}: {
  matriculaId: string;
  turmaNome: string;
  turmasDisponiveis?: TurmaComVagas[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [transferindo, setTransferindo] = useState(false);
  const [novaTurmaId, setNovaTurmaId] = useState("");
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  async function excluir() {
    setError("");
    setLoading(true);
    const res = await fetch(`/api/matriculas/${matriculaId}`, { method: "DELETE" });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível remover a matrícula.");
      return;
    }
    setConfirmandoExclusao(false);
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
      {/* Um menu só (⋮) em vez de 2 botões com texto soltos no cabeçalho do
          card de contrato — "Transferir turma" ficava concorrendo visualmente
          com o título "Contrato — {turma}" logo ao lado. */}
      <MenuButton
        label="Ações da matrícula"
        icon={MoreVertical}
        iconOnly
        size="sm"
        items={[
          ...(turmasDisponiveis && turmasDisponiveis.length > 0
            ? [{ label: "Transferir de turma", icon: ArrowLeftRight, onClick: () => setTransferindo(true) }]
            : []),
          { label: "Remover matrícula", icon: Trash2, danger: true, onClick: () => setConfirmandoExclusao(true) },
        ]}
      />
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

      <ConfirmDialog
        open={confirmandoExclusao}
        onClose={() => setConfirmandoExclusao(false)}
        onConfirm={excluir}
        title={`Remover a matrícula de ${turmaNome}?`}
        consequence="O aluno sai da lista dessa turma agora. Não pode ser desfeito."
        confirmLabel="Remover"
        loading={loading}
      />
    </div>
  );
}
