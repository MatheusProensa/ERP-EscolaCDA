import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricasGerais } from "@/components/modules/dashboard/MetricasGerais";
import { TabelaInadimplentes } from "@/components/modules/dashboard/TabelaInadimplentes";
import { FeedAtividade } from "@/components/modules/dashboard/FeedAtividade";
import { CensoAlerta } from "@/components/modules/dashboard/CensoAlerta";
import { CalendarioWidget } from "@/components/modules/dashboard/CalendarioWidget";
import { agruparInadimplentes, whereAtrasadas } from "@/lib/inadimplencia";

export async function DashboardAdmin() {
  const anoLetivo = await prisma.anoLetivo.findFirst({ where: { ativo: true } });

  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const fimMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);

  const [totalAlunos, turmasAtivas, mensalidadesAtrasadas, pagamentosDoMes, logs, censoIncompleto] = await Promise.all([
    prisma.matricula.count({
      where: { situacao: "ATIVA", anoLetivoId: anoLetivo?.id },
    }),
    prisma.turma.count({ where: { anoLetivoId: anoLetivo?.id } }),
    prisma.mensalidade.findMany({
      where: whereAtrasadas(),
      include: { pagamentos: true, matricula: { include: { aluno: true, turma: true } } },
      orderBy: { vencimento: "asc" },
    }),
    prisma.pagamento.aggregate({
      _sum: { valor: true },
      where: { dataPagamento: { gte: inicioMes, lt: fimMes } },
    }),
    prisma.logAtividade.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.aluno.count({
      where: {
        matriculas: { some: { situacao: "ATIVA" } },
        OR: [{ racaCor: null }, { filiacao1: null }, { sexo: null }],
      },
    }),
  ]);

  const inadimplentes = agruparInadimplentes(mensalidadesAtrasadas);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral da Escola CDA — todos os setores" />

      <div className="mb-5">
        <MetricasGerais
          totalAlunos={totalAlunos}
          inadimplentes={inadimplentes.length}
          receitaMes={pagamentosDoMes._sum.valor ?? 0}
          turmasAtivas={turmasAtivas}
        />
      </div>

      <div className="mb-5">
        <CensoAlerta quantidade={censoIncompleto} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TabelaInadimplentes dados={inadimplentes.slice(0, 6)} />
        </div>
        <FeedAtividade logs={logs} />
      </div>

      <div className="mt-5">
        <CalendarioWidget />
      </div>
    </div>
  );
}
