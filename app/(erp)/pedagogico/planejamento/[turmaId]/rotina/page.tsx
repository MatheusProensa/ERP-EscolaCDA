import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { PlanejamentoTabs } from "@/components/modules/pedagogico/PlanejamentoTabs";
import { RotinaTurmaSecao } from "@/components/modules/pedagogico/RotinaTurmaSecao";

export default async function RotinaTurmaPage({ params }: { params: Promise<{ turmaId: string }> }) {
  const { turmaId } = await params;
  const session = await auth();

  const [turma, vinculo] = await Promise.all([
    prisma.turma.findUnique({ where: { id: turmaId }, select: { id: true, nome: true } }),
    session?.user.id
      ? prisma.vinculoPedagogico.findFirst({ where: { userId: session.user.id, turmaId, papel: "REGENTE" } })
      : null,
  ]);
  if (!turma) notFound();

  const podeEditar = session?.user.role === "ADMIN" || !!vinculo;

  return (
    <div>
      <PageHeader
        title={`Rotina do dia a dia — ${turma.nome}`}
        subtitle="Como cada momento (chegada, lanche, soninho...) acontece na sua turma — preenche 1 vez, ajusta só quando muda."
        breadcrumb={[{ label: "Pedagógico", href: "/pedagogico" }, { label: turma.nome }]}
      />
      <PlanejamentoTabs turmaId={turma.id} active="rotina" />
      <RotinaTurmaSecao turmaId={turma.id} podeEditar={podeEditar} />
    </div>
  );
}
