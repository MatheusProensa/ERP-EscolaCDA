"use client";

import { useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { showToast } from "@/components/ui/Toast";

type Aluno = { id: string; nome: string; status: "RASCUNHO" | "ENVIADO" };

/** Visão geral de um ciclo de parecer — texto compartilhado da turma (editado
 * 1 vez só, achado real: no .docx entregue é 1 bloco igual pra todo mundo) +
 * lista de alunos com status, cada um levando pro parecer individual dele. */
export function ParecerCicloClient({
  parecerId,
  turmaId,
  textoTurmaInicial,
  podeEditar,
  alunos,
}: {
  parecerId: string;
  turmaId: string;
  textoTurmaInicial: string;
  podeEditar: boolean;
  alunos: Aluno[];
}) {
  const [textoTurma, setTextoTurma] = useState(textoTurmaInicial);
  const [salvando, setSalvando] = useState(false);

  async function salvarTextoTurma() {
    setSalvando(true);
    const res = await fetch(`/api/pareceres/${parecerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ textoTurma }),
    });
    setSalvando(false);
    if (!res.ok) {
      showToast("Não foi possível salvar o texto da turma.", "error");
      return;
    }
    showToast("Texto da turma salvo.");
  }

  return (
    <div className="flex flex-col gap-5">
      <Card title="Texto sobre a turma" className="p-0">
        <div className="flex flex-col gap-3 p-5">
          <p className="text-xs text-cda-text3">Igual pra todos os alunos desse período — escreve 1 vez só.</p>
          <textarea
            value={textoTurma}
            onChange={(e) => setTextoTurma(e.target.value)}
            disabled={!podeEditar}
            rows={5}
            className="w-full rounded-lg border border-cda-border bg-white px-3 py-2 text-sm text-cda-text outline-none transition-colors focus:border-cda-blue disabled:bg-cda-bg disabled:text-cda-text3"
          />
          {podeEditar && (
            <Button onClick={salvarTextoTurma} loading={salvando} size="sm" className="self-end">
              Salvar texto da turma
            </Button>
          )}
        </div>
      </Card>

      <Card
        title={
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-cda-blue" />
            Alunos ({alunos.length})
          </div>
        }
      >
        <div className="flex flex-col divide-y divide-cda-border">
          {alunos.map((aluno) => (
            <Link
              key={aluno.id}
              href={`/pedagogico/parecer/${turmaId}/${parecerId}/${aluno.id}`}
              className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-cda-bg"
            >
              <span className="text-sm text-cda-text">{aluno.nome}</span>
              <Badge variant={aluno.status === "ENVIADO" ? "success" : "warning"}>
                {aluno.status === "ENVIADO" ? "Enviado" : "Rascunho"}
              </Badge>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
