import { Users, GraduationCap, UserCog, FileSignature } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";

export function MetricasGerais({
  totalAlunos,
  turmasAtivas,
  funcionariosAtivos,
  contratosPendentes,
}: {
  totalAlunos: number;
  turmasAtivas: number;
  funcionariosAtivos: number;
  contratosPendentes: number;
}) {
  return (
    // NOVO: 4 cards em vez de 2 — sobrava espaço vazio do lado com só Total de
    // alunos/Turmas ativas. Funcionários ativos e Contratos pendentes de
    // assinatura são contagens baratas que já existiam em outros módulos.
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
        icon={GraduationCap}
        iconColor="#D97706"
        value={turmasAtivas}
        label="Turmas ativas"
        subtext="Ano letivo atual"
        trend={[12, 12, 13, 13, 14, 14, 14]}
      />
      <MetricCard
        icon={UserCog}
        iconColor="#7C3AED"
        value={funcionariosAtivos}
        label="Funcionários ativos"
        subtext="Quadro atual"
      />
      <MetricCard
        icon={FileSignature}
        iconColor={contratosPendentes > 0 ? "#DC2626" : "#16A34A"}
        value={contratosPendentes}
        label="Contratos pendentes"
        subtext="Aguardando assinatura"
      />
    </div>
  );
}
