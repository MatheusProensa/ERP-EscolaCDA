"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileDown, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import { formatarMinutos, type RegistroComSaldo } from "@/lib/ponto";
import { NovoRegistroPontoModal } from "./NovoRegistroPontoModal";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const OCORRENCIA_LABEL: Record<string, string> = {
  NORMAL: "Normal",
  FALTA: "Falta",
  FERIADO: "Feriado",
  FERIAS: "Férias",
  ATESTADO: "Atestado",
  FOLGA: "Folga",
  DSR: "DSR",
};

function formatarDataCurta(d: Date): string {
  return new Date(d).toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" });
}

export function PontoPainel({
  funcionarioId,
  registros,
  mesFiltro,
  anoFiltro,
}: {
  funcionarioId: string;
  registros: RegistroComSaldo[];
  mesFiltro: number;
  anoFiltro: number;
}) {
  const router = useRouter();
  const [modalAberto, setModalAberto] = useState(false);
  const [removendoId, setRemovendoId] = useState<string | null>(null);

  const anosDisponiveis = useMemo(() => {
    const anos = new Set(registros.map((r) => new Date(r.data).getUTCFullYear()));
    anos.add(new Date().getFullYear());
    return Array.from(anos).sort();
  }, [registros]);

  const doMes = useMemo(
    () => registros.filter((r) => {
      const d = new Date(r.data);
      return d.getUTCMonth() + 1 === mesFiltro && d.getUTCFullYear() === anoFiltro;
    }),
    [registros, mesFiltro, anoFiltro]
  );

  const totalTrabalhado = doMes.reduce((s, r) => s + r.minutosTrabalhados, 0);
  const totalPrevisto = doMes.reduce((s, r) => s + r.minutosPrevistos, 0);

  function mudarPeriodo(mes: number, ano: number) {
    router.push(`/ponto/${funcionarioId}?mes=${mes}&ano=${ano}`);
  }

  async function handleRemover(id: string) {
    setRemovendoId(id);
    await fetch(`/api/ponto/${id}`, { method: "DELETE" });
    setRemovendoId(null);
    router.refresh();
  }

  return (
    <>
      <Card>
        <div className="flex flex-col gap-3 border-b border-cda-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Select value={mesFiltro} onChange={(e) => mudarPeriodo(Number(e.target.value), anoFiltro)}>
              {MESES.map((nome, i) => (
                <option key={nome} value={i + 1}>
                  {nome}
                </option>
              ))}
            </Select>
            <Select value={anoFiltro} onChange={(e) => mudarPeriodo(mesFiltro, Number(e.target.value))}>
              {anosDisponiveis.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/api/ponto/pdf?funcionarioId=${funcionarioId}&mes=${mesFiltro}&ano=${anoFiltro}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline">
                <FileDown className="h-4 w-4" />
                Gerar PDF
              </Button>
            </a>
            <Button onClick={() => setModalAberto(true)}>
              <Plus className="h-4 w-4" />
              Lançar ponto manual
            </Button>
          </div>
        </div>

        <Table>
          <TableHead>
            <Th>Data</Th>
            <Th>Entrada</Th>
            <Th>Saída</Th>
            <Th>Entrada</Th>
            <Th>Saída</Th>
            <Th>Ocorrência</Th>
            <Th>Horas</Th>
            <Th>Saldo dia</Th>
            <Th>Saldo acum.</Th>
            <Th>{null}</Th>
          </TableHead>
          <TableBody>
            {doMes.length === 0 && <TableEmpty colSpan={10}>Nenhum registro de ponto neste período.</TableEmpty>}
            {doMes.map((r) => (
              <Tr key={r.id}>
                <Td>{formatarDataCurta(r.data)}</Td>
                <Td>{r.entrada1 ?? "—"}</Td>
                <Td>{r.saida1 ?? "—"}</Td>
                <Td>{r.entrada2 ?? "—"}</Td>
                <Td>{r.saida2 ?? "—"}</Td>
                <Td>{OCORRENCIA_LABEL[r.ocorrencia]}</Td>
                <Td>{formatarMinutos(r.minutosTrabalhados)}</Td>
                <Td className={r.saldoDiario < 0 ? "text-cda-red" : "text-cda-green"}>
                  {formatarMinutos(r.saldoDiario)}
                </Td>
                <Td className={r.saldoAcumulado < 0 ? "text-cda-red" : "text-cda-green"}>
                  {formatarMinutos(r.saldoAcumulado)}
                </Td>
                <Td>
                  <button
                    onClick={() => handleRemover(r.id)}
                    disabled={removendoId === r.id}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-cda-red hover:bg-cda-bg disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </Td>
              </Tr>
            ))}
          </TableBody>
        </Table>

        {doMes.length > 0 && (
          <div className="flex justify-end gap-6 border-t border-cda-border px-5 py-3 text-sm">
            <span className="text-cda-text2">
              Trabalhado: <strong className="text-cda-text">{formatarMinutos(totalTrabalhado)}</strong>
            </span>
            <span className="text-cda-text2">
              Previsto: <strong className="text-cda-text">{formatarMinutos(totalPrevisto)}</strong>
            </span>
            <span className="text-cda-text2">
              Saldo do mês:{" "}
              <strong className={totalTrabalhado - totalPrevisto < 0 ? "text-cda-red" : "text-cda-green"}>
                {formatarMinutos(totalTrabalhado - totalPrevisto)}
              </strong>
            </span>
          </div>
        )}
      </Card>

      <NovoRegistroPontoModal funcionarioId={funcionarioId} open={modalAberto} onClose={() => setModalAberto(false)} />
    </>
  );
}
