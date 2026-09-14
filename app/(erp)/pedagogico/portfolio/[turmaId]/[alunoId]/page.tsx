import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { PortfolioAlunoClient } from "@/components/modules/pedagogico/PortfolioAlunoClient";

async function podeEscrever(userId: string, role: string, turmaId: string): Promise<boolean> {
  if (role === "ADMIN") return true;
  const vinculo = await prisma.vinculoPedagogico.findFirst({ where: { userId, turmaId, papel: "REGENTE" } });
  return !!vinculo;
}

export default async function PortfolioAlunoPage({ params }: { params: Promise<{ turmaId: string; alunoId: string }> }) {
  const { turmaId, alunoId } = await params;
  const session = await auth();

  const [turma, aluno] = await Promise.all([
    prisma.turma.findUnique({ where: { id: turmaId }, select: { nome: true } }),
    prisma.aluno.findUnique({ where: { id: alunoId }, select: { nome: true } }),
  ]);
  if (!turma || !aluno) notFound();

  return (
    <div>
      <PageHeader
        title={`Portfólio — ${aluno.nome}`}
        breadcrumb={[
          { label: "Pedagógico", href: "/pedagogico" },
          { label: turma.nome, href: `/pedagogico/portfolio/${turmaId}` },
          { label: aluno.nome },
        ]}
      />
      <PortfolioAlunoClient
        turmaId={turmaId}
        alunoId={alunoId}
        podeEditar={session?.user.id ? await podeEscrever(session.user.id, session.user.role, turmaId) : false}
      />
    </div>
  );
}
