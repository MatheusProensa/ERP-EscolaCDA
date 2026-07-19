import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { formatarMoeda } from "@/lib/utils";

export type Inadimplente = {
  alunoId: string;
  nome: string;
  turma: string;
  valor: number;
  diasAtraso: number;
};

export function TabelaInadimplentes({
  dados,
  linkVerTodos = true,
}: {
  dados: Inadimplente[];
  linkVerTodos?: boolean;
}) {
  return (
    <Card
      title="Alunos com pendência financeira"
      action={
        linkVerTodos ? (
          <Link href="/financeiro/inadimplentes" className="text-sm font-medium text-cda-blue hover:underline">
            Ver todos
          </Link>
        ) : undefined
      }
    >
      <Table>
        <TableHead>
          <Th>Aluno</Th>
          <Th>Turma</Th>
          <Th>Valor em aberto</Th>
          <Th>Atraso</Th>
        </TableHead>
        <TableBody>
          {dados.length === 0 && <TableEmpty colSpan={4}>Nenhuma pendência no momento.</TableEmpty>}
          {dados.map((d) => (
            <Tr key={d.alunoId}>
              <Td>
                <Link href={`/alunos/${d.alunoId}`} className="flex items-center gap-2.5 hover:text-cda-blue">
                  <Avatar nome={d.nome} size="sm" />
                  {d.nome}
                </Link>
              </Td>
              <Td>{d.turma}</Td>
              <Td>{formatarMoeda(d.valor)}</Td>
              <Td>
                <Badge variant="red">{d.diasAtraso} dias</Badge>
              </Td>
            </Tr>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
