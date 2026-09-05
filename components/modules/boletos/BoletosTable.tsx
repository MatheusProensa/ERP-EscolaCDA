"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCw, Trash2 } from "lucide-react";
import type { StatusBoleto } from "@prisma/client";
import { Table, TableHead, Th, ThActions, TableBody, Tr, Td, TdActions, TableEmpty } from "@/components/ui/Table";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { showToast } from "@/components/ui/Toast";
import { formatarData, formatarMoeda, formatarCompetencia } from "@/lib/utils";

const STATUS_LABEL: Record<StatusBoleto, string> = {
  PENDENTE: "Pendente",
  REGISTRADO: "Registrado",
  ERRO: "Erro",
  PAGO: "Pago",
  CANCELADO: "Cancelado",
};

const STATUS_VARIANT: Record<StatusBoleto, BadgeVariant> = {
  PENDENTE: "gray",
  REGISTRADO: "blue",
  ERRO: "red",
  PAGO: "green",
  CANCELADO: "gray",
};

export type BoletoLinha = {
  id: string;
  competencia: string;
  valor: number;
  vencimento: Date;
  status: StatusBoleto;
  nossoNumero: string | null;
  mensagemErro: string | null;
  dataRegistro: Date | null;
  aluno: { id: string; nome: string };
};

export function BoletosTable({ boletos, podeEditar = true }: { boletos: BoletoLinha[]; podeEditar?: boolean }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  async function reemitir(id: string) {
    setCarregando(id);
    const res = await fetch(`/api/boletos/${id}`, { method: "PATCH" });
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
    const res = await fetch(`/api/boletos/${id}`, { method: "DELETE" });
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
        <Th>Vencimento</Th>
        <Th>Status</Th>
        {podeEditar && <ThActions />}
      </TableHead>
      <TableBody>
        {boletos.length === 0 && <TableEmpty colSpan={podeEditar ? 6 : 5}>Nenhum boleto lançado ainda.</TableEmpty>}
        {boletos.map((b) => (
          <Tr key={b.id}>
            <Td className="font-medium">{b.aluno.nome}</Td>
            <Td>{formatarCompetencia(b.competencia)}</Td>
            <Td>{formatarMoeda(b.valor)}</Td>
            <Td>{formatarData(b.vencimento)}</Td>
            <Td>
              <div className="flex flex-col gap-0.5">
                <Badge variant={STATUS_VARIANT[b.status]}>{STATUS_LABEL[b.status]}</Badge>
                {b.status === "REGISTRADO" && b.nossoNumero && (
                  <span className="text-xs text-cda-text3">
                    nº {b.nossoNumero} · {b.dataRegistro ? formatarData(b.dataRegistro) : ""}
                  </span>
                )}
                {b.status === "ERRO" && b.mensagemErro && (
                  <span className="max-w-xs text-xs text-cda-red">{b.mensagemErro}</span>
                )}
              </div>
            </Td>
            {podeEditar && (
              <TdActions>
                {b.status !== "REGISTRADO" && b.status !== "PAGO" && (
                  <IconButton
                    icon={RotateCw}
                    label="Tentar registrar de novo"
                    size="sm"
                    disabled={carregando === b.id}
                    onClick={() => reemitir(b.id)}
                  />
                )}
                {b.status !== "REGISTRADO" && b.status !== "PAGO" && (
                  <IconButton
                    icon={Trash2}
                    label="Excluir boleto"
                    size="sm"
                    variant="danger"
                    disabled={carregando === b.id}
                    onClick={() => setExcluindo(b.id)}
                  />
                )}
              </TdActions>
            )}
          </Tr>
        ))}
      </TableBody>

      <ConfirmDialog
        open={excluindo !== null}
        onClose={() => setExcluindo(null)}
        onConfirm={() => excluindo && excluir(excluindo)}
        title="Excluir esse registro de boleto?"
        confirmLabel="Excluir"
        loading={carregando === excluindo}
      />
    </Table>
  );
}
