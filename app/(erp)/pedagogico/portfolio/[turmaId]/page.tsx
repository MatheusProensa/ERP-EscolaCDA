import { notFound } from "next/navigation";
import Link from "next/link";
import { Image as ImageIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function PortfolioTurmaPage({ params }: { params: Promise<{ turmaId: string }> }) {
  const { turmaId } = await params;

  const turma = await prisma.turma.findUnique({ where: { id: turmaId }, select: { id: true, nome: true } });
  if (!turma) notFound();

  const matriculas = await prisma.matricula.findMany({
    where: { turmaId, situacao: "ATIVA" },
    orderBy: { aluno: { nome: "asc" } },
    select: {
      aluno: { select: { id: true, nome: true, _count: { select: { portfolioItens: true } } } },
    },
  });

  return (
    <div>
      <PageHeader
        title={`Portfólio — ${turma.nome}`}
        breadcrumb={[{ label: "Pedagógico", href: "/pedagogico" }, { label: turma.nome }]}
      />
      <Card>
        {matriculas.length === 0 ? (
          <EmptyState icon={ImageIcon} title="Essa turma não tem nenhum aluno com matrícula ativa" />
        ) : (
          <div className="flex flex-col divide-y divide-cda-border">
            {matriculas.map(({ aluno }) => (
              <Link
                key={aluno.id}
                href={`/pedagogico/portfolio/${turmaId}/${aluno.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-cda-bg"
              >
                <span className="text-sm text-cda-text">{aluno.nome}</span>
                <Badge variant="neutral">{aluno._count.portfolioItens} foto(s)</Badge>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
