import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ClipboardList } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { ExportButtons } from "@/components/ui/ExportButtons";
import { MatricularNaTurmaModal } from "@/components/modules/academico/MatricularNaTurmaModal";
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

  const idsNaTurma = new Set(turma.matriculas.filter((m) => m.situacao === "ATIVA").map((m) => m.alunoId));
  const todosAlunos = await prisma.aluno.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } });
  const alunosDisponiveis = todosAlunos.filter((a) => !idsNaTurma.has(a.id));

  const alunosComAlerta = turma.matriculas
    .filter((m) => m.situacao === "ATIVA")
    .map((m) => m.aluno)
    .filter((a) => a.alergias || a.restricoes || a.medicacaoContinua)
    .sort((a, b) => a.nome.localeCompare(b.nome));

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
        action={
          <div className="flex items-center gap-2">
            <Button href={`/api/relatorios/chamada?turma=${turma.id}`} variant="outline" size="sm">
              <ClipboardList className="h-3.5 w-3.5" />
              Lista de chamada
            </Button>
            <ExportButtons href="/api/relatorios/alunos" label="" params={{ turma: turma.id }} />
            <MatricularNaTurmaModal turmaId={turma.id} alunosDisponiveis={alunosDisponiveis} />
          </div>
        }
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
              const hoje = new Date();
              const temAtraso = m.mensalidades.some(
                (men) => (men.situacao === "PENDENTE" || men.situacao === "ATRASADA") && men.vencimento < hoje
              );
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

      {alunosComAlerta.length > 0 && (
        <Card
          title={
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-[15px] w-[15px] text-cda-critical" />
              Mapa de alergias e cuidados
            </span>
          }
          className="mt-5"
        >
          <div className="flex flex-col divide-y divide-cda-border">
            {alunosComAlerta.map((a) => (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                <Avatar nome={a.nome} size="sm" />
                <div className="min-w-0 flex-1">
                  <Link href={`/alunos/${a.id}`} className="text-sm font-semibold text-cda-text hover:text-cda-blue">
                    {a.nome}
                  </Link>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-cda-text2">
                    {a.alergias && (
                      <span>
                        <span className="font-medium text-cda-critical">Alergias:</span> {a.alergias}
                      </span>
                    )}
                    {a.restricoes && (
                      <span>
                        <span className="font-medium text-cda-critical">Restrições:</span> {a.restricoes}
                      </span>
                    )}
                    {a.medicacaoContinua && (
                      <span>
                        <span className="font-medium text-cda-critical">Medicação:</span> {a.medicacaoContinua}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
