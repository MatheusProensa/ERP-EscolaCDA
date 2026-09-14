import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { ModelosParecerSecao } from "@/components/modules/pedagogico/ModelosParecerSecao";
import { CiclosParecerClient } from "@/components/modules/pedagogico/CiclosParecerClient";

export default async function ParecerTurmaPage({ params }: { params: Promise<{ turmaId: string }> }) {
  const { turmaId } = await params;
  const session = await auth();

  const [turma, modelos, pareceres, vinculo] = await Promise.all([
    prisma.turma.findUnique({ where: { id: turmaId }, select: { id: true, nome: true } }),
    prisma.modeloParecer.findMany({
      where: { turmaId },
      orderBy: { titulo: "asc" },
      include: { paragrafos: { orderBy: { ordem: "asc" } } },
    }),
    prisma.parecer.findMany({
      where: { turmaId },
      orderBy: { createdAt: "desc" },
      include: { modelo: { select: { titulo: true } }, alunos: { select: { status: true } } },
    }),
    session?.user.id
      ? prisma.vinculoPedagogico.findFirst({ where: { userId: session.user.id, turmaId, papel: "REGENTE" } })
      : null,
  ]);
  if (!turma) notFound();

  // Mesma regra de escrita do Planejamento/API de pareceres: só a regente
  // dessa turma (ou ADMIN) monta/edita o modelo — não é mais um catálogo
  // global da coordenação (correção do dono, set/2026).
  const podeEditar = session?.user.role === "ADMIN" || !!vinculo;

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
      <div className="flex flex-col gap-5">
        <ModelosParecerSecao turmaId={turma.id} modelos={modelos} podeEditar={podeEditar} />
        <CiclosParecerClient turmaId={turma.id} modelos={modelos.map((m) => ({ id: m.id, titulo: m.titulo }))} ciclosIniciais={ciclos} />
      </div>
    </div>
  );
}
