import { Wallet, TrendingUp, AlertCircle, Percent, Receipt, TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { Button } from "@/components/ui/Button";
import { ExportButtons } from "@/components/ui/ExportButtons";
import { ResumoFinanceiroLazy } from "@/components/modules/financeiro/ResumoFinanceiroLazy";
import type { ResumoMensal } from "@/components/modules/financeiro/ResumoFinanceiro";
import { saldoDevedor } from "@/lib/inadimplencia";
import { formatarMoeda } from "@/lib/utils";

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default async function FinanceiroPage() {
  const anoLetivo = await getAnoLetivoAtivo();
  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth() + 1;

  const mensalidades = await prisma.mensalidade.findMany({
    where: { ano: anoAtual, matricula: { anoLetivoId: anoLetivo?.id } },
    select: {
      mes: true,
      valor: true,
      situacao: true,
      vencimento: true,
      pagamentos: { select: { valor: true } },
    },
  });

  const porMes: ResumoMensal[] = MESES_ABREV.map((mes, i) => {
    const doMes = mensalidades.filter((m) => m.mes === i + 1 && m.situacao !== "CANCELADA");
    return {
      mes,
      previsto: doMes.reduce((acc, m) => acc + m.valor, 0),
      recebido: doMes.reduce((acc, m) => acc + m.pagamentos.reduce((a, p) => a + p.valor, 0), 0),
    };
  });

  const doMesAtual = porMes[mesAtual - 1];
  const emAberto = mensalidades
    .filter((m) => m.situacao === "PENDENTE" || m.situacao === "ATRASADA")
    .reduce((acc, m) => acc + saldoDevedor(m), 0);
  const taxaRecebimento = doMesAtual.previsto > 0 ? (doMesAtual.recebido / doMesAtual.previsto) * 100 : 0;

  return (
    <div>
      <PageHeader
        title="Financeiro"
        subtitle="Visão geral de mensalidades e recebimentos"
        breadcrumb={[{ label: "Financeiro" }]}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button href="/financeiro/mensalidades">
              <Receipt className="h-4 w-4" />
              Mensalidades
            </Button>
            <Button href="/financeiro/inadimplentes" className="bg-cda-red hover:bg-cda-red/90">
              <TriangleAlert className="h-4 w-4" />
              Inadimplentes
            </Button>
            <div className="mx-1 hidden h-7 w-px bg-cda-border sm:block" />
            <ExportButtons href="/api/relatorios/receita-mensal" label="Receita mensal" />
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Wallet} iconColor="#16A34A" value={formatarMoeda(doMesAtual.recebido)} label="Recebido no mês" />
        <MetricCard icon={TrendingUp} iconColor="#1A6FD8" value={formatarMoeda(doMesAtual.previsto)} label="Previsto no mês" />
        <MetricCard icon={AlertCircle} iconColor="#DC2626" value={formatarMoeda(emAberto)} label="Total em aberto" subtext="Pendente + atrasado" />
        <MetricCard icon={Percent} iconColor="#D97706" value={`${taxaRecebimento.toFixed(0)}%`} label="Taxa de recebimento" subtext="Mês atual" />
      </div>

      <ResumoFinanceiroLazy dados={porMes} />
    </div>
  );
}
