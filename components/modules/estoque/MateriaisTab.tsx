"use client";

import { useState } from "react";
import { Search, Download } from "lucide-react";
import type { ItemEstoque } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import { Segmented } from "@/components/ui/Segmented";
import { StockBar, StatusEstoquePill, CategoriaCell } from "./EstoqueVisuais";
import { ItemMenu } from "./ItemMenu";
import { MovimentacaoModal } from "./MovimentacaoModal";
import { EditarItemModal } from "./EditarItemModal";
import { statusEstoque, type StatusEstoque } from "@/lib/estoqueStatus";

export function MateriaisTab({ itens }: { itens: ItemEstoque[] }) {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusEstoque | "todos">("todos");
  const [itemMovimentacao, setItemMovimentacao] = useState<{ item: ItemEstoque; tipo: "ENTRADA" | "SAIDA" } | null>(null);
  const [itemEditar, setItemEditar] = useState<ItemEstoque | null>(null);

  const contagens = { todos: itens.length, ok: 0, baixa: 0, crit: 0, zero: 0 };
  itens.forEach((i) => contagens[statusEstoque(i.quantidade, i.minimo)]++);

  const filtrados = itens.filter((i) => {
    if (filtroStatus !== "todos" && statusEstoque(i.quantidade, i.minimo) !== filtroStatus) return false;
    if (busca && !i.nome.toLowerCase().includes(busca.toLowerCase()) && !i.categoria.toLowerCase().includes(busca.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-72">
          <Input placeholder="Buscar item ou categoria..." icon={<Search className="h-4 w-4" />} value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Segmented
          value={filtroStatus}
          onChange={setFiltroStatus}
          options={[
            { value: "todos", label: "Todos", count: contagens.todos },
            { value: "baixa", label: "Atenção", count: contagens.baixa },
            { value: "crit", label: "Crítico", count: contagens.crit },
            { value: "zero", label: "Zerado", count: contagens.zero },
          ]}
        />
        <div className="flex-1" />
        <a
          href="/api/relatorios/estoque"
          className="flex items-center gap-1.5 rounded-lg border border-cda-border bg-white px-3 py-1.5 text-xs font-medium text-cda-text hover:bg-cda-bg"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar CSV
        </a>
      </div>

      <Card>
        <Table>
          <TableHead>
            <Th>Item</Th>
            <Th>Categoria</Th>
            <Th className="text-right">Estoque</Th>
            <Th className="text-right">Mínimo</Th>
            <Th>Situação</Th>
            <Th> </Th>
          </TableHead>
          <TableBody>
            {filtrados.length === 0 && <TableEmpty colSpan={6}>Nenhum item encontrado.</TableEmpty>}
            {filtrados.map((item) => (
              <Tr key={item.id}>
                <Td className="font-medium">{item.nome}</Td>
                <Td>
                  <CategoriaCell categoria={item.categoria} />
                </Td>
                <Td>
                  <div className="flex justify-end">
                    <StockBar quantidade={item.quantidade} minimo={item.minimo} />
                  </div>
                </Td>
                <Td>
                  <span className="text-xs text-cda-text3">
                    {item.minimo} {item.unidade}
                  </span>
                </Td>
                <Td>
                  <StatusEstoquePill status={statusEstoque(item.quantidade, item.minimo)} />
                </Td>
                <Td>
                  <div className="flex justify-end">
                    <ItemMenu
                      onEntrada={() => setItemMovimentacao({ item, tipo: "ENTRADA" })}
                      onSaida={() => setItemMovimentacao({ item, tipo: "SAIDA" })}
                      onEditar={() => setItemEditar(item)}
                    />
                  </div>
                </Td>
              </Tr>
            ))}
          </TableBody>
        </Table>
      </Card>

      <MovimentacaoModal
        item={itemMovimentacao?.item ?? null}
        tipoInicial={itemMovimentacao?.tipo}
        onClose={() => setItemMovimentacao(null)}
      />
      <EditarItemModal item={itemEditar} onClose={() => setItemEditar(null)} />
    </div>
  );
}
