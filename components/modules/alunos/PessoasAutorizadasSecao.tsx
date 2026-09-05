"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, UserCheck } from "lucide-react";
import type { PessoaAutorizada } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { showToast } from "@/components/ui/Toast";

function CamposPessoaAutorizada({ pessoa }: { pessoa?: PessoaAutorizada }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Input label="Nome" name="nome" required defaultValue={pessoa?.nome ?? ""} className="sm:col-span-2" />
      <Input
        label="Parentesco / vínculo"
        name="parentesco"
        placeholder="Ex.: Tio, Vizinha, Motorista escolar"
        defaultValue={pessoa?.parentesco ?? ""}
        className="col-span-2"
      />
    </div>
  );
}

// Pessoas além dos responsáveis que também podem buscar o aluno — mesma lista que
// aparece no final da Ficha de Matrícula, só que editável direto aqui no cadastro.
export function PessoasAutorizadasSecao({
  alunoId,
  pessoas,
  podeEditar = true,
}: {
  alunoId: string;
  pessoas: PessoaAutorizada[];
  podeEditar?: boolean;
}) {
  const router = useRouter();
  const [novo, setNovo] = useState(false);
  const [editando, setEditando] = useState<PessoaAutorizada | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  function lerPayload(fd: FormData) {
    return { nome: fd.get("nome"), parentesco: fd.get("parentesco") };
  }

  async function criar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch(`/api/alunos/${alunoId}/pessoas-autorizadas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lerPayload(new FormData(e.currentTarget))),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível adicionar.");
      return;
    }
    setNovo(false);
    router.refresh();
  }

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editando) return;
    setError("");
    setLoading(true);
    const res = await fetch(`/api/pessoas-autorizadas/${editando.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lerPayload(new FormData(e.currentTarget))),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível salvar.");
      return;
    }
    setEditando(null);
    router.refresh();
  }

  async function excluir(id: string) {
    setLoading(true);
    const res = await fetch(`/api/pessoas-autorizadas/${id}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      showToast("Não foi possível excluir.", "error");
      return;
    }
    setExcluindoId(null);
    router.refresh();
  }

  return (
    <Card
      title="Autorizados a buscar"
      action={
        podeEditar ? (
          <Button size="sm" variant="ghost" onClick={() => setNovo(true)}>
            <Plus className="h-3.5 w-3.5" />
            Adicionar
          </Button>
        ) : undefined
      }
      className="h-fit"
    >
      <div className="flex flex-col divide-y divide-cda-border">
        {pessoas.length === 0 && (
          <p className="px-5 py-6 text-center text-sm text-cda-text3">
            Nenhuma pessoa além dos responsáveis autorizada a buscar.
          </p>
        )}
        {pessoas.map((p) => (
          <div key={p.id} className="px-5 py-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-cda-text">
                <UserCheck className="h-3.5 w-3.5 text-cda-text3" />
                {p.nome}
              </span>
              {podeEditar && (
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={() => setEditando(p)} title="Editar" className="text-cda-text3 hover:text-cda-blue">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setExcluindoId(p.id)} title="Excluir" className="text-cda-text3 hover:text-cda-red">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
            <p className="mt-0.5 text-xs text-cda-text3">{p.parentesco}</p>
          </div>
        ))}
      </div>

      <Modal open={novo} onClose={() => setNovo(false)} title="Adicionar pessoa autorizada">
        <form onSubmit={criar} className="flex flex-col gap-4">
          <CamposPessoaAutorizada />
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setNovo(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Adicionar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editando} onClose={() => setEditando(null)} title="Editar pessoa autorizada">
        {editando && (
          <form onSubmit={salvar} className="flex flex-col gap-4">
            <CamposPessoaAutorizada pessoa={editando} />
            {error && <p className="text-sm text-cda-red">{error}</p>}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <Button type="submit" loading={loading}>
                Salvar
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={excluindoId !== null}
        onClose={() => setExcluindoId(null)}
        onConfirm={() => excluindoId && excluir(excluindoId)}
        title="Excluir esta pessoa autorizada?"
        confirmLabel="Excluir"
        loading={loading}
      />
    </Card>
  );
}
