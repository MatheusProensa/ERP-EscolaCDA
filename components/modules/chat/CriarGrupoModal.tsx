"use client";

import { useState, type FormEvent } from "react";
import { UsersRound } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ROLE_LABEL } from "@/lib/permissoes";

type UsuarioSelecionavel = { id: string; name: string; role: string };

export function CriarGrupoModal({
  usuarios,
  onCriado,
}: {
  usuarios: UsuarioSelecionavel[];
  onCriado: (grupo: { id: string; nome: string; tipo: "GRUPO" }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [membros, setMembros] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function alternar(id: string) {
    setMembros((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function fechar() {
    setOpen(false);
    setNome("");
    setMembros(new Set());
    setError("");
  }

  async function criar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim() || membros.size === 0) return;
    setError("");
    setLoading(true);
    const res = await fetch("/api/grupos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nome.trim(), membros: Array.from(membros) }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível criar o grupo.");
      return;
    }
    const grupo = await res.json();
    onCriado(grupo);
    fechar();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Criar grupo"
        aria-label="Criar grupo"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-cda-text2 hover:bg-cda-bg hover:text-cda-blue"
      >
        <UsersRound className="h-4 w-4" />
      </button>

      <Modal open={open} onClose={fechar} title="Criar grupo">
        <form onSubmit={criar} className="flex flex-col gap-4">
          <Input
            label="Nome do grupo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Coordenação Manhã"
            required
          />
          <div>
            <p className="mb-1.5 text-sm font-medium text-cda-text">Participantes</p>
            <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto rounded-lg border border-cda-border p-1.5">
              {usuarios.map((u) => (
                <label
                  key={u.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-cda-bg"
                >
                  <input
                    type="checkbox"
                    checked={membros.has(u.id)}
                    onChange={() => alternar(u.id)}
                    className="h-4 w-4 rounded border-cda-border"
                  />
                  <span className="flex-1 text-cda-text">{u.name}</span>
                  <span className="text-xs text-cda-text3">{ROLE_LABEL[u.role] ?? u.role}</span>
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-cda-red">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={fechar}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading} disabled={!nome.trim() || membros.size === 0}>
              Criar grupo
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
