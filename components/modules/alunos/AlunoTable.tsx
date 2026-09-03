import Link from "next/link";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import { Avatar } from "@/components/ui/Avatar";
import { formatarData } from "@/lib/utils";

export type MatriculaLinha = {
  id: string;
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
      </TableHead>
      <TableBody>
        {matriculas.length === 0 && (
          <TableEmpty colSpan={3}>Nenhum aluno encontrado.</TableEmpty>
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
          </Tr>
        ))}
      </TableBody>
    </Table>
  );
}
