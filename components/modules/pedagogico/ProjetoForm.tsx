"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export type ProjetoPedagogicoDTO = {
  id: string;
  nome: string;
  interessesObservados: string | null;
  necessidadesObservadas: string | null;
  acoesNarrativasPerguntas: string | null;
  intencionalidades: string | null;
  justificativa: string | null;
};

const CAMPOS: { chave: keyof ProjetoPedagogicoDTO; label: string; ajuda: string }[] = [
  {
    chave: "interessesObservados",
    label: "Interesses observados nas crianças",
    ajuda: "O que as atitudes, falas, brincadeiras e vivências das crianças mostram que elas já sabem e querem saber sobre o tema.",
  },
  {
    chave: "necessidadesObservadas",
    label: "Necessidades observadas nas crianças",
    ajuda: "Dificuldades, dúvidas e curiosidades das crianças que indicam o que precisam aprender sobre o tema.",
  },
  {
    chave: "acoesNarrativasPerguntas",
    label: "Ações, narrativas e/ou perguntas que partiram das crianças",
    ajuda: "Brincadeiras, desenhos, histórias e perguntas que as crianças criaram, representando seus interesses e necessidades.",
  },
  {
    chave: "intencionalidades",
    label: "Intencionalidades e expectativas com esse projeto",
    ajuda: "O que você, como professora, espera e deseja proporcionar para as crianças com esse projeto.",
  },
  {
    chave: "justificativa",
    label: "Justificativa do projeto",
    ajuda: "Por que esse projeto é importante pras crianças, considerando os pontos acima.",
  },
];

/** Formulário de projeto pedagógico — mesma estrutura do documento real
 * "PROJETO PEDAGÓGICO" que a escola já usa (achado real, set/2026). Serve
 * tanto pra abrir um projeto novo (encerra o anterior) quanto pra editar o
 * atual (os campos vão sendo complementados ao longo do projeto). */
export function ProjetoForm({
  turmaId,
  projetoInicial,
  onSuccess,
  onCancel,
}: {
  turmaId: string;
  projetoInicial?: ProjetoPedagogicoDTO;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const nome = String(fd.get("nome") ?? "").trim();
    if (!nome) {
      setError("Dê um nome pro projeto.");
      return;
    }
    setLoading(true);
    const body: Record<string, string> = { nome };
    for (const campo of CAMPOS) body[campo.chave] = String(fd.get(campo.chave) ?? "");

    const url = projetoInicial ? `/api/projetos-pedagogicos/${projetoInicial.id}` : "/api/projetos-pedagogicos";
    const res = await fetch(url, {
      method: projetoInicial ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projetoInicial ? body : { turmaId, ...body }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível salvar o projeto.");
      return;
    }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!projetoInicial && (
        <p className="rounded-lg bg-cda-bg px-3 py-2 text-xs text-cda-text2">
          Abrir um projeto novo encerra o projeto atual da turma (ele continua no histórico).
        </p>
      )}
      <Input
        label="Nome do projeto"
        name="nome"
        defaultValue={projetoInicial?.nome ?? ""}
        placeholder='Dê o nome só depois que o projeto ganhar forma, ex.: "Animais da Fazenda"'
        required
        autoFocus
      />
      {CAMPOS.map((campo) => (
        <div key={campo.chave} className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-cda-text2">{campo.label}</label>
          <p className="text-xs text-cda-text3">{campo.ajuda}</p>
          <textarea
            name={campo.chave}
            defaultValue={projetoInicial?.[campo.chave] ?? ""}
            rows={3}
            className="w-full rounded-lg border border-cda-border bg-white px-3 py-2 text-sm text-cda-text outline-none transition-colors focus:border-cda-blue"
          />
        </div>
      ))}
      {error && <p className="text-sm text-cda-red">{error}</p>}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          {projetoInicial ? "Salvar alterações" : "Abrir projeto"}
        </Button>
      </div>
    </form>
  );
}
