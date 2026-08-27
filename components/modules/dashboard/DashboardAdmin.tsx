import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { PageHeader } from "@/components/layout/PageHeader";
import { WidgetFallback } from "@/components/modules/dashboard/WidgetFallback";
import { MetricasGerais } from "@/components/modules/dashboard/MetricasGerais";
import { CensoAlerta } from "@/components/modules/dashboard/CensoAlerta";
import { ProximosEventosWidget } from "@/components/modules/dashboard/ProximosEventosWidget";
import { MuralWidget } from "@/components/modules/dashboard/MuralWidget";

export async function DashboardAdmin() {
  const anoLetivo = await getAnoLetivoAtivo();

  const [totalAlunos, turmasAtivas, censoIncompleto] = await Promise.all([
    prisma.matricula.count({
      where: { situacao: "ATIVA", anoLetivoId: anoLetivo?.id },
    }),
    prisma.turma.count({ where: { anoLetivoId: anoLetivo?.id } }),
    prisma.aluno.count({
      where: {
        matriculas: { some: { situacao: "ATIVA" } },
        OR: [{ racaCor: null }, { filiacao1: null }, { sexo: null }],
      },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral da Escola CDA — todos os setores" />

      <div className="mb-5">
        <MetricasGerais totalAlunos={totalAlunos} turmasAtivas={turmasAtivas} />
      </div>

      <div className="mb-5">
        <CensoAlerta quantidade={censoIncompleto} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<WidgetFallback className="h-40" />}>
            <MuralWidget />
          </Suspense>
        </div>
        <Suspense fallback={<WidgetFallback className="h-60" />}>
          <ProximosEventosWidget />
        </Suspense>
      </div>
    </div>
  );
}
