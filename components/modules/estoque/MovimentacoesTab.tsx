import type { ItemEstoque, MovimentacaoEstoque } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import { formatarDataHora } from "@/lib/utils";

type MovimentacaoComItem = MovimentacaoEstoque & { item: ItemEstoque };

export function MovimentacoesTab({ movimentacoes }: { movimentacoes: MovimentacaoComItem[] }) {
  return (
    <Card title={`${movimentacoes.length} movimentação(ões)`}>
      <Table>
        <TableHead>
          <Th>Tipo</Th>
          <Th>Item</Th>
          <Th className="text-right">Quantidade</Th>
          <Th>Responsável</Th>
          <Th>Motivo</Th>
          <Th>Data</Th>
        </TableHead>
        <TableBody>
          {movimentacoes.length === 0 && <TableEmpty colSpan={6}>Nenhuma movimentação registrada.</TableEmpty>}
          {movimentacoes.map((mov) => (
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
              <Td className="font-medium">{mov.item.nome}</Td>
              <Td className="text-right">
                {mov.tipo === "ENTRADA" ? "+" : "-"}
                {mov.quantidade} {mov.item.unidade}
              </Td>
              <Td className="text-cda-text2">{mov.responsavel ?? "—"}</Td>
              <Td className="text-cda-text2">{mov.motivo ?? "—"}</Td>
              <Td className="text-cda-text3">{formatarDataHora(mov.createdAt)}</Td>
            </Tr>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
