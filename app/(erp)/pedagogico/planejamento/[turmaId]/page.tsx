import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { hojeBrasilia } from "@/lib/utils";
import { ProjetoPedagogicoSecao } from "@/components/modules/pedagogico/ProjetoPedagogicoSecao";
import { HorarioEspecializadaSecao } from "@/components/modules/pedagogico/HorarioEspecializadaSecao";
import { PlanejamentoMensalClient } from "@/components/modules/pedagogico/PlanejamentoMensalClient";

export default async function PlanejamentoTurmaPage({ params }: { params: Promise<{ turmaId: string }> }) {
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
  const hoje = hojeBrasilia();
  const anoMesInicial = `${hoje.getUTCFullYear()}-${String(hoje.getUTCMonth() + 1).padStart(2, "0")}`;
  const projetosDTO = projetos.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }));

  return (
    <div>
      <PageHeader
        title={`Planejamento — ${turma.nome}`}
        breadcrumb={[{ label: "Pedagógico", href: "/pedagogico" }, { label: turma.nome }]}
      />
      <div className="flex flex-col gap-5">
        <ProjetoPedagogicoSecao turmaId={turma.id} projetos={projetosDTO} podeEditar={podeEditar} />
        <HorarioEspecializadaSecao turmaId={turma.id} podeEditar={podeEditar} />
        <PlanejamentoMensalClient
          turmaId={turma.id}
          projetos={projetos.map((p) => ({ id: p.id, nome: p.nome, ativo: p.ativo }))}
          anoMesInicial={anoMesInicial}
        />
      </div>
    </div>
  );
}
