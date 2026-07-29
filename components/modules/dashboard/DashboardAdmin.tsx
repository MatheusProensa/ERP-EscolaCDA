import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { WidgetFallback } from "@/components/modules/dashboard/WidgetFallback";
import { MetricasGerais } from "@/components/modules/dashboard/MetricasGerais";
import { CensoAlerta } from "@/components/modules/dashboard/CensoAlerta";
import { ProximosEventosWidget } from "@/components/modules/dashboard/ProximosEventosWidget";
import { MuralWidget } from "@/components/modules/dashboard/MuralWidget";
import { saldoDevedor, whereAtrasadas } from "@/lib/inadimplencia";

export async function DashboardAdmin() {
  const anoLetivo = await prisma.anoLetivo.findFirst({ where: { ativo: true } });

  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const fimMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);

  const [totalAlunos, turmasAtivas, mensalidadesAtrasadas, pagamentosDoMes, censoIncompleto] = await Promise.all([
    prisma.matricula.count({
      where: { situacao: "ATIVA", anoLetivoId: anoLetivo?.id },
    }),
    prisma.turma.count({ where: { anoLetivoId: anoLetivo?.id } }),
    prisma.mensalidade.findMany({
      where: whereAtrasadas(),
      select: {
        situacao: true,
        valor: true,
        vencimento: true,
        pagamentos: { select: { valor: true } },
        matricula: { select: { alunoId: true } },
      },
    }),
    prisma.pagamento.aggregate({
      _sum: { valor: true },
      where: { dataPagamento: { gte: inicioMes, lt: fimMes } },
    }),
    prisma.aluno.count({
      where: {
        matriculas: { some: { situacao: "ATIVA" } },
        OR: [{ racaCor: null }, { filiacao1: null }, { sexo: null }],
      },
    }),
  ]);

  const totalInadimplentes = new Set(
    mensalidadesAtrasadas.filter((m) => saldoDevedor(m) > 0).map((m) => m.matricula.alunoId)
  ).size;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral da Escola CDA — todos os setores" />

      <div className="mb-5">
        <Suspense fallback={<WidgetFallback className="h-40" />}>
          <MuralWidget />
        </Suspense>
      </div>

      <div className="mb-5">
        <MetricasGerais
          totalAlunos={totalAlunos}
          inadimplentes={totalInadimplentes}
          receitaMes={pagamentosDoMes._sum.valor ?? 0}
          turmasAtivas={turmasAtivas}
        />
      </div>

      <div className="mb-5">
        <Suspense fallback={<WidgetFallback className="h-60" />}>
          <ProximosEventosWidget />
        </Suspense>
      </div>

      <CensoAlerta quantidade={censoIncompleto} />
    </div>
  );
}
