"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

/** Formulário de "novo aviso" isolado do gatilho/Modal — reaproveitado tanto
 * pelo botão padrão do Mural (NovoAvisoModal) quanto pelo atalho rápido do
 * Dashboard (AtalhoNovoAviso), sem duplicar a lógica de envio. */
export function NovoAvisoForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/mural", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: fd.get("titulo"),
        conteudo: fd.get("conteudo"),
        fixado: fd.get("fixado") === "on",
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível criar o aviso.");
      return;
    }

    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Título" name="titulo" required />
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-cda-text2">Conteúdo</label>
        <textarea
          name="conteudo"
          required
          rows={4}
          className="w-full rounded-lg border border-cda-border bg-white px-3 py-2 text-sm text-cda-text outline-none transition-colors focus:border-cda-blue"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-cda-text2">
        <input type="checkbox" name="fixado" className="h-4 w-4 rounded border-cda-border" />
        Fixar no topo do mural
      </label>
      {error && <p className="text-sm text-cda-red">{error}</p>}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          Publicar aviso
        </Button>
      </div>
    </form>
  );
}
