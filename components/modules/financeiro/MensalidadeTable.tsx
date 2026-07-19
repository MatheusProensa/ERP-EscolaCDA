import Link from "next/link";
import type { Aluno, Mensalidade, Pagamento, SituacaoMensalidade, Turma } from "@prisma/client";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { formatarData, formatarMoeda } from "@/lib/utils";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const SITUACAO_VARIANT: Record<SituacaoMensalidade, BadgeVariant> = {
  PAGA: "green",
  PENDENTE: "gray",
  ATRASADA: "red",
  CANCELADA: "amber",
};

const SITUACAO_LABEL: Record<SituacaoMensalidade, string> = {
  PAGA: "Paga",
  PENDENTE: "Pendente",
  ATRASADA: "Atrasada",
  CANCELADA: "Cancelada",
};

export type MensalidadeLinha = Mensalidade & {
  pagamentos: Pagamento[];
  matricula?: { aluno: Aluno; turma: Turma };
};

export function MensalidadeTable({
  mensalidades,
  onRegistrarPagamento,
}: {
  mensalidades: MensalidadeLinha[];
  onRegistrarPagamento?: (mensalidade: MensalidadeLinha) => void;
}) {
  const mostrarAluno = mensalidades.some((m) => m.matricula);
  const colSpan = (mostrarAluno ? 1 : 0) + (onRegistrarPagamento ? 6 : 5);

  return (
    <Table>
      <TableHead>
        {mostrarAluno && <Th>Aluno</Th>}
        <Th>Referência</Th>
        <Th>Vencimento</Th>
        <Th>Valor</Th>
        <Th>Situação</Th>
        <Th>Pagamento</Th>
        {onRegistrarPagamento && <Th>Ação</Th>}
      </TableHead>
      <TableBody>
        {mensalidades.length === 0 && (
          <TableEmpty colSpan={colSpan}>Nenhuma mensalidade encontrada.</TableEmpty>
        )}
        {mensalidades.map((m) => {
          const pagamento = m.pagamentos[0];
          return (
            <Tr key={m.id}>
              {mostrarAluno && (
                <Td>
                  {m.matricula && (
                    <Link
                      href={`/alunos/${m.matricula.aluno.id}`}
                      className="flex items-center gap-2.5 hover:text-cda-blue"
                    >
                      <Avatar nome={m.matricula.aluno.nome} foto={m.matricula.aluno.foto} size="sm" />
                      <span>
                        {m.matricula.aluno.nome}
                        <span className="block text-xs text-cda-text3">{m.matricula.turma.nome}</span>
                      </span>
                    </Link>
                  )}
                </Td>
              )}
              <Td>{MESES[m.mes - 1]}/{m.ano}</Td>
              <Td>{formatarData(m.vencimento)}</Td>
              <Td>{formatarMoeda(m.valor)}</Td>
              <Td>
                <Badge variant={SITUACAO_VARIANT[m.situacao]}>{SITUACAO_LABEL[m.situacao]}</Badge>
              </Td>
              <Td>{pagamento ? formatarData(pagamento.dataPagamento) : "—"}</Td>
              {onRegistrarPagamento && (
                <Td>
                  {m.situacao !== "PAGA" && m.situacao !== "CANCELADA" && (
                    <button
                      onClick={() => onRegistrarPagamento(m)}
                      className="text-sm font-medium text-cda-blue hover:underline"
                    >
                      Registrar pagamento
                    </button>
                  )}
                </Td>
              )}
            </Tr>
          );
        })}
      </TableBody>
    </Table>
  );
}
