import Link from "next/link";
import type { Aluno, Turma, Matricula, SituacaoMatricula } from "@prisma/client";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { formatarData } from "@/lib/utils";

const SITUACAO_VARIANT: Record<SituacaoMatricula, BadgeVariant> = {
  ATIVA: "green",
  TRANCADA: "amber",
  CANCELADA: "red",
  TRANSFERIDA: "gray",
  CONCLUIDA: "blue",
};

const SITUACAO_LABEL: Record<SituacaoMatricula, string> = {
  ATIVA: "Ativa",
  TRANCADA: "Trancada",
  CANCELADA: "Cancelada",
  TRANSFERIDA: "Transferida",
  CONCLUIDA: "Concluída",
};

export type MatriculaLinha = Matricula & { aluno: Aluno; turma: Turma };

export function AlunoTable({ matriculas }: { matriculas: MatriculaLinha[] }) {
  return (
    <Table>
      <TableHead>
        <Th>Aluno</Th>
        <Th>Turma</Th>
        <Th>Nascimento</Th>
        <Th>Situação</Th>
      </TableHead>
      <TableBody>
        {matriculas.length === 0 && (
          <TableEmpty colSpan={4}>Nenhum aluno encontrado.</TableEmpty>
        )}
        {matriculas.map((m) => (
          <Tr key={m.id}>
            <Td>
              <Link href={`/alunos/${m.aluno.id}`} className="flex items-center gap-2.5 hover:text-cda-blue">
                <Avatar nome={m.aluno.nome} foto={m.aluno.foto} size="sm" />
                {m.aluno.nome}
              </Link>
            </Td>
            <Td>{m.turma.nome}</Td>
            <Td>{formatarData(m.aluno.dataNascimento)}</Td>
            <Td>
              <Badge variant={SITUACAO_VARIANT[m.situacao]}>{SITUACAO_LABEL[m.situacao]}</Badge>
            </Td>
          </Tr>
        ))}
      </TableBody>
    </Table>
  );
}

export { SITUACAO_LABEL, SITUACAO_VARIANT };
