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
      />
      <MetricCard
        icon={AlertTriangle}
        iconColor="#DC2626"
        value={inadimplentes}
        label="Inadimplentes"
        subtext="Com mensalidade em atraso"
        badge={inadimplentes > 0 ? "Atenção" : "Em dia"}
        badgeVariant={inadimplentes > 0 ? "red" : "green"}
      />
      <MetricCard
        icon={Wallet}
        iconColor="#16A34A"
        value={formatarMoeda(receitaMes)}
        label="Receita do mês"
        subtext="Pagamentos recebidos"
      />
      <MetricCard
        icon={GraduationCap}
        iconColor="#D97706"
        value={turmasAtivas}
        label="Turmas ativas"
        subtext="Ano letivo atual"
      />
    </div>
  );
}
