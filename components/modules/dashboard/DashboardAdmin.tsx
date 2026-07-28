import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricasGerais } from "@/components/modules/dashboard/MetricasGerais";
import { TabelaInadimplentes } from "@/components/modules/dashboard/TabelaInadimplentes";
import { FeedAtividade } from "@/components/modules/dashboard/FeedAtividade";
import { CensoAlerta } from "@/components/modules/dashboard/CensoAlerta";
import { CalendarioWidget } from "@/components/modules/dashboard/CalendarioWidget";
import { VenceEstaSemana, type ItemVencimento } from "@/components/modules/dashboard/VenceEstaSemana";
import { agruparInadimplentes, whereAtrasadas } from "@/lib/inadimplencia";
import { formatarMoeda } from "@/lib/utils";

export async function DashboardAdmin() {
  const anoLetivo = await prisma.anoLetivo.findFirst({ where: { ativo: true } });

  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const fimMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
  const hoje = new Date();
  const em7dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalAlunos,
    turmasAtivas,
    mensalidadesAtrasadas,
    pagamentosDoMes,
    logs,
    censoIncompleto,
    mensalidadesVencendo,
    documentosVencendo,
  ] = await Promise.all([
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
    prisma.mensalidade.findMany({
      where: { situacao: "PENDENTE", vencimento: { gte: hoje, lte: em7dias } },
      include: { matricula: { include: { aluno: true, turma: true } } },
      orderBy: { vencimento: "asc" },
      take: 5,
    }),
    prisma.documentoInstitucional.findMany({
      where: { validade: { gte: hoje, lte: em7dias } },
      orderBy: { validade: "asc" },
      take: 5,
    }),
  ]);

  const inadimplentes = agruparInadimplentes(mensalidadesAtrasadas);

  const itensVencendo: ItemVencimento[] = [
    ...mensalidadesVencendo.map((m) => ({
      id: `mensalidade-${m.id}`,
      titulo: m.matricula.aluno.nome,
      detalhe: `Mensalidade ${m.matricula.turma.nome} — ${formatarMoeda(m.valor)}`,
      data: m.vencimento,
      href: `/alunos/${m.matricula.aluno.id}`,
    })),
    ...documentosVencendo.map((d) => ({
      id: `documento-${d.id}`,
      titulo: d.titulo,
      detalhe: `Documento — ${d.categoria}`,
      data: d.validade!,
      href: "/documentos",
    })),
  ];

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
        <div className="flex flex-col gap-5">
          <VenceEstaSemana itens={itensVencendo} />
          <FeedAtividade logs={logs} />
        </div>
      </div>

      <div className="mt-5">
        <CalendarioWidget />
      </div>
    </div>
  );
}
