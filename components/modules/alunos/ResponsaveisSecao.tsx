"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Phone, Mail, Pencil, Trash2, Plus } from "lucide-react";
import type { Responsavel } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { showToast } from "@/components/ui/Toast";
import { formatarTelefone } from "@/lib/utils";

function CamposResponsavel({ responsavel }: { responsavel?: Responsavel }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="Nome" name="nome" required defaultValue={responsavel?.nome ?? ""} className="sm:col-span-2" />
        <Select label="Parentesco" name="parentesco" defaultValue={responsavel?.parentesco ?? "Mãe"}>
          {["Mãe", "Pai", "Avó", "Avô", "Tia", "Tio", "Responsável"].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <Input label="Telefone" name="telefone" required defaultValue={responsavel?.telefone ?? ""} />
        <Input label="E-mail" name="email" type="email" defaultValue={responsavel?.email ?? ""} />
        <Input label="CPF" name="cpf" defaultValue={responsavel?.cpf ?? ""} />
      </div>
      <label className="flex items-center gap-2 text-sm text-cda-text2">
        <input
          type="checkbox"
          name="autorizado"
          defaultChecked={responsavel?.autorizado ?? true}
          className="h-4 w-4 rounded border-cda-border"
        />
        Autorizado a retirar a criança
      </label>
    </div>
  );
}

export function ResponsaveisSecao({ alunoId, responsaveis }: { alunoId: string; responsaveis: Responsavel[] }) {
  const router = useRouter();
  const [novo, setNovo] = useState(false);
  const [editando, setEditando] = useState<Responsavel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  function lerPayload(fd: FormData) {
    return {
      nome: fd.get("nome"),
      parentesco: fd.get("parentesco"),
      telefone: fd.get("telefone"),
      email: fd.get("email") || null,
      cpf: fd.get("cpf") || null,
      autorizado: fd.get("autorizado") === "on",
    };
  }

  async function criar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch(`/api/alunos/${alunoId}/responsaveis`, {
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
    const res = await fetch(`/api/responsaveis/${editando.id}`, {
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
    const res = await fetch(`/api/responsaveis/${id}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      showToast("Não foi possível excluir.", "error");
      return;
    }
    setExcluindoId(null);
    router.refresh();
  }

  return (
    <Card title="Responsáveis" action={<Button size="sm" variant="ghost" onClick={() => setNovo(true)}><Plus className="h-3.5 w-3.5" />Adicionar</Button>} className="h-fit">
      <div className="flex flex-col divide-y divide-cda-border">
        {responsaveis.length === 0 && (
          <p className="px-5 py-6 text-center text-sm text-cda-text3">Nenhum responsável cadastrado.</p>
        )}
        {responsaveis.map((r) => (
          <div key={r.id} className="px-5 py-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-cda-text">{r.nome}</span>
              <div className="flex shrink-0 items-center gap-1">
                {r.autorizado && <Badge variant="green">Autorizado</Badge>}
                <button onClick={() => setEditando(r)} title="Editar" className="text-cda-text3 hover:text-cda-blue">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setExcluindoId(r.id)} title="Excluir" className="text-cda-text3 hover:text-cda-red">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <p className="mt-0.5 text-xs text-cda-text3">{r.parentesco}</p>
            <div className="mt-2 flex flex-col gap-1 text-sm text-cda-text2">
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                {formatarTelefone(r.telefone)}
              </span>
              {r.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {r.email}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal open={novo} onClose={() => setNovo(false)} title="Adicionar responsável">
        <form onSubmit={criar} className="flex flex-col gap-4">
          <CamposResponsavel />
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

      <Modal open={!!editando} onClose={() => setEditando(null)} title="Editar responsável">
        {editando && (
          <form onSubmit={salvar} className="flex flex-col gap-4">
            <CamposResponsavel responsavel={editando} />
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
        title="Excluir este responsável?"
        confirmLabel="Excluir"
        loading={loading}
      />
    </Card>
  );
}
