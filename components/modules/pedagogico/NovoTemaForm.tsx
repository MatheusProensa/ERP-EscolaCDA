"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

/** Formulário de cadastro de tema pronto — a coordenação prepara o "roteiro"
 * (achado confirmado, out/2026), a professora só escolhe o tema e preenche
 * dia a dia em cima dele no planejamento semanal. */
export function NovoTemaForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/temas-planejamento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: fd.get("titulo"), estrutura: fd.get("estrutura") }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível criar o tema.");
      return;
    }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Título do tema" name="titulo" placeholder="ex.: Animais da Fazenda" required autoFocus />
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-cda-text2">
          Roteiro/estrutura (opcional) — o que a professora deve cobrir nessa semana
        </label>
        <textarea
          name="estrutura"
          rows={5}
          placeholder="Sugestões de atividades, objetivos, materiais..."
          className="w-full rounded-lg border border-cda-border bg-white px-3 py-2 text-sm text-cda-text outline-none transition-colors focus:border-cda-blue"
        />
      </div>
      {error && <p className="text-sm text-cda-red">{error}</p>}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          Criar tema
        </Button>
      </div>
    </form>
  );
}
