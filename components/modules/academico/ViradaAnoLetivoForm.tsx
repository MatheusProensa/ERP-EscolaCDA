"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Turno } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

type TurmaAtual = { id: string; nome: string; turno: Turno; capacidade: number; matriculados: number };

type LinhaMapa = {
  turmaAtualId: string;
  naoPromove: boolean;
  novoNome: string;
  novoTurno: Turno;
  novaCapacidade: number;
};

export function ViradaAnoLetivoForm({ anoAtual, turmas }: { anoAtual: number; turmas: TurmaAtual[] }) {
  const router = useRouter();
  const [novoAno, setNovoAno] = useState(anoAtual + 1);
  const [linhas, setLinhas] = useState<LinhaMapa[]>(
    turmas.map((t) => ({
      turmaAtualId: t.id,
      naoPromove: false,
      novoNome: t.nome,
      novoTurno: t.turno,
      novaCapacidade: t.capacidade,
    }))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<{ totalPromovidos: number; totalConcluidos: number } | null>(null);

  function atualizarLinha(id: string, patch: Partial<LinhaMapa>) {
    setLinhas((atual) => atual.map((l) => (l.turmaAtualId === id ? { ...l, ...patch } : l)));
  }

  async function confirmar() {
    const totalAlunos = turmas.reduce((acc, t) => acc + t.matriculados, 0);
    if (
      !confirm(
        `Confirma a virada pro ano letivo ${novoAno}? Isso vai mexer na matrícula de ${totalAlunos} aluno(s) de uma vez — não dá pra desfazer sozinho depois.`
      )
    ) {
      return;
    }

    setError("");
    setLoading(true);
    const res = await fetch("/api/virada-ano-letivo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        novoAno,
        mapeamento: linhas.map((l) => ({
          turmaAtualId: l.turmaAtualId,
          novoNome: l.naoPromove ? null : l.novoNome,
          novoTurno: l.naoPromove ? null : l.novoTurno,
          novaCapacidade: l.naoPromove ? null : l.novaCapacidade,
        })),
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível concluir a virada de ano letivo.");
      return;
    }

    const data = await res.json();
    setResultado(data);
    router.refresh();
  }

  if (resultado) {
    return (
      <Card className="p-6 text-center">
        <p className="text-lg font-semibold text-cda-text">Virada de ano letivo concluída! 🎉</p>
        <p className="mt-2 text-sm text-cda-text2">
          {resultado.totalPromovidos} aluno(s) promovido(s) pra {novoAno}, {resultado.totalConcluidos} concluíram o
          ciclo.
        </p>
        <Button href="/academico/turmas" className="mt-4">
          Ver turmas de {novoAno}
        </Button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <Input
          label="Novo ano letivo"
          type="number"
          value={novoAno}
          onChange={(e) => setNovoAno(Number(e.target.value))}
          className="max-w-[160px]"
        />
      </Card>

      <Card title="Pra onde cada turma vai" className="p-5">
        <div className="flex flex-col gap-4">
          {turmas.map((t) => {
            const linha = linhas.find((l) => l.turmaAtualId === t.id)!;
            return (
              <div key={t.id} className="rounded-lg border border-cda-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-cda-text">{t.nome}</p>
                    <p className="text-xs text-cda-text3">{t.matriculados} aluno(s) ativo(s)</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-cda-text2">
                    <input
                      type="checkbox"
                      checked={linha.naoPromove}
                      onChange={(e) => atualizarLinha(t.id, { naoPromove: e.target.checked })}
                      className="h-4 w-4 rounded border-cda-border"
                    />
                    Não promove (conclui o ciclo)
                  </label>
                </div>
                {!linha.naoPromove && (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Input
                      label="Vira a turma"
                      value={linha.novoNome}
                      onChange={(e) => atualizarLinha(t.id, { novoNome: e.target.value })}
                    />
                    <Select
                      label="Turno"
                      value={linha.novoTurno}
                      onChange={(e) => atualizarLinha(t.id, { novoTurno: e.target.value as Turno })}
                    >
                      <option value="MANHA">Manhã</option>
                      <option value="TARDE">Tarde</option>
                    </Select>
                    <Input
                      label="Capacidade"
                      type="number"
                      value={linha.novaCapacidade}
                      onChange={(e) => atualizarLinha(t.id, { novaCapacidade: Number(e.target.value) })}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {error && <p className="text-sm text-cda-red">{error}</p>}

      <div className="flex justify-end">
        <Button onClick={confirmar} loading={loading} className="bg-cda-red hover:bg-cda-red/90">
          Confirmar virada de ano letivo
        </Button>
      </div>
    </div>
  );
}
