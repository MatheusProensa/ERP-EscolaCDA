import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { hojeBrasilia } from "@/lib/utils";
import { segundaFeiraDe, isoData } from "@/lib/planejamento";
import { PlanejamentoSemanalClient } from "@/components/modules/pedagogico/PlanejamentoSemanalClient";

export default async function PlanejamentoTurmaPage({ params }: { params: Promise<{ turmaId: string }> }) {
  const { turmaId } = await params;

  const [turma, temas] = await Promise.all([
    prisma.turma.findUnique({ where: { id: turmaId }, select: { id: true, nome: true } }),
    prisma.temaPlanejamento.findMany({ orderBy: { titulo: "asc" } }),
  ]);
  if (!turma) notFound();

  const semanaInicialIso = isoData(segundaFeiraDe(hojeBrasilia()));

  return (
    <div>
      <PageHeader
        title={`Planejamento — ${turma.nome}`}
        breadcrumb={[{ label: "Pedagógico", href: "/pedagogico" }, { label: turma.nome }]}
      />
      <PlanejamentoSemanalClient turmaId={turma.id} temas={temas} semanaInicialIso={semanaInicialIso} />
    </div>
  );
}
