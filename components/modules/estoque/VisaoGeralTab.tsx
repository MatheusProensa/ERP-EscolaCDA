import Link from "next/link";
import { Boxes, ArrowDownToLine, ArrowUpFromLine, TriangleAlert } from "lucide-react";
import type { ItemEstoque, MovimentacaoEstoque } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import { StatusEstoquePill } from "./EstoqueVisuais";
import { statusEstoque } from "@/lib/estoqueStatus";

type MovimentacaoComItem = MovimentacaoEstoque & { item: ItemEstoque };

function KpiCard({
  icon: Icon,
  cor,
  label,
  valor,
  sub,
}: {
  icon: typeof Boxes;
  cor: string;
  label: string;
  valor: number;
  sub: string;
}) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${cor}1A`, color: cor }}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs text-cda-text3">{label}</p>
          <p className="text-xl font-bold text-cda-text">{valor}</p>
        </div>
      </div>
      <p className="text-xs text-cda-text3">{sub}</p>
    </Card>
  );
}

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
        <KpiCard icon={Boxes} cor="#1A6FD8" label="Itens cadastrados" valor={itens.length} sub="No catálogo" />
        <KpiCard icon={ArrowDownToLine} cor="#16A34A" label="Entradas (mês)" valor={entradasMes} sub="Unidades recebidas" />
        <KpiCard icon={ArrowUpFromLine} cor="#D97706" label="Saídas (mês)" valor={saidasMes} sub="Unidades retiradas" />
        <KpiCard icon={TriangleAlert} cor="#DC2626" label="Itens críticos" valor={criticos.length} sub="Precisam de atenção" />
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
              {criticos.length === 0 && <TableEmpty colSpan={3}>Nenhum item abaixo do mínimo 🎉</TableEmpty>}
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
                    <span
                      className="rounded-md px-2 py-0.5 text-xs font-semibold"
                      style={{
                        backgroundColor: mov.tipo === "ENTRADA" ? "#16A34A1A" : "#D977061A",
                        color: mov.tipo === "ENTRADA" ? "#16A34A" : "#D97706",
                      }}
                    >
                      {mov.tipo === "ENTRADA" ? "Entrada" : "Saída"}
                    </span>
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
