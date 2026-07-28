import { Wallet, TrendingUp, AlertCircle, Percent } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { TabelaInadimplentes } from "@/components/modules/dashboard/TabelaInadimplentes";
import { FeedAtividade } from "@/components/modules/dashboard/FeedAtividade";
import { CalendarioWidget } from "@/components/modules/dashboard/CalendarioWidget";
import { agruparInadimplentes, saldoDevedor, whereAtrasadas } from "@/lib/inadimplencia";
import { formatarMoeda } from "@/lib/utils";

export async function DashboardFinanceiro() {
  const anoLetivo = await prisma.anoLetivo.findFirst({ where: { ativo: true } });
  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth() + 1;

  const [mensalidadesDoMes, mensalidadesAtrasadas, mensalidadesEmAberto, logs] = await Promise.all([
    prisma.mensalidade.findMany({
      where: { ano: anoAtual, mes: mesAtual, matricula: { anoLetivoId: anoLetivo?.id }, situacao: { not: "CANCELADA" } },
      include: { pagamentos: true },
    }),
    prisma.mensalidade.findMany({
      where: whereAtrasadas(),
      include: { pagamentos: true, matricula: { include: { aluno: true, turma: true } } },
      orderBy: { vencimento: "asc" },
    }),
    prisma.mensalidade.findMany({
      where: { situacao: { in: ["PENDENTE", "ATRASADA"] } },
      include: { pagamentos: true },
    }),
    prisma.logAtividade.findMany({ where: { entidade: "Mensalidade" }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const previsto = mensalidadesDoMes.reduce((acc, m) => acc + m.valor, 0);
  const recebido = mensalidadesDoMes.reduce((acc, m) => acc + m.pagamentos.reduce((a, p) => a + p.valor, 0), 0);
  const taxaRecebimento = previsto > 0 ? (recebido / previsto) * 100 : 0;
  const totalEmAberto = mensalidadesEmAberto.reduce((acc, m) => acc + saldoDevedor(m), 0);

  const inadimplentes = agruparInadimplentes(mensalidadesAtrasadas);

  return (
    <div>
      <PageHeader title="Dashboard Financeiro" subtitle="Receita, inadimplência e mensalidades" />

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
        <FeedAtividade logs={logs} />
      </div>

      <div className="mt-5">
        <CalendarioWidget />
      </div>
    </div>
  );
}
