import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { PlanejamentoTabs } from "@/components/modules/pedagogico/PlanejamentoTabs";
import { ProjetoPedagogicoSecao } from "@/components/modules/pedagogico/ProjetoPedagogicoSecao";

export default async function ProjetoTurmaPage({ params }: { params: Promise<{ turmaId: string }> }) {
  const { turmaId } = await params;
  const session = await auth();

  const [turma, projetos, vinculo] = await Promise.all([
    prisma.turma.findUnique({ where: { id: turmaId }, select: { id: true, nome: true } }),
    prisma.projetoPedagogico.findMany({ where: { turmaId }, orderBy: { createdAt: "desc" } }),
    session?.user.id
      ? prisma.vinculoPedagogico.findFirst({ where: { userId: session.user.id, turmaId, papel: "REGENTE" } })
      : null,
  ]);
  if (!turma) notFound();

  const podeEditar = session?.user.role === "ADMIN" || !!vinculo;
  const projetosDTO = projetos.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }));

  return (
    <div>
      <PageHeader
        title={`Projeto pedagógico — ${turma.nome}`}
        subtitle="O fio condutor do que a turma está explorando agora — o Planejamento semanal se guia por ele."
        breadcrumb={[{ label: "Pedagógico", href: "/pedagogico" }, { label: turma.nome }]}
      />
      <PlanejamentoTabs turmaId={turma.id} active="projeto" />
      <ProjetoPedagogicoSecao turmaId={turma.id} projetos={projetosDTO} podeEditar={podeEditar} />
    </div>
  );
}
