import { Boxes, ArrowDownToLine, ArrowUpFromLine, TriangleAlert } from "lucide-react";
import type { ItemEstoque, MovimentacaoEstoque } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { MetricCard } from "@/components/ui/MetricCard";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { StatusEstoquePill } from "./EstoqueVisuais";
import { statusEstoque, MOV_INFO } from "@/lib/estoqueStatus";

type MovimentacaoComItem = MovimentacaoEstoque & { item: ItemEstoque };

export function VisaoGeralTab({
  itens,
  movimentacoesRecentes,
  entradasMes,
  saidasMes,
  onVerMateriais,
  onVerMovimentacoes,
}: {
  itens: ItemEstoque[];
  movimentacoesRecentes: MovimentacaoComItem[];
  entradasMes: number;
  saidasMes: number;
  onVerMateriais: () => void;
  onVerMovimentacoes: () => void;
}) {
  const criticos = itens
    .filter((i) => statusEstoque(i.quantidade, i.minimo) !== "ok")
    .sort((a, b) => a.quantidade / (a.minimo || 1) - b.quantidade / (b.minimo || 1));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard icon={Boxes} tone="neutral" label="Itens cadastrados" value={itens.length} subtext="No catálogo" />
        <MetricCard icon={ArrowDownToLine} tone="success" label="Entradas (mês)" value={entradasMes} subtext="Unidades recebidas" />
        <MetricCard icon={ArrowUpFromLine} tone="warning" label="Saídas (mês)" value={saidasMes} subtext="Unidades retiradas" />
        <MetricCard icon={TriangleAlert} tone={criticos.length > 0 ? "danger" : "neutral"} label="Itens críticos" value={criticos.length} subtext="Precisam de atenção" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="Estoque baixo"
          action={
            <button onClick={onVerMateriais} className="text-xs font-medium text-cda-blue hover:underline">
              Ver todos
            </button>
          }
        >
          <Table>
            <TableHead>
              <Th>Item</Th>
              <Th className="text-right">Atual</Th>
              <Th>Situação</Th>
            </TableHead>
            <TableBody>
              {criticos.length === 0 && <TableEmpty colSpan={3}>Nenhum item abaixo do mínimo</TableEmpty>}
              {criticos.slice(0, 6).map((item) => (
                <Tr key={item.id}>
                  <Td className="font-medium">{item.nome}</Td>
                  <Td className="text-right">
                    {item.quantidade} {item.unidade}
                  </Td>
                  <Td>
                    <StatusEstoquePill status={statusEstoque(item.quantidade, item.minimo)} />
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card
          title="Últimas movimentações"
          action={
            <button onClick={onVerMovimentacoes} className="text-xs font-medium text-cda-blue hover:underline">
              Ver todas
            </button>
          }
        >
          <Table>
            <TableHead>
              <Th>Tipo</Th>
              <Th>Item</Th>
              <Th className="text-right">Qtde</Th>
            </TableHead>
            <TableBody>
              {movimentacoesRecentes.length === 0 && (
                <TableEmpty colSpan={3}>Nenhuma movimentação registrada.</TableEmpty>
              )}
              {movimentacoesRecentes.slice(0, 6).map((mov) => (
                <Tr key={mov.id}>
                  <Td>
                    <Badge variant={MOV_INFO[mov.tipo].variant}>{MOV_INFO[mov.tipo].label}</Badge>
                  </Td>
                  <Td>{mov.item.nome}</Td>
                  <Td className="text-right">{mov.quantidade}</Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
