import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { ParecerCicloClient } from "@/components/modules/pedagogico/ParecerCicloClient";

async function podeEscrever(userId: string, role: string, turmaId: string): Promise<boolean> {
  if (role === "ADMIN") return true;
  const vinculo = await prisma.vinculoPedagogico.findFirst({ where: { userId, turmaId, papel: "REGENTE" } });
  return !!vinculo;
}

export default async function ParecerCicloPage({ params }: { params: Promise<{ turmaId: string; parecerId: string }> }) {
  const { turmaId, parecerId } = await params;
  const session = await auth();

  const parecer = await prisma.parecer.findUnique({
    where: { id: parecerId },
    include: {
      turma: { select: { id: true, nome: true } },
      alunos: { include: { aluno: { select: { id: true, nome: true } } }, orderBy: { aluno: { nome: "asc" } } },
    },
  });
  if (!parecer || parecer.turmaId !== turmaId) notFound();

  return (
    <div>
      <PageHeader
        title={`Parecer — ${parecer.periodo}`}
        breadcrumb={[
          { label: "Pedagógico", href: "/pedagogico" },
          { label: parecer.turma.nome, href: `/pedagogico/parecer/${turmaId}` },
          { label: parecer.periodo },
        ]}
      />
      <ParecerCicloClient
        parecerId={parecer.id}
        turmaId={turmaId}
        textoTurmaInicial={parecer.textoTurma ?? ""}
        podeEditar={session?.user.id ? await podeEscrever(session.user.id, session.user.role, turmaId) : false}
        alunos={parecer.alunos.map((a) => ({ id: a.aluno.id, nome: a.aluno.nome, status: a.status }))}
      />
    </div>
  );
}
