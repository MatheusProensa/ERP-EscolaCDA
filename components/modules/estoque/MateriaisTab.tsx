"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Download, FileText } from "lucide-react";
import type { ItemEstoque } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import { Segmented } from "@/components/ui/Segmented";
import { StockBar, StatusEstoquePill, CategoriaCell } from "./EstoqueVisuais";
import { ItemMenu } from "./ItemMenu";
import { MovimentacaoModal } from "./MovimentacaoModal";
import { EditarItemModal } from "./EditarItemModal";
import { AjusteEstoqueModal } from "./AjusteEstoqueModal";
import { statusEstoque, type StatusEstoque } from "@/lib/estoqueStatus";

export function MateriaisTab({ itens }: { itens: ItemEstoque[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusEstoque | "todos">("todos");
  const [itemMovimentacao, setItemMovimentacao] = useState<{ item: ItemEstoque; tipo: "ENTRADA" | "SAIDA" } | null>(null);
  const [itemEditar, setItemEditar] = useState<ItemEstoque | null>(null);
  const [itemAjuste, setItemAjuste] = useState<ItemEstoque | null>(null);

  async function excluirItem(item: ItemEstoque) {
    if (!confirm(`Excluir "${item.nome}" do estoque? O histórico de movimentações também será removido.`)) return;
    const res = await fetch(`/api/estoque/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Não foi possível excluir o item.");
      return;
    }
    router.refresh();
  }

  const contagens = { todos: itens.length, ok: 0, baixa: 0, crit: 0, zero: 0 };
  itens.forEach((i) => contagens[statusEstoque(i.quantidade, i.minimo)]++);

  const filtrados = itens.filter((i) => {
    if (filtroStatus !== "todos" && statusEstoque(i.quantidade, i.minimo) !== filtroStatus) return false;
    if (busca && !i.nome.toLowerCase().includes(busca.toLowerCase()) && !i.categoria.toLowerCase().includes(busca.toLowerCase()))
      return false;
    return true;
  });

  const paramsExport = new URLSearchParams();
  if (filtroStatus !== "todos") paramsExport.set("status", filtroStatus);
  if (busca) paramsExport.set("busca", busca);
  const qs = paramsExport.toString();
  const hrefBase = qs ? `/api/relatorios/estoque?${qs}` : "/api/relatorios/estoque";
  const hrefPdf = qs ? `${hrefBase}&formato=pdf` : `${hrefBase}?formato=pdf`;

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
          href={hrefBase}
          className="flex items-center gap-1.5 rounded-lg border border-cda-border bg-white px-3 py-1.5 text-xs font-medium text-cda-text hover:bg-cda-bg"
        >
          <Download className="h-3.5 w-3.5" />
          CSV
        </a>
        <a
          href={hrefPdf}
          className="flex items-center gap-1.5 rounded-lg border border-cda-border bg-white px-3 py-1.5 text-xs font-medium text-cda-text hover:bg-cda-bg"
        >
          <FileText className="h-3.5 w-3.5" />
          PDF
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
                <Td className="font-medium">
                  {item.nome}
                  {item.localizacao && (
                    <span className="block text-xs font-normal text-cda-text3">{item.localizacao}</span>
                  )}
                </Td>
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
                      onAjuste={() => setItemAjuste(item)}
                      onEditar={() => setItemEditar(item)}
                      onExcluir={() => excluirItem(item)}
                    />
                  </div>
                </Td>
              </Tr>
            ))}
          </TableBody>
        </Table>
      </Card>

      <MovimentacaoModal
        key={itemMovimentacao ? `${itemMovimentacao.item.id}-${itemMovimentacao.tipo}` : "vazio"}
        item={itemMovimentacao?.item ?? null}
        tipoInicial={itemMovimentacao?.tipo}
        onClose={() => setItemMovimentacao(null)}
      />
      <EditarItemModal item={itemEditar} onClose={() => setItemEditar(null)} />
      <AjusteEstoqueModal item={itemAjuste} onClose={() => setItemAjuste(null)} />
    </div>
  );
}
