import Link from "next/link";
import { Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";

export default async function PontoPage() {
  const funcionarios = await prisma.funcionario.findMany({
    where: { ativo: true },
    include: { _count: { select: { registrosPonto: true } } },
    orderBy: { nome: "asc" },
  });

  return (
    <div>
      <PageHeader title="Ponto" subtitle="Ponto eletrônico e manual dos funcionários, com geração de espelho em PDF" />

      <Card>
        <Table>
          <TableHead>
            <Th>Nome</Th>
            <Th>Cargo</Th>
            <Th>Empresa</Th>
            <Th>Registros</Th>
          </TableHead>
          <TableBody>
            {funcionarios.length === 0 && <TableEmpty colSpan={4}>Nenhum funcionário ativo.</TableEmpty>}
            {funcionarios.map((f) => (
              <Tr key={f.id}>
                <Td>
                  <Link href={`/ponto/${f.id}`} className="flex items-center gap-2.5 hover:text-cda-blue">
                    <Avatar nome={f.nome} size="sm" />
                    {f.nome}
                  </Link>
                </Td>
                <Td>{f.cargo}</Td>
                <Td>{f.empresa ?? "—"}</Td>
                <Td>
                  <Badge variant={f._count.registrosPonto > 0 ? "blue" : "gray"}>
                    <Clock className="mr-1 h-3 w-3" />
                    {f._count.registrosPonto}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
