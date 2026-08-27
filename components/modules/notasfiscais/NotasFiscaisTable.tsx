"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCw, Trash2 } from "lucide-react";
import type { StatusNotaFiscal } from "@prisma/client";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { formatarData, formatarMoeda } from "@/lib/utils";

const STATUS_LABEL: Record<StatusNotaFiscal, string> = {
  PENDENTE: "Pendente",
  EMITIDA: "Emitida",
  ERRO: "Erro",
  CANCELADA: "Cancelada",
};

const STATUS_VARIANT: Record<StatusNotaFiscal, BadgeVariant> = {
  PENDENTE: "gray",
  EMITIDA: "green",
  ERRO: "red",
  CANCELADA: "gray",
};

export type NotaFiscalLinha = {
  id: string;
  competencia: string;
  valorServico: number;
  status: StatusNotaFiscal;
  numeroNota: string | null;
  mensagemErro: string | null;
  dataEmissao: Date | null;
  createdAt: Date;
  aluno: { id: string; nome: string };
};

function formatarCompetencia(c: string) {
  const [ano, mes] = c.split("-");
  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const idx = Number(mes) - 1;
  return idx >= 0 && idx < 12 ? `${MESES[idx]}/${ano}` : c;
}

export function NotasFiscaisTable({ notas }: { notas: NotaFiscalLinha[] }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState<string | null>(null);

  async function reemitir(id: string) {
    setCarregando(id);
    const res = await fetch(`/api/notas-fiscais/${id}`, { method: "PATCH" });
    setCarregando(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Não foi possível tentar de novo.");
      return;
    }
    router.refresh();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir esse registro de nota fiscal?")) return;
    setCarregando(id);
    const res = await fetch(`/api/notas-fiscais/${id}`, { method: "DELETE" });
    setCarregando(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Não foi possível excluir.");
      return;
    }
    router.refresh();
  }

  return (
    <Table>
      <TableHead>
        <Th>Aluno</Th>
        <Th>Competência</Th>
        <Th>Valor</Th>
        <Th>Status</Th>
        <Th>{""}</Th>
      </TableHead>
      <TableBody>
        {notas.length === 0 && <TableEmpty colSpan={5}>Nenhuma nota fiscal lançada ainda.</TableEmpty>}
        {notas.map((n) => (
          <Tr key={n.id}>
            <Td className="font-medium">{n.aluno.nome}</Td>
            <Td>{formatarCompetencia(n.competencia)}</Td>
            <Td>{formatarMoeda(n.valorServico)}</Td>
            <Td>
              <div className="flex flex-col gap-0.5">
                <Badge variant={STATUS_VARIANT[n.status]}>{STATUS_LABEL[n.status]}</Badge>
                {n.status === "EMITIDA" && n.numeroNota && (
                  <span className="text-xs text-cda-text3">
                    nº {n.numeroNota} · {n.dataEmissao ? formatarData(n.dataEmissao) : ""}
                  </span>
                )}
                {n.status === "ERRO" && n.mensagemErro && (
                  <span className="max-w-xs text-xs text-cda-red">{n.mensagemErro}</span>
                )}
              </div>
            </Td>
            <Td>
              <div className="flex items-center gap-3">
                {n.status !== "EMITIDA" && (
                  <button
                    onClick={() => reemitir(n.id)}
                    disabled={carregando === n.id}
                    title="Tentar emitir de novo"
                    className="text-cda-text3 hover:text-cda-blue disabled:opacity-50"
                  >
                    <RotateCw className="h-4 w-4" />
                  </button>
                )}
                {n.status !== "EMITIDA" && (
                  <button
                    onClick={() => excluir(n.id)}
                    disabled={carregando === n.id}
                    title="Excluir"
                    className="text-cda-text3 hover:text-cda-red disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </Td>
          </Tr>
        ))}
      </TableBody>
    </Table>
  );
}
