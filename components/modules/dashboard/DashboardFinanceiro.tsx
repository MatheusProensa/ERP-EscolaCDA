import { Suspense } from "react";
import { Wallet, TrendingUp, AlertCircle, Percent } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { TabelaInadimplentes } from "@/components/modules/dashboard/TabelaInadimplentes";
import { FeedAtividade } from "@/components/modules/dashboard/FeedAtividade";
import { CalendarioWidget } from "@/components/modules/dashboard/CalendarioWidget";
import { MuralWidget } from "@/components/modules/dashboard/MuralWidget";
import { WidgetFallback } from "@/components/modules/dashboard/WidgetFallback";
import { AvisoFixadoBanner } from "@/components/modules/dashboard/AvisoFixadoBanner";
import { VenceEstaSemana, type ItemVencimento } from "@/components/modules/dashboard/VenceEstaSemana";
import { agruparInadimplentes, saldoDevedor, whereAtrasadas } from "@/lib/inadimplencia";
import { formatarMoeda } from "@/lib/utils";

export async function DashboardFinanceiro() {
  const anoLetivo = await prisma.anoLetivo.findFirst({ where: { ativo: true } });
  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth() + 1;
  const hoje = new Date();
  const em7dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [mensalidadesDoMes, mensalidadesAtrasadas, mensalidadesEmAberto, logs, mensalidadesVencendo] =
    await Promise.all([
      prisma.mensalidade.findMany({
        where: { ano: anoAtual, mes: mesAtual, matricula: { anoLetivoId: anoLetivo?.id }, situacao: { not: "CANCELADA" } },
        select: { valor: true, pagamentos: { select: { valor: true } } },
      }),
      prisma.mensalidade.findMany({
        where: whereAtrasadas(),
        select: {
          situacao: true,
          valor: true,
          vencimento: true,
          pagamentos: { select: { valor: true } },
          matricula: {
            select: { alunoId: true, aluno: { select: { nome: true } }, turma: { select: { nome: true } } },
          },
        },
        orderBy: { vencimento: "asc" },
      }),
      prisma.mensalidade.findMany({
        where: { situacao: { in: ["PENDENTE", "ATRASADA"] } },
        select: { situacao: true, valor: true, vencimento: true, pagamentos: { select: { valor: true } } },
      }),
      prisma.logAtividade.findMany({ where: { entidade: "Mensalidade" }, orderBy: { createdAt: "desc" }, take: 8 }),
      prisma.mensalidade.findMany({
        where: { situacao: "PENDENTE", vencimento: { gte: hoje, lte: em7dias } },
        select: {
          id: true,
          valor: true,
          vencimento: true,
          matricula: {
            select: { aluno: { select: { id: true, nome: true } }, turma: { select: { nome: true } } },
          },
        },
        orderBy: { vencimento: "asc" },
        take: 8,
      }),
    ]);

  const itensVencendo: ItemVencimento[] = mensalidadesVencendo.map((m) => ({
    id: m.id,
    titulo: m.matricula.aluno.nome,
    detalhe: `Mensalidade ${m.matricula.turma.nome} — ${formatarMoeda(m.valor)}`,
    data: m.vencimento,
    href: `/alunos/${m.matricula.aluno.id}`,
  }));

  const previsto = mensalidadesDoMes.reduce((acc, m) => acc + m.valor, 0);
  const recebido = mensalidadesDoMes.reduce((acc, m) => acc + m.pagamentos.reduce((a, p) => a + p.valor, 0), 0);
  const taxaRecebimento = previsto > 0 ? (recebido / previsto) * 100 : 0;
  const totalEmAberto = mensalidadesEmAberto.reduce((acc, m) => acc + saldoDevedor(m), 0);

  const inadimplentes = agruparInadimplentes(mensalidadesAtrasadas);

  return (
    <div>
      <PageHeader title="Dashboard Financeiro" subtitle="Receita, inadimplência e mensalidades" />

      <div className="mb-5">
        <Suspense fallback={null}>
          <AvisoFixadoBanner />
        </Suspense>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Wallet} iconColor="#16A34A" value={formatarMoeda(recebido)} label="Recebido no mês" />
        <MetricCard icon={TrendingUp} iconColor="#1A6FD8" value={formatarMoeda(previsto)} label="Previsto no mês" />
        <MetricCard
          icon={AlertCircle}
          iconColor="#DC2626"
          value={formatarMoeda(totalEmAberto)}
          label="Total em aberto"
          subtext="Pendente + atrasado, já descontando pagamentos parciais"
        />
        <MetricCard icon={Percent} iconColor="#D97706" value={`${taxaRecebimento.toFixed(0)}%`} label="Taxa de recebimento" subtext="Mês atual" />
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

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<WidgetFallback className="h-80" />}>
            <CalendarioWidget />
          </Suspense>
        </div>
        <Suspense fallback={<WidgetFallback />}>
          <MuralWidget />
        </Suspense>
      </div>
    </div>
  );
}
