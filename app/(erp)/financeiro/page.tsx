import Link from "next/link";
import { Wallet, TrendingUp, AlertCircle, Percent } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { ExportButtons } from "@/components/ui/ExportButtons";
import { ResumoFinanceiro, type ResumoMensal } from "@/components/modules/financeiro/ResumoFinanceiro";
import { formatarMoeda } from "@/lib/utils";

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default async function FinanceiroPage() {
  const anoLetivo = await prisma.anoLetivo.findFirst({ where: { ativo: true } });
  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth() + 1;

  const mensalidades = await prisma.mensalidade.findMany({
    where: { ano: anoAtual, matricula: { anoLetivoId: anoLetivo?.id } },
    include: { pagamentos: true },
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
    .reduce((acc, m) => acc + m.valor, 0);
  const taxaRecebimento = doMesAtual.previsto > 0 ? (doMesAtual.recebido / doMesAtual.previsto) * 100 : 0;

  return (
    <div>
      <PageHeader
        title="Financeiro"
        subtitle="Visão geral de mensalidades e recebimentos"
        breadcrumb={[{ label: "Financeiro" }]}
        action={<ExportButtons href="/api/relatorios/receita-mensal" label="Receita mensal" />}
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Wallet} iconColor="#16A34A" value={formatarMoeda(doMesAtual.recebido)} label="Recebido no mês" />
        <MetricCard icon={TrendingUp} iconColor="#1A6FD8" value={formatarMoeda(doMesAtual.previsto)} label="Previsto no mês" />
        <MetricCard icon={AlertCircle} iconColor="#DC2626" value={formatarMoeda(emAberto)} label="Total em aberto" subtext="Pendente + atrasado" />
        <MetricCard icon={Percent} iconColor="#D97706" value={`${taxaRecebimento.toFixed(0)}%`} label="Taxa de recebimento" subtext="Mês atual" />
      </div>

      <ResumoFinanceiro dados={porMes} />

      <div className="mt-5 flex gap-3 text-sm">
        <Link href="/financeiro/mensalidades" className="font-medium text-cda-blue hover:underline">
          Ver mensalidades →
        </Link>
        <Link href="/financeiro/inadimplentes" className="font-medium text-cda-blue hover:underline">
          Ver inadimplentes →
        </Link>
      </div>
    </div>
  );
}
