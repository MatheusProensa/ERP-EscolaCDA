import Link from "next/link";
import type { SituacaoMatricula } from "@prisma/client";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { SITUACAO_MATRICULA } from "@/lib/statusVisual";
import { formatarData } from "@/lib/utils";

export type MatriculaLinha = {
  id: string;
  situacao: SituacaoMatricula;
  aluno: { id: string; nome: string; dataNascimento: Date };
  turma: { nome: string };
};

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
                <Avatar nome={m.aluno.nome} size="sm" />
                {m.aluno.nome}
              </Link>
            </Td>
            <Td>{m.turma.nome}</Td>
            <Td>{formatarData(m.aluno.dataNascimento)}</Td>
            <Td>
              <Badge variant={SITUACAO_MATRICULA[m.situacao].variant}>{SITUACAO_MATRICULA[m.situacao].label}</Badge>
            </Td>
          </Tr>
        ))}
      </TableBody>
    </Table>
  );
}
