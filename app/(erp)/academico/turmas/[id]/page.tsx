import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import type { SituacaoMatricula } from "@prisma/client";

const TURNO_LABEL: Record<string, string> = { MANHA: "Manhã — Contraturno", TARDE: "Tarde — Ensino regular" };

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

export default async function TurmaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const turma = await prisma.turma.findUnique({
    where: { id },
    include: {
      anoLetivo: true,
      matriculas: {
        include: { aluno: true, mensalidades: true },
        orderBy: { aluno: { nome: "asc" } },
      },
    },
  });

  if (!turma) notFound();

  const matriculadosAtivos = turma.matriculas.filter((m) => m.situacao === "ATIVA").length;
  const vagas = Math.max(0, turma.capacidade - matriculadosAtivos);

  return (
    <div>
      <PageHeader
        title={turma.nome}
        subtitle={`${TURNO_LABEL[turma.turno]} · Ano letivo ${turma.anoLetivo.ano}`}
        breadcrumb={[
          { label: "Acadêmico", href: "/academico" },
          { label: "Turmas", href: "/academico/turmas" },
          { label: turma.nome },
        ]}
      />

      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-cda-text3">Matriculados</p>
          <p className="mt-1 text-xl font-bold text-cda-text">{matriculadosAtivos}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-cda-text3">Capacidade</p>
          <p className="mt-1 text-xl font-bold text-cda-text">{turma.capacidade}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-cda-text3">Vagas disponíveis</p>
          <p className="mt-1 text-xl font-bold text-cda-text">{vagas}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-cda-text3">Situação</p>
          <p className="mt-1">
            <Badge variant={vagas > 0 ? "green" : "red"}>{vagas > 0 ? "Com vaga" : "Lotada"}</Badge>
          </p>
        </Card>
      </div>

      <Card title="Alunos matriculados">
        <Table>
          <TableHead>
            <Th>Aluno</Th>
            <Th>Situação da matrícula</Th>
            <Th>Status financeiro</Th>
          </TableHead>
          <TableBody>
            {turma.matriculas.length === 0 && (
              <TableEmpty colSpan={3}>Nenhum aluno matriculado nesta turma.</TableEmpty>
            )}
            {turma.matriculas.map((m) => {
              const temAtraso = m.mensalidades.some((men) => men.situacao === "ATRASADA");
              return (
                <Tr key={m.id}>
                  <Td>
                    <Link href={`/alunos/${m.aluno.id}`} className="flex items-center gap-2.5 hover:text-cda-blue">
                      <Avatar nome={m.aluno.nome} size="sm" />
                      {m.aluno.nome}
                    </Link>
                  </Td>
                  <Td>
                    <Badge variant={SITUACAO_VARIANT[m.situacao]}>{SITUACAO_LABEL[m.situacao]}</Badge>
                  </Td>
                  <Td>
                    <Badge variant={temAtraso ? "red" : "green"}>{temAtraso ? "Atrasado" : "Em dia"}</Badge>
                  </Td>
                </Tr>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
