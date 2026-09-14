import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { PlanejamentoTabs } from "@/components/modules/pedagogico/PlanejamentoTabs";
import { HorarioEspecializadaSecao } from "@/components/modules/pedagogico/HorarioEspecializadaSecao";

export default async function HorarioTurmaPage({ params }: { params: Promise<{ turmaId: string }> }) {
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
        title={`Horário fixo das especializadas — ${turma.nome}`}
        subtitle="Bilíngue, Ed. Física, Musicalização etc. — preenche 1 vez, o Planejamento semanal já vem com isso pronto em cada dia."
        breadcrumb={[{ label: "Pedagógico", href: "/pedagogico" }, { label: turma.nome }]}
      />
      <PlanejamentoTabs turmaId={turma.id} active="horario" />
      <HorarioEspecializadaSecao turmaId={turma.id} podeEditar={podeEditar} />
    </div>
  );
}
