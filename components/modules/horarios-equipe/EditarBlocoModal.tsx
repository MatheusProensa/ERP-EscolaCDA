"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { IconButton } from "@/components/ui/IconButton";
import { showToast } from "@/components/ui/Toast";
import type { ItemEscalaBloco, PessoaEvento } from "./types";

function EditorPessoas({
  titulo,
  itens,
  onChange,
}: {
  titulo: string;
  itens: PessoaEvento[];
  onChange: (itens: PessoaEvento[]) => void;
}) {
  function set(i: number, campo: keyof PessoaEvento, valor: string) {
    onChange(itens.map((it, idx) => (idx === i ? { ...it, [campo]: valor } : it)));
  }
  function remover(i: number) {
    onChange(itens.filter((_, idx) => idx !== i));
  }
  function adicionar() {
    onChange([...itens, { pessoa: "", horario: "", nota: "" }]);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-cda-text2">{titulo}</label>
      <p className="text-xs text-cda-text3">
        Horário fica de fora se você não souber a hora exata — a tela usa lista simples nesse caso, sem inventar.
      </p>
      <div className="flex flex-col gap-2">
        {itens.map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={it.pessoa}
              onChange={(e) => set(i, "pessoa", e.target.value)}
              placeholder="Nome"
              className="h-9 w-[26%] rounded-lg border border-cda-border bg-white px-2.5 text-sm text-cda-text outline-none focus:border-cda-blue"
            />
            <input
              value={it.horario ?? ""}
              onChange={(e) => set(i, "horario", e.target.value)}
              placeholder="Hora"
              className="h-9 w-[18%] shrink-0 rounded-lg border border-cda-border bg-white px-2.5 text-sm text-cda-text outline-none focus:border-cda-blue"
            />
            <input
              value={it.nota}
              onChange={(e) => set(i, "nota", e.target.value)}
              placeholder="Ex.: início do turno, vem do CTI..."
              className="h-9 flex-1 rounded-lg border border-cda-border bg-white px-2.5 text-sm text-cda-text outline-none focus:border-cda-blue"
            />
            <IconButton icon={Trash2} label="Remover" size="sm" variant="danger" onClick={() => remover(i)} />
          </div>
        ))}
        <button
          type="button"
          onClick={adicionar}
          className="flex h-9 items-center gap-1.5 self-start rounded-lg border border-dashed border-cda-border px-2.5 text-xs font-medium text-cda-text3 hover:border-cda-blue hover:text-cda-blue"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </button>
      </div>
    </div>
  );
}

export function EditarBlocoModal({ bloco, onClose }: { bloco: ItemEscalaBloco | null; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [horarios, setHorarios] = useState("");
  const [entradas, setEntradas] = useState<PessoaEvento[]>([]);
  const [saidas, setSaidas] = useState<PessoaEvento[]>([]);
  const [conteudoLivre, setConteudoLivre] = useState("");

  // Reseta o formulário sempre que abre um bloco diferente — o modal fica
  // sempre montado (controlado pelo pai), então sem isso o estado do bloco
  // anterior vazava pro próximo ao trocar de "Editar" sem fechar antes.
  useEffect(() => {
    if (!bloco) return;
    setTitulo(bloco.titulo);
    setHorarios(bloco.horariosReferencia.join(", "));
    setEntradas(bloco.entradas ?? []);
    setSaidas(bloco.saidas ?? []);
    setConteudoLivre(bloco.conteudoLivre ?? "");
  }, [bloco]);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!bloco) return;
    setLoading(true);
    const res = await fetch(`/api/horarios-equipe/${bloco.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo,
        horariosReferencia: horarios
          .split(",")
          .map((h) => h.trim())
          .filter(Boolean),
        entradas: entradas.filter((it) => it.pessoa.trim()),
        saidas: saidas.filter((it) => it.pessoa.trim()),
        conteudoLivre: bloco.tipo === "NOTA" ? conteudoLivre : undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      showToast("Não foi possível salvar. Tente de novo.", "error");
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <Modal open={!!bloco} onClose={onClose} title="Editar bloco da escala" className="max-w-2xl">
      {bloco && (
        <form onSubmit={salvar} className="flex flex-col gap-4">
          <Input label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
          <Input
            label="Horários de referência (opcional)"
            value={horarios}
            onChange={(e) => setHorarios(e.target.value)}
            placeholder="Ex.: 7h, 12h15, 12h55, 13h15, 18h15"
          />

          {bloco.tipo === "TURNO" ? (
            <>
              <EditorPessoas titulo="Entradas" itens={entradas} onChange={setEntradas} />
              <EditorPessoas titulo="Saídas" itens={saidas} onChange={setSaidas} />
            </>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-cda-text2">Conteúdo</label>
              <textarea
                value={conteudoLivre}
                onChange={(e) => setConteudoLivre(e.target.value)}
                rows={8}
                className="w-full rounded-lg border border-cda-border bg-white px-3 py-2 text-sm text-cda-text outline-none focus:border-cda-blue"
              />
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Salvar
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
