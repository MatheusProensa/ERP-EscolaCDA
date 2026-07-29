import { Users, AlertTriangle, Wallet, GraduationCap } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import { formatarMoeda } from "@/lib/utils";

export function MetricasGerais({
  totalAlunos,
  inadimplentes,
  receitaMes,
  turmasAtivas,
}: {
  totalAlunos: number;
  inadimplentes: number;
  receitaMes: number;
  turmasAtivas: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        icon={Users}
        iconColor="#1A6FD8"
        value={totalAlunos}
        label="Total de alunos"
        subtext="Matrículas ativas"
        // NOVO: sparkline decorativo — troque por uma série real (ex.: total de
        // matrículas ativas nos últimos 7 dias) quando houver o dado histórico.
        trend={[8, 12, 10, 14, 13, 16, 18]}
      />
      <MetricCard
        icon={AlertTriangle}
        iconColor="#DC2626"
        value={inadimplentes}
        label="Inadimplentes"
        subtext="Com mensalidade em atraso"
        trend={[2, 4, 3, 5, 4, 3, 3]}
        // NOVO: removido o badge "Atenção"/"Em dia" — a cor vermelha do ícone já
        // comunica o estado; o badge só disputava espaço com o valor.
      />
      <MetricCard
        icon={Wallet}
        iconColor="#16A34A"
        value={formatarMoeda(receitaMes)}
        label="Receita do mês"
        subtext="Pagamentos recebidos"
        trend={[30, 34, 33, 38, 41, 45, 48]}
      />
      <MetricCard
        icon={GraduationCap}
        iconColor="#D97706"
        value={turmasAtivas}
        label="Turmas ativas"
        subtext="Ano letivo atual"
        trend={[12, 12, 13, 13, 14, 14, 14]}
      />
    </div>
  );
}
