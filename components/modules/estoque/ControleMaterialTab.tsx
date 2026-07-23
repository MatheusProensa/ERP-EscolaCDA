"use client";

import { useState } from "react";
import type { Aluno, ControleMaterial, Matricula } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";

type MatriculaComAluno = Matricula & { aluno: Aluno; controleMaterial: ControleMaterial | null };
type TurmaComAlunos = { id: string; nome: string; matriculas: MatriculaComAluno[] };

export function ControleMaterialTab({ turmas }: { turmas: TurmaComAlunos[] }) {
  const comAlunos = turmas.filter((t) => t.matriculas.length > 0);
  const [turmaId, setTurmaId] = useState(comAlunos[0]?.id ?? "");
  const turma = comAlunos.find((t) => t.id === turmaId);

  if (comAlunos.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-cda-text3">
        Nenhuma turma com alunos matriculados no ano letivo atual.
      </Card>
    );
  }

  const pendentes = turma?.matriculas.filter((m) => !m.controleMaterial?.trouxe).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} className="max-w-xs">
          {comAlunos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome} ({t.matriculas.length} alunos)
            </option>
          ))}
        </Select>
        {turma && <Badge variant={pendentes > 0 ? "amber" : "green"}>{pendentes} pendente(s)</Badge>}
      </div>

      <Card>
        <div className="grid grid-cols-[1.5fr_2.5fr_1fr_0.8fr] gap-3 border-b border-cda-border px-5 py-3 text-xs font-medium uppercase tracking-wide text-cda-text3">
          <span>Aluno</span>
          <span>Materiais faltantes / prazo de reenvio</span>
          <span>Prazo</span>
          <span>Trouxe</span>
        </div>
        <div className="flex flex-col divide-y divide-cda-border">
          {turma?.matriculas.map((m) => <LinhaAluno key={m.id} matricula={m} />)}
        </div>
      </Card>
    </div>
  );
}

function LinhaAluno({ matricula }: { matricula: MatriculaComAluno }) {
  const [itensFaltantes, setItensFaltantes] = useState(matricula.controleMaterial?.itensFaltantes ?? "");
  const [prazoReenvio, setPrazoReenvio] = useState(
    matricula.controleMaterial?.prazoReenvio ? new Date(matricula.controleMaterial.prazoReenvio).toISOString().slice(0, 10) : ""
  );
  const [trouxe, setTrouxe] = useState(matricula.controleMaterial?.trouxe ?? false);
  const [salvando, setSalvando] = useState(false);

  async function salvar(dados: Partial<{ itensFaltantes: string; prazoReenvio: string | null; trouxe: boolean }>) {
    setSalvando(true);
    await fetch("/api/controle-material", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matriculaId: matricula.id,
        itensFaltantes,
        prazoReenvio: prazoReenvio || null,
        trouxe,
        ...dados,
      }),
    });
    setSalvando(false);
  }

  return (
    <div className="grid grid-cols-[1.5fr_2.5fr_1fr_0.8fr] items-center gap-3 px-5 py-2.5">
      <span className="truncate text-sm font-medium text-cda-text">{matricula.aluno.nome}</span>
      <input
        value={itensFaltantes}
        onChange={(e) => setItensFaltantes(e.target.value)}
        onBlur={() => salvar({ itensFaltantes })}
        placeholder="Material completo"
        className="h-9 w-full rounded-lg border border-cda-border bg-white px-3 text-sm text-cda-text outline-none focus:border-cda-blue disabled:opacity-50"
        disabled={salvando}
      />
      <input
        type="date"
        value={prazoReenvio}
        onChange={(e) => {
          setPrazoReenvio(e.target.value);
          salvar({ prazoReenvio: e.target.value || null });
        }}
        className="h-9 w-full rounded-lg border border-cda-border bg-white px-2 text-sm text-cda-text outline-none focus:border-cda-blue"
      />
      <label className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={trouxe}
          onChange={(e) => {
            setTrouxe(e.target.checked);
            salvar({ trouxe: e.target.checked });
          }}
          className="h-5 w-5 rounded border-cda-border text-cda-blue accent-cda-blue"
        />
      </label>
    </div>
  );
}
