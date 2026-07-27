import { Wallet, TrendingUp, AlertCircle, Percent } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { TabelaInadimplentes, type Inadimplente } from "@/components/modules/dashboard/TabelaInadimplentes";
import { FeedAtividade } from "@/components/modules/dashboard/FeedAtividade";
import { CalendarioWidget } from "@/components/modules/dashboard/CalendarioWidget";
import { diasEmAtraso, formatarMoeda } from "@/lib/utils";

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
      where: { situacao: "ATRASADA" },
      include: { matricula: { include: { aluno: true, turma: true } } },
      orderBy: { vencimento: "asc" },
    }),
    prisma.mensalidade.aggregate({
      _sum: { valor: true },
      where: { situacao: { in: ["PENDENTE", "ATRASADA"] } },
    }),
    prisma.logAtividade.findMany({ where: { entidade: "Mensalidade" }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const previsto = mensalidadesDoMes.reduce((acc, m) => acc + m.valor, 0);
  const recebido = mensalidadesDoMes.reduce((acc, m) => acc + m.pagamentos.reduce((a, p) => a + p.valor, 0), 0);
  const taxaRecebimento = previsto > 0 ? (recebido / previsto) * 100 : 0;

  const porAluno = new Map<string, Inadimplente>();
  for (const m of mensalidadesAtrasadas) {
    const alunoId = m.matricula.alunoId;
    const existente = porAluno.get(alunoId);
    const atraso = diasEmAtraso(m.vencimento);
    if (existente) {
      existente.valor += m.valor;
      existente.diasAtraso = Math.max(existente.diasAtraso, atraso);
    } else {
      porAluno.set(alunoId, {
        alunoId,
        nome: m.matricula.aluno.nome,
        turma: m.matricula.turma.nome,
        valor: m.valor,
        diasAtraso: atraso,
      });
    }
  }
  const inadimplentes = Array.from(porAluno.values()).sort((a, b) => b.diasAtraso - a.diasAtraso);

  return (
    <div>
      <PageHeader title="Dashboard Financeiro" subtitle="Receita, inadimplência e mensalidades" />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Wallet} iconColor="#16A34A" value={formatarMoeda(recebido)} label="Recebido no mês" />
        <MetricCard icon={TrendingUp} iconColor="#1A6FD8" value={formatarMoeda(previsto)} label="Previsto no mês" />
        <MetricCard
          icon={AlertCircle}
          iconColor="#DC2626"
          value={formatarMoeda(mensalidadesEmAberto._sum.valor ?? 0)}
          label="Total em aberto"
          subtext="Pendente + atrasado"
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
