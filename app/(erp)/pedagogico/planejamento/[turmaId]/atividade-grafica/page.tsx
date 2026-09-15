import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { hojeBrasilia } from "@/lib/utils";
import { semanasDoMes } from "@/lib/planejamento";
import { PlanejamentoTabs } from "@/components/modules/pedagogico/PlanejamentoTabs";
import { FolhaMensalClient } from "@/components/modules/pedagogico/FolhaMensalClient";

export default async function AtividadeGraficaTurmaPage({ params }: { params: Promise<{ turmaId: string }> }) {
  const { turmaId } = await params;
  const hoje = hojeBrasilia();
  const semanasMes = semanasDoMes(hoje);

  const [turma, semanasEnviadas] = await Promise.all([
    prisma.turma.findUnique({ where: { id: turmaId }, select: { id: true, nome: true } }),
    prisma.folhaMensal.count({
      where: { turmaId, tipo: "ATIVIDADE_GRAFICA", semanaInicio: { in: semanasMes }, status: { in: ["ENVIADO", "APROVADO", "DEVOLVIDO"] } },
    }),
  ]);
  if (!turma) notFound();
  const anoMesInicial = `${hoje.getUTCFullYear()}-${String(hoje.getUTCMonth() + 1).padStart(2, "0")}`;

  return (
    <div>
      <PageHeader
        title={`Atividade Gráfica — ${turma.nome}`}
        subtitle="Folha pra desenhar sobre a vivência do dia — escreva a instrução e gere 1 PDF por aluno."
        breadcrumb={[{ label: "Pedagógico", href: "/pedagogico" }, { label: turma.nome }]}
      />
      <PlanejamentoTabs turmaId={turma.id} active="atividade-grafica" completos={{ atividadeGrafica: semanasEnviadas >= semanasMes.length }} />
      <FolhaMensalClient turmaId={turma.id} tipo="ATIVIDADE_GRAFICA" anoMesInicial={anoMesInicial} />
    </div>
  );
}
