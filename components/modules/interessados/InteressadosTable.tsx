"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MessageCircle, Pencil } from "lucide-react";
import type { Turma } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Segmented } from "@/components/ui/Segmented";
import { IconButton } from "@/components/ui/IconButton";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import { showToast } from "@/components/ui/Toast";
import { formatarData, formatarTelefone, linkWhatsApp } from "@/lib/utils";
import { STATUS_INTERESSADO_BADGE } from "@/lib/statusVisual";
import { EditarInteressadoModal } from "./EditarInteressadoModal";
import type { ItemInteressado } from "./types";

// Agrupamento pro filtro rápido do topo — a Duda pensa em "quem falta ligar"
// vs. "quem já visitou" vs. "fechado", não nos 10 status um por um (esses
// continuam completos no seletor de cada linha).
const GRUPOS: { chave: string; label: string; status: string[] | null }[] = [
  { chave: "todos", label: "Todos", status: null },
  { chave: "andamento", label: "Em andamento", status: ["AGUARDANDO", "CONTATADO", "CHAMAR_NOVAMENTE", "NAO_RESPONDEU", "PORTAS_ABERTAS"] },
  { chave: "visitou", label: "Visitou, sem retorno", status: ["SEM_RETORNO_APOS_VISITA"] },
  { chave: "matriculado", label: "Matriculado", status: ["MATRICULADO"] },
  { chave: "nao-avancou", label: "Não avançou", status: ["NAO_TEM_INTERESSE", "VALOR_ULTRAPASSA", "DESISTIU"] },
];

export function InteressadosTable({ itens, turmas }: { itens: ItemInteressado[]; turmas: Turma[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [grupo, setGrupo] = useState("todos");
  const [carregando, setCarregando] = useState<string | null>(null);
  const [editando, setEditando] = useState<ItemInteressado | null>(null);

  async function alterarStatus(id: string, status: string) {
    setCarregando(id);
    try {
      const res = await fetch(`/api/interessados/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      showToast("Não foi possível atualizar o status. Tente de novo.", "error");
    } finally {
      setCarregando(null);
    }
  }

  const contagens = useMemo(() => {
    const c: Record<string, number> = { todos: itens.length };
    for (const g of GRUPOS.slice(1)) c[g.chave] = itens.filter((i) => g.status!.includes(i.status)).length;
    return c;
  }, [itens]);

  const filtrados = useMemo(() => {
    const grupoAtivo = GRUPOS.find((g) => g.chave === grupo);
    return itens.filter((i) => {
      if (grupoAtivo?.status && !grupoAtivo.status.includes(i.status)) return false;
      if (busca) {
        const alvo = `${i.nomeCrianca} ${i.nomeResponsavel}`.toLowerCase();
        if (!alvo.includes(busca.toLowerCase())) return false;
      }
      return true;
    });
  }, [itens, grupo, busca]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-64">
          <Input
            placeholder="Buscar criança ou responsável..."
            icon={<Search className="h-4 w-4" />}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Segmented
          value={grupo}
          onChange={setGrupo}
          options={GRUPOS.map((g) => ({ value: g.chave, label: g.label, count: contagens[g.chave] }))}
        />
      </div>

      <Card>
        <Table>
          <TableHead>
            <Th>Criança</Th>
            <Th>Responsável</Th>
            <Th>Interesse</Th>
            <Th>O que busca</Th>
            <Th>1º contato</Th>
            <Th>Visita</Th>
            <Th>Status</Th>
            <Th>{""}</Th>
          </TableHead>
          <TableBody>
            {filtrados.length === 0 && <TableEmpty colSpan={8}>Nenhum interessado encontrado.</TableEmpty>}
            {filtrados.map((item) => {
              return (
                <Tr key={item.id}>
                  <Td className="font-medium">
                    {item.nomeCrianca}
                    {item.dataNascimento && <div className="mt-0.5 text-xs text-cda-text3">{formatarData(item.dataNascimento)}</div>}
                  </Td>
                  <Td>
                    {item.nomeResponsavel}
                    {item.parentescoContato && <span className="ml-1 text-xs text-cda-text3">({item.parentescoContato})</span>}
                    <a
                      href={linkWhatsApp(item.telefoneResponsavel)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Chamar no WhatsApp"
                      className="mt-0.5 flex items-center gap-1 text-xs text-cda-text3 hover:text-cda-green"
                    >
                      <MessageCircle className="h-3 w-3" />
                      {formatarTelefone(item.telefoneResponsavel)}
                    </a>
                  </Td>
                  <Td className="text-cda-text2">
                    {item.turmaDesejada?.nome ?? item.interesseTexto ?? <span className="text-cda-text3">—</span>}
                  </Td>
                  <Td className="max-w-[220px]">
                    {item.oQueBusca ? (
                      <span className="line-clamp-2 text-xs text-cda-text2" title={item.oQueBusca}>
                        {item.oQueBusca}
                      </span>
                    ) : (
                      <span className="text-cda-text3">—</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-cda-text2">
                    {item.dataPrimeiroContato ? formatarData(item.dataPrimeiroContato) : "—"}
                  </Td>
                  <Td className="whitespace-nowrap text-cda-text2">{item.dataVisita ? formatarData(item.dataVisita) : "—"}</Td>
                  <Td>
                    <Select
                      value={item.status}
                      disabled={carregando === item.id}
                      onChange={(e) => alterarStatus(item.id, e.target.value)}
                      className="h-8 w-[180px] text-xs"
                    >
                      {Object.entries(STATUS_INTERESSADO_BADGE).map(([valor, { label }]) => (
                        <option key={valor} value={valor}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </Td>
                  <Td>
                    <IconButton icon={Pencil} label="Editar interessado" size="sm" onClick={() => setEditando(item)} />
                  </Td>
                </Tr>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <EditarInteressadoModal item={editando} turmas={turmas} onClose={() => setEditando(null)} />
    </>
  );
}
