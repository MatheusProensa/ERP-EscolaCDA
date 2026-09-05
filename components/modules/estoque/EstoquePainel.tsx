"use client";

import { useState } from "react";
import type { ItemEstoque, MovimentacaoEstoque } from "@prisma/client";
import { Tabs } from "@/components/ui/Tabs";
import { VisaoGeralTab } from "./VisaoGeralTab";
import { MateriaisTab } from "./MateriaisTab";
import { MovimentacoesTab } from "./MovimentacoesTab";

type MovimentacaoComItem = MovimentacaoEstoque & { item: ItemEstoque };
type Aba = "visao-geral" | "materiais" | "movimentacoes";

// Seções dentro da mesma página → <Tabs> (handoff de design, etapa 4.7),
// extraído do padrão de sublinhado que esta tela já usava.
const ABAS: { value: Aba; label: string }[] = [
  { value: "visao-geral", label: "Visão geral" },
  { value: "materiais", label: "Materiais" },
  { value: "movimentacoes", label: "Movimentações" },
];

export function EstoquePainel({
  itens,
  movimentacoes,
  entradasMes,
  saidasMes,
  podeEditar = true,
}: {
  itens: ItemEstoque[];
  movimentacoes: MovimentacaoComItem[];
  entradasMes: number;
  saidasMes: number;
  podeEditar?: boolean;
}) {
  const [aba, setAba] = useState<Aba>("visao-geral");

  return (
    <div className="flex flex-col gap-4">
      <Tabs tabs={ABAS} value={aba} onChange={setAba} />

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
      {aba === "materiais" && <MateriaisTab itens={itens} podeEditar={podeEditar} />}
      {aba === "movimentacoes" && <MovimentacoesTab movimentacoes={movimentacoes} podeEditar={podeEditar} />}
    </div>
  );
}
