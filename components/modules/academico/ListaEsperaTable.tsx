"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { StatusListaEspera } from "@prisma/client";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { showToast } from "@/components/ui/Toast";
import { formatarData, formatarTelefone } from "@/lib/utils";

const STATUS_LABEL: Record<StatusListaEspera, string> = {
  AGUARDANDO: "Aguardando",
  CONTATADO: "Contatado",
  MATRICULADO: "Matriculado",
  DESISTIU: "Desistiu",
};

export type ItemListaEspera = {
  id: string;
  nomeCrianca: string;
  dataNascimento: Date | null;
  nomeResponsavel: string;
  telefoneResponsavel: string;
  status: StatusListaEspera;
  createdAt: Date;
  turmaDesejada: { nome: string } | null;
};

export function ListaEsperaTable({ itens }: { itens: ItemListaEspera[] }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  async function alterarStatus(id: string, status: string) {
    setCarregando(id);
    try {
      const res = await fetch(`/api/lista-espera/${id}`, {
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

  async function excluir(id: string) {
    setCarregando(id);
    try {
      const res = await fetch(`/api/lista-espera/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setConfirmandoId(null);
      router.refresh();
    } catch {
      showToast("Não foi possível remover. Tente de novo.", "error");
    } finally {
      setCarregando(null);
    }
  }

  return (
    <Table>
      <TableHead>
        <Th>Criança</Th>
        <Th>Responsável</Th>
        <Th>Turma desejada</Th>
        <Th>Na lista desde</Th>
        <Th>Status</Th>
        <Th>{""}</Th>
      </TableHead>
      <TableBody>
        {itens.length === 0 && <TableEmpty colSpan={6}>Ninguém na lista de espera no momento.</TableEmpty>}
        {itens.map((item) => (
          <Tr key={item.id}>
            <Td className="font-medium">{item.nomeCrianca}</Td>
            <Td>
              {item.nomeResponsavel}
              <span className="block text-xs text-cda-text3">{formatarTelefone(item.telefoneResponsavel)}</span>
            </Td>
            <Td>{item.turmaDesejada?.nome ?? "—"}</Td>
            <Td>{formatarData(item.createdAt)}</Td>
            <Td>
              <Select
                value={item.status}
                disabled={carregando === item.id}
                onChange={(e) => alterarStatus(item.id, e.target.value)}
                className="h-8 w-36 text-xs"
              >
                {Object.entries(STATUS_LABEL).map(([valor, label]) => (
                  <option key={valor} value={valor}>
                    {label}
                  </option>
                ))}
              </Select>
            </Td>
            <Td>
              <button
                onClick={() => setConfirmandoId(item.id)}
                disabled={carregando === item.id}
                title="Remover"
                className="text-cda-text3 hover:text-cda-red disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Td>
          </Tr>
        ))}
      </TableBody>
      <ConfirmDialog
        open={confirmandoId !== null}
        onClose={() => setConfirmandoId(null)}
        onConfirm={() => confirmandoId && excluir(confirmandoId)}
        title="Remover da lista de espera?"
        consequence="Essa ação não pode ser desfeita."
        confirmLabel="Remover"
        loading={carregando !== null}
      />
    </Table>
  );
}
