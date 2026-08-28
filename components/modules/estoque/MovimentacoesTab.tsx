"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Undo2, Search } from "lucide-react";
import type { ItemEstoque, MovimentacaoEstoque } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { MOV_INFO } from "@/lib/estoqueStatus";
import { formatarDataHora } from "@/lib/utils";

type MovimentacaoComItem = MovimentacaoEstoque & { item: ItemEstoque };

export function MovimentacoesTab({ movimentacoes: movimentacoesIniciais }: { movimentacoes: MovimentacaoComItem[] }) {
  const router = useRouter();
  const [movimentacoes, setMovimentacoes] = useState(movimentacoesIniciais);
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [estornandoId, setEstornandoId] = useState<string | null>(null);
  // A página só traz as 100 mais recentes — "temMais" indica se dá pra buscar um
  // lote mais antigo ainda (movimentação é um log que só cresce com o tempo).
  const [temMais, setTemMais] = useState(movimentacoesIniciais.length === 100);
  const [carregandoMais, setCarregandoMais] = useState(false);

  async function carregarMais() {
    if (movimentacoes.length === 0 || carregandoMais) return;
    setCarregandoMais(true);
    try {
      const maisAntiga = movimentacoes[movimentacoes.length - 1].createdAt;
      const res = await fetch(`/api/estoque/movimentacoes?antes=${encodeURIComponent(new Date(maisAntiga).toISOString())}`);
      if (!res.ok) throw new Error("resposta não-ok");
      const { movimentacoes: antigas, temMais: maisAntigasDisponiveis } = await res.json();
      setMovimentacoes((atual) => [...atual, ...antigas]);
      setTemMais(maisAntigasDisponiveis);
    } catch {
      // silencioso — o botão continua ali pra tentar de novo
    } finally {
      setCarregandoMais(false);
    }
  }

  async function estornar(mov: MovimentacaoComItem) {
    if (!confirm(`Estornar esta movimentação de "${mov.item.nome}"? O saldo do item volta ao estado anterior.`)) return;
    setEstornandoId(mov.id);
    const res = await fetch(`/api/estoque/movimentacoes/${mov.id}/estornar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setEstornandoId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Não foi possível estornar a movimentação.");
      return;
    }
    router.refresh();
  }

  const filtradas = useMemo(() => {
    return movimentacoes.filter((mov) => {
      if (tipoFiltro && mov.tipo !== tipoFiltro) return false;
      if (busca) {
        const alvo = `${mov.item.nome} ${mov.responsavel ?? ""} ${mov.destino ?? ""}`.toLowerCase();
        if (!alvo.includes(busca.toLowerCase())) return false;
      }
      return true;
    });
  }, [movimentacoes, busca, tipoFiltro]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-72">
          <Input
            placeholder="Buscar item, responsável, destino..."
            icon={<Search className="h-4 w-4" />}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}>
            <option value="">Todos os tipos</option>
            <option value="ENTRADA">Entrada</option>
            <option value="SAIDA">Saída</option>
            <option value="AJUSTE">Ajuste</option>
            <option value="ESTORNO">Estorno</option>
          </Select>
        </div>
      </div>

      <Card title={`${filtradas.length} movimentação(ões)`}>
        <Table>
          <TableHead>
            <Th>Tipo</Th>
            <Th>Item</Th>
            <Th className="text-right">Quantidade</Th>
            <Th>Responsável</Th>
            <Th>Destino</Th>
            <Th>Motivo</Th>
            <Th>Data</Th>
            <Th> </Th>
          </TableHead>
          <TableBody>
            {filtradas.length === 0 && <TableEmpty colSpan={8}>Nenhuma movimentação registrada.</TableEmpty>}
            {filtradas.map((mov) => {
              const estilo = MOV_INFO[mov.tipo];
              const podeEstornar = !mov.anulada && mov.tipo !== "ESTORNO";
              return (
                <Tr key={mov.id} className={mov.anulada ? "opacity-50" : ""}>
                  <Td>
                    <Badge variant={estilo.variant}>{estilo.label}</Badge>
                    {mov.anulada && <span className="ml-1.5 text-xs text-cda-text3">(anulada)</span>}
                  </Td>
                  <Td className="font-medium">{mov.item.nome}</Td>
                  <Td className="text-right">
                    {mov.quantidade >= 0 ? estilo.sinal || "+" : ""}
                    {mov.quantidade} {mov.item.unidade}
                  </Td>
                  <Td className="text-cda-text2">{mov.responsavel ?? "—"}</Td>
                  <Td className="text-cda-text2">{mov.destino ?? "—"}</Td>
                  <Td className="text-cda-text2">{mov.motivo ?? "—"}</Td>
                  <Td className="text-cda-text3">{formatarDataHora(mov.createdAt)}</Td>
                  <Td>
                    {podeEstornar && (
                      <button
                        onClick={() => estornar(mov)}
                        disabled={estornandoId === mov.id}
                        title="Estornar movimentação"
                        className="text-cda-text3 hover:text-cda-red disabled:opacity-50"
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </TableBody>
        </Table>
        {temMais && (
          <div className="flex justify-center border-t border-cda-border py-3">
            <button
              onClick={carregarMais}
              disabled={carregandoMais}
              className="text-sm font-medium text-cda-blue hover:underline disabled:opacity-50"
            >
              {carregandoMais ? "Carregando..." : "Carregar movimentações mais antigas"}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
