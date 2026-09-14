import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { CiclosParecerClient } from "@/components/modules/pedagogico/CiclosParecerClient";

export default async function ParecerTurmaPage({ params }: { params: Promise<{ turmaId: string }> }) {
  const { turmaId } = await params;

  const [turma, modelos, pareceres] = await Promise.all([
    prisma.turma.findUnique({ where: { id: turmaId }, select: { id: true, nome: true } }),
    prisma.modeloParecer.findMany({ orderBy: { titulo: "asc" }, select: { id: true, titulo: true } }),
    prisma.parecer.findMany({
      where: { turmaId },
      orderBy: { createdAt: "desc" },
      include: { modelo: { select: { titulo: true } }, alunos: { select: { status: true } } },
    }),
  ]);
  if (!turma) notFound();

  const ciclos = pareceres.map((p) => ({
    id: p.id,
    periodo: p.periodo,
    modeloTitulo: p.modelo.titulo,
    total: p.alunos.length,
    enviados: p.alunos.filter((a) => a.status === "ENVIADO").length,
  }));

  return (
    <div>
      <PageHeader
        title={`Parecer — ${turma.nome}`}
        breadcrumb={[{ label: "Pedagógico", href: "/pedagogico" }, { label: turma.nome }]}
      />
      <CiclosParecerClient turmaId={turma.id} modelos={modelos} ciclosIniciais={ciclos} />
    </div>
  );
}
