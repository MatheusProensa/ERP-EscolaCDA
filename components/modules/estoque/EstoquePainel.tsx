"use client";

import { useState } from "react";
import type { Aluno, ControleMaterial, ItemEstoque, Matricula, MovimentacaoEstoque } from "@prisma/client";
import { cn } from "@/lib/utils";
import { VisaoGeralTab } from "./VisaoGeralTab";
import { MateriaisTab } from "./MateriaisTab";
import { MovimentacoesTab } from "./MovimentacoesTab";
import { ControleMaterialTab } from "./ControleMaterialTab";

type MovimentacaoComItem = MovimentacaoEstoque & { item: ItemEstoque };
type TurmaComAlunos = { id: string; nome: string; matriculas: (Matricula & { aluno: Aluno; controleMaterial: ControleMaterial | null })[] };
type Aba = "visao-geral" | "materiais" | "movimentacoes" | "controle-material";

const ABAS: { valor: Aba; label: string }[] = [
  { valor: "visao-geral", label: "Visão geral" },
  { valor: "materiais", label: "Materiais" },
  { valor: "movimentacoes", label: "Movimentações" },
  { valor: "controle-material", label: "Materiais por turma" },
];

export function EstoquePainel({
  itens,
  movimentacoes,
  entradasMes,
  saidasMes,
  turmas,
}: {
  itens: ItemEstoque[];
  movimentacoes: MovimentacaoComItem[];
  entradasMes: number;
  saidasMes: number;
  turmas: TurmaComAlunos[];
}) {
  const [aba, setAba] = useState<Aba>("visao-geral");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 border-b border-cda-border">
        {ABAS.map((a) => (
          <button
            key={a.valor}
            onClick={() => setAba(a.valor)}
            className={cn(
              "border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              aba === a.valor
                ? "border-cda-blue text-cda-blue"
                : "border-transparent text-cda-text3 hover:text-cda-text2"
            )}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === "visao-geral" && (
        <VisaoGeralTab
          itens={itens}
          movimentacoesRecentes={movimentacoes}
          entradasMes={entradasMes}
          saidasMes={saidasMes}
          onVerMateriais={() => setAba("materiais")}
          onVerMovimentacoes={() => setAba("movimentacoes")}
        />
      )}
      {aba === "materiais" && <MateriaisTab itens={itens} />}
      {aba === "movimentacoes" && <MovimentacoesTab movimentacoes={movimentacoes} />}
      {aba === "controle-material" && <ControleMaterialTab turmas={turmas} />}
    </div>
  );
}
