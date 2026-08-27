"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCw, Trash2 } from "lucide-react";
import type { StatusBoleto } from "@prisma/client";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { formatarData, formatarMoeda } from "@/lib/utils";

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

function formatarCompetencia(c: string) {
  const [ano, mes] = c.split("-");
  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const idx = Number(mes) - 1;
  return idx >= 0 && idx < 12 ? `${MESES[idx]}/${ano}` : c;
}

export function BoletosTable({ boletos }: { boletos: BoletoLinha[] }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState<string | null>(null);

  async function reemitir(id: string) {
    setCarregando(id);
    const res = await fetch(`/api/boletos/${id}`, { method: "PATCH" });
    setCarregando(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Não foi possível tentar de novo.");
      return;
    }
    router.refresh();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir esse registro de boleto?")) return;
    setCarregando(id);
    const res = await fetch(`/api/boletos/${id}`, { method: "DELETE" });
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
        <Th>Vencimento</Th>
        <Th>Status</Th>
        <Th>{""}</Th>
      </TableHead>
      <TableBody>
        {boletos.length === 0 && <TableEmpty colSpan={6}>Nenhum boleto lançado ainda.</TableEmpty>}
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
            <Td>
              <div className="flex items-center gap-3">
                {b.status !== "REGISTRADO" && b.status !== "PAGO" && (
                  <button
                    onClick={() => reemitir(b.id)}
                    disabled={carregando === b.id}
                    title="Tentar registrar de novo"
                    className="text-cda-text3 hover:text-cda-blue disabled:opacity-50"
                  >
                    <RotateCw className="h-4 w-4" />
                  </button>
                )}
                {b.status !== "REGISTRADO" && b.status !== "PAGO" && (
                  <button
                    onClick={() => excluir(b.id)}
                    disabled={carregando === b.id}
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
