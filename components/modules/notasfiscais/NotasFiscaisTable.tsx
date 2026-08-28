"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCw, Trash2 } from "lucide-react";
import type { StatusNotaFiscal } from "@prisma/client";
import { Table, TableHead, Th, ThActions, TableBody, Tr, Td, TdActions, TableEmpty } from "@/components/ui/Table";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { showToast } from "@/components/ui/Toast";
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
  const [excluindo, setExcluindo] = useState<string | null>(null);

  async function reemitir(id: string) {
    setCarregando(id);
    const res = await fetch(`/api/notas-fiscais/${id}`, { method: "PATCH" });
    setCarregando(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "Não foi possível tentar de novo.", "error");
      return;
    }
    router.refresh();
  }

  async function excluir(id: string) {
    setCarregando(id);
    const res = await fetch(`/api/notas-fiscais/${id}`, { method: "DELETE" });
    setCarregando(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "Não foi possível excluir.", "error");
      return;
    }
    setExcluindo(null);
    router.refresh();
  }

  return (
    <Table>
      <TableHead>
        <Th>Aluno</Th>
        <Th>Competência</Th>
        <Th>Valor</Th>
        <Th>Status</Th>
        <ThActions />
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
            <TdActions>
              {n.status !== "EMITIDA" && (
                <IconButton
                  icon={RotateCw}
                  label="Tentar emitir de novo"
                  size="sm"
                  disabled={carregando === n.id}
                  onClick={() => reemitir(n.id)}
                />
              )}
              {n.status !== "EMITIDA" && (
                <IconButton
                  icon={Trash2}
                  label="Excluir nota fiscal"
                  size="sm"
                  variant="danger"
                  disabled={carregando === n.id}
                  onClick={() => setExcluindo(n.id)}
                />
              )}
            </TdActions>
          </Tr>
        ))}
      </TableBody>

      <ConfirmDialog
        open={excluindo !== null}
        onClose={() => setExcluindo(null)}
        onConfirm={() => excluindo && excluir(excluindo)}
        title="Excluir esse registro de nota fiscal?"
        confirmLabel="Excluir"
        loading={carregando === excluindo}
      />
    </Table>
  );
}
