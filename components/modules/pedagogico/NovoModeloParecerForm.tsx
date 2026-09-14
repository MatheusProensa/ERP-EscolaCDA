"use client";

import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

type ParagrafoForm = { titulo: string; perguntaNorteadora: string };

const PARAGRAFO_VAZIO: ParagrafoForm = { titulo: "", perguntaNorteadora: "" };

/** Cadastro do modelo de parecer de uma turma — a regente monta a lista de
 * parágrafos (título + pergunta norteadora) que vai guiar a escrita, um por
 * um, igual o PDF de orientação real que a escola já usa hoje (Conteúdo +
 * Perguntas Norteadoras por parágrafo). Por turma desde set/2026. */
export function NovoModeloParecerForm({
  turmaId,
  onSuccess,
  onCancel,
}: {
  turmaId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [paragrafos, setParagrafos] = useState<ParagrafoForm[]>([{ ...PARAGRAFO_VAZIO }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function atualizarParagrafo(i: number, campo: keyof ParagrafoForm, valor: string) {
    setParagrafos((atual) => atual.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)));
  }

  function adicionarParagrafo() {
    setParagrafos((atual) => [...atual, { ...PARAGRAFO_VAZIO }]);
  }

  function removerParagrafo(i: number) {
    setParagrafos((atual) => atual.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const validos = paragrafos.filter((p) => p.titulo.trim());
    if (validos.length === 0) {
      setError("Adicione pelo menos 1 parágrafo com título.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/modelos-parecer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turmaId, titulo, paragrafos: validos }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível criar o modelo.");
      return;
    }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Título do modelo"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="ex.: Berçário I — 1º Semestre"
        required
        autoFocus
      />

      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium text-cda-text2">Parágrafos guiados</p>
        {paragrafos.map((p, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg border border-cda-border p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <Input
                  placeholder={`Título do parágrafo ${i + 1} (ex.: Acolhida e Adaptação)`}
                  value={p.titulo}
                  onChange={(e) => atualizarParagrafo(i, "titulo", e.target.value)}
                />
              </div>
              {paragrafos.length > 1 && (
                <IconButton icon={Trash2} label="Remover parágrafo" variant="danger" size="sm" onClick={() => removerParagrafo(i)} />
              )}
            </div>
            <textarea
              placeholder="Pergunta norteadora (opcional) — o que a professora deve pensar pra escrever esse parágrafo"
              value={p.perguntaNorteadora}
              onChange={(e) => atualizarParagrafo(i, "perguntaNorteadora", e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-cda-border bg-white px-3 py-2 text-sm text-cda-text outline-none transition-colors focus:border-cda-blue"
            />
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={adicionarParagrafo} className="self-start">
          <Plus className="h-3.5 w-3.5" />
          Adicionar parágrafo
        </Button>
      </div>

      {error && <p className="text-sm text-cda-red">{error}</p>}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          Criar modelo
        </Button>
      </div>
    </form>
  );
}
