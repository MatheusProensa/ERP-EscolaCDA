import { Users, GraduationCap } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";

export function MetricasGerais({
  totalAlunos,
  turmasAtivas,
}: {
  totalAlunos: number;
  turmasAtivas: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:max-w-md">
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
    </div>
  );
}
