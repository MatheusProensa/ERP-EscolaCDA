"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import type { Chave, EmprestimoChave } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Combobox } from "@/components/ui/Combobox";
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { showToast } from "@/components/ui/Toast";
import { formatarDataHora } from "@/lib/utils";

export function ChaveCard({
  chave,
  funcionarios,
}: {
  chave: Chave & { emprestimos: EmprestimoChave[] };
  funcionarios: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [funcionarioId, setFuncionarioId] = useState("");
  const emprestimo = chave.emprestimos[0] ?? null;

  async function salvarEdicao(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/chaves/${chave.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sala: fd.get("sala") }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível salvar.");
      return;
    }

    setEditando(false);
    router.refresh();
  }

  async function excluir() {
    setExcluindo(true);
    const res = await fetch(`/api/chaves/${chave.id}`, { method: "DELETE" });
    setExcluindo(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "Não foi possível excluir.", "error");
      return;
    }
    setConfirmandoExclusao(false);
    router.refresh();
  }

  async function retirar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!funcionarioId) return;
    setError("");
    setLoading(true);
    const res = await fetch(`/api/chaves/${chave.id}/emprestimos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ funcionarioId }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível registrar a retirada.");
      return;
    }

    const nome = funcionarios.find((f) => f.id === funcionarioId)?.nome ?? "";
    setOpen(false);
    setFuncionarioId("");
    // NOVO: confirmação visual — antes a retirada só atualizava a lista em silêncio.
    showToast(`Chave "${chave.sala}" retirada por ${nome}.`);
    router.refresh();
  }

  async function devolver() {
    if (!emprestimo) return;
    setError("");
    setLoading(true);
    const res = await fetch(`/api/chaves/${chave.id}/emprestimos/${emprestimo.id}`, { method: "PATCH" });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível registrar a devolução.");
      return;
    }

    // NOVO
    showToast(`Chave "${chave.sala}" devolvida.`);
    router.refresh();
  }

  return (
    <Card className="flex flex-col p-4">
      {/* Nome da sala numa linha própria, largura total do card — antes disputava
          espaço com badge+botões na mesma linha e espremia (cortava ou quebrava
          palavra por palavra em nomes longos como "Laboratório de Ciências"). */}
      <p
        className="mb-2 overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-cda-text"
        title={chave.sala}
      >
        {chave.sala}
      </p>
      <div className="mb-2 flex items-center justify-between gap-2">
        <Badge variant={emprestimo ? "amber" : "green"}>{emprestimo ? "Emprestada" : "Disponível"}</Badge>
        <div className="flex shrink-0 items-center gap-1">
          <IconButton icon={Pencil} label="Editar chave" onClick={() => setEditando(true)} />
          <IconButton icon={Trash2} label="Excluir chave" variant="danger" onClick={() => setConfirmandoExclusao(true)} />
        </div>
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
      {error && !open && <p className="mt-2 text-xs text-cda-red">{error}</p>}

      <Modal open={open} onClose={() => setOpen(false)} title={`Retirar chave — ${chave.sala}`}>
        <form onSubmit={retirar} className="flex flex-col gap-4">
          <Combobox
            label="Responsável pela retirada"
            items={funcionarios}
            value={funcionarioId || null}
            onChange={(id) => setFuncionarioId(id ?? "")}
            getId={(f) => f.id}
            getLabel={(f) => f.nome}
            getAvatar={(f) => ({ nome: f.nome })}
            placeholder="Selecione o funcionário"
            countNoun="funcionários"
            required
          />
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading} disabled={!funcionarioId}>
              Confirmar retirada
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={editando} onClose={() => setEditando(false)} title="Editar chave">
        <form onSubmit={salvarEdicao} className="flex flex-col gap-4">
          <Input label="Sala" name="sala" required defaultValue={chave.sala} />
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmandoExclusao}
        onClose={() => setConfirmandoExclusao(false)}
        onConfirm={excluir}
        title={`Excluir a chave "${chave.sala}"?`}
        confirmLabel="Excluir chave"
        loading={excluindo}
      />
    </Card>
  );
}
