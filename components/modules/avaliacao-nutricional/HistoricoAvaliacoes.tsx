"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty, ThActions, TdActions } from "@/components/ui/Table";
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { showToast } from "@/components/ui/Toast";
import { GraficoCrescimento } from "./GraficoCrescimento";
import { ClassificacaoBadge } from "./ClassificacaoBadge";
import { avaliarImcPorIdade } from "@/lib/avaliacaoNutricional";
import { formatarData } from "@/lib/utils";

export type AvaliacaoParaExibir = {
  id: string;
  data: string; // ISO
  pesoKg: number;
  alturaCm: number;
  observacoes: string | null;
};

/** Data pura (yyyy-mm-dd) → rótulo curto "dd/mm" pro eixo do gráfico, lendo em
 * UTC — mesmo motivo de sempre: campo de data pura, não instante. */
function rotuloCurto(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function HistoricoAvaliacoes({
  avaliacoes,
  sexo,
  dataNascimento,
  podeEditar,
}: {
  avaliacoes: AvaliacaoParaExibir[];
  sexo: "M" | "F";
  dataNascimento: string; // ISO
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [excluindo, setExcluindo] = useState<AvaliacaoParaExibir | null>(null);
  const [loading, setLoading] = useState(false);

  // Mais recente primeiro na tabela, mais antiga primeiro no gráfico.
  const ordenadasDesc = useMemo(() => [...avaliacoes].sort((a, b) => b.data.localeCompare(a.data)), [avaliacoes]);
  const ordenadasAsc = useMemo(() => [...avaliacoes].sort((a, b) => a.data.localeCompare(b.data)), [avaliacoes]);

  const calculadas = ordenadasDesc.map((a) => ({
    ...a,
    resultado: avaliarImcPorIdade({
      sexo,
      dataNascimento: new Date(dataNascimento),
      dataAvaliacao: new Date(a.data),
      pesoKg: a.pesoKg,
      alturaCm: a.alturaCm,
    }),
  }));

  async function confirmarExclusao() {
    if (!excluindo) return;
    setLoading(true);
    const res = await fetch(`/api/avaliacoes-nutricionais/${excluindo.id}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      showToast("Não foi possível excluir a avaliação.", "error");
      return;
    }
    setExcluindo(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-2">
        <GraficoCrescimento
          titulo="Peso"
          unidade="kg"
          cor="var(--cda-blue)"
          pontos={ordenadasAsc.map((a) => ({ data: rotuloCurto(a.data), valor: a.pesoKg }))}
        />
        <GraficoCrescimento
          titulo="Altura"
          unidade="cm"
          cor="var(--cda-teal, #0d9488)"
          pontos={ordenadasAsc.map((a) => ({ data: rotuloCurto(a.data), valor: a.alturaCm }))}
        />
      </Card>

      <Card>
        <Table>
          <TableHead>
            <Th>Data</Th>
            <Th>Peso</Th>
            <Th>Altura</Th>
            <Th>IMC</Th>
            <Th>Diagnóstico</Th>
            {podeEditar && <ThActions />}
          </TableHead>
          <TableBody>
            {calculadas.length === 0 && (
              <TableEmpty colSpan={podeEditar ? 6 : 5}>Nenhuma avaliação registrada ainda.</TableEmpty>
            )}
            {calculadas.map((a) => (
              <Tr key={a.id}>
                <Td className="font-medium">{formatarData(a.data)}</Td>
                <Td>{a.pesoKg} kg</Td>
                <Td>{a.alturaCm} cm</Td>
                <Td>{a.resultado.imc.toFixed(1)}</Td>
                <Td>
                  <div className="flex flex-col gap-1">
                    <ClassificacaoBadge classificacao={a.resultado.classificacao} />
                    {a.resultado.foraDaFaixaEtaria && (
                      <span className="text-xs text-cda-text3">Fora da faixa 0-5 anos — aproximado</span>
                    )}
                  </div>
                </Td>
                {podeEditar && (
                  <TdActions>
                    <IconButton icon={Trash2} label="Excluir avaliação" variant="danger" onClick={() => setExcluindo(a)} />
                  </TdActions>
                )}
              </Tr>
            ))}
          </TableBody>
        </Table>
      </Card>

      <ConfirmDialog
        open={!!excluindo}
        onClose={() => setExcluindo(null)}
        onConfirm={confirmarExclusao}
        title="Excluir avaliação"
        consequence={excluindo ? `A avaliação de ${formatarData(excluindo.data)} (${excluindo.pesoKg}kg, ${excluindo.alturaCm}cm) some do histórico e do gráfico.` : undefined}
        confirmLabel="Excluir"
        loading={loading}
      />
    </div>
  );
}
