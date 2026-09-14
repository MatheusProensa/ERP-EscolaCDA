"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { showToast } from "@/components/ui/Toast";

type Paragrafo = { id: string; titulo: string; perguntaNorteadora: string | null; conteudo: string };

/** Escrita guiada por parágrafo — cada parágrafo do modelo vira um bloco
 * separado, com a pergunta norteadora do PDF de orientação real logo abaixo
 * do título, servindo de guia sem precisar abrir outro arquivo do lado
 * (achado forte, out/2026, direto dos PDFs de orientação da escola). */
export function ParecerAlunoClient({ parecerId, alunoId, turmaId }: { parecerId: string; alunoId: string; turmaId: string }) {
  const [alunoNome, setAlunoNome] = useState("");
  const [turmaNome, setTurmaNome] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [status, setStatus] = useState<"RASCUNHO" | "ENVIADO">("RASCUNHO");
  const [podeEditar, setPodeEditar] = useState(false);
  const [paragrafos, setParagrafos] = useState<Paragrafo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      setCarregando(true);
      const res = await fetch(`/api/pareceres/${parecerId}/alunos/${alunoId}`);
      if (cancelado) return;
      if (!res.ok) {
        setCarregando(false);
        setErro("Não foi possível carregar o parecer.");
        return;
      }
      const data = await res.json();
      if (cancelado) return;
      setAlunoNome(data.alunoNome);
      setTurmaNome(data.turmaNome);
      setPeriodo(data.periodo);
      setStatus(data.status);
      setPodeEditar(data.podeEditar);
      setParagrafos(data.paragrafos);
      setCarregando(false);
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, [parecerId, alunoId]);

  function atualizarParagrafo(id: string, conteudo: string) {
    setParagrafos((atual) => atual.map((p) => (p.id === id ? { ...p, conteudo } : p)));
  }

  async function salvar(novoStatus?: "ENVIADO") {
    setSalvando(true);
    setErro("");
    const res = await fetch(`/api/pareceres/${parecerId}/alunos/${alunoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paragrafos: paragrafos.map((p) => ({ id: p.id, conteudo: p.conteudo })),
        status: novoStatus,
      }),
    });
    setSalvando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Não foi possível salvar.");
      return;
    }
    if (novoStatus) setStatus(novoStatus);
    showToast(novoStatus === "ENVIADO" ? "Parecer marcado como enviado." : "Rascunho salvo.");
  }

  if (carregando) return <p className="text-sm text-cda-text3">Carregando...</p>;

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/pedagogico/parecer/${turmaId}/${parecerId}`} className="inline-flex items-center gap-1.5 text-sm text-cda-text2 hover:text-cda-blue">
        <ArrowLeft className="h-4 w-4" />
        Voltar pra {turmaNome}
      </Link>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-cda-text">{alunoNome}</h2>
            <p className="text-xs text-cda-text3">
              {periodo} · {paragrafos.filter((p) => p.conteudo.trim()).length} de {paragrafos.length} parágrafos preenchidos
            </p>
          </div>
          <Badge variant={status === "ENVIADO" ? "success" : "warning"}>{status === "ENVIADO" ? "Enviado" : "Rascunho"}</Badge>
        </div>

        <div className="flex flex-col gap-5">
          {paragrafos.map((p) => (
            <div key={p.id} className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-cda-text">{p.titulo}</label>
              {p.perguntaNorteadora && <p className="text-xs text-cda-text3">{p.perguntaNorteadora}</p>}
              <textarea
                value={p.conteudo}
                onChange={(e) => atualizarParagrafo(p.id, e.target.value)}
                disabled={!podeEditar}
                rows={4}
                className="w-full rounded-lg border border-cda-border bg-white px-3 py-2 text-sm text-cda-text outline-none transition-colors focus:border-cda-blue disabled:bg-cda-bg disabled:text-cda-text3"
              />
            </div>
          ))}
        </div>

        {erro && <p className="mt-3 text-sm text-cda-red">{erro}</p>}

        {podeEditar && (
          <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-cda-border pt-4">
            <Button variant="outline" onClick={() => salvar()} loading={salvando}>
              Salvar rascunho
            </Button>
            <Button onClick={() => salvar("ENVIADO")} loading={salvando}>
              <CheckCircle2 className="h-4 w-4" />
              Marcar como enviado
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
