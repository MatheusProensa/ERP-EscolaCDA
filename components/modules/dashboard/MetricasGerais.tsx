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
    // Os 3 primeiros usam cor categórica (não é estado, é só personalidade de
    // volta) — só o de Contratos pendentes usa cor de status de verdade.
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <MetricCard
        icon={Users}
        tone="cat1"
        value={totalAlunos}
        label="Total de alunos"
        subtext="Matrículas ativas"
        // NOVO: sparkline decorativo — troque por uma série real (ex.: total de
        // matrículas ativas nos últimos 7 dias) quando houver o dado histórico.
        trend={[8, 12, 10, 14, 13, 16, 18]}
      />
      <MetricCard
        icon={GraduationCap}
        tone="cat3"
        value={turmasAtivas}
        label="Turmas ativas"
        subtext="Ano letivo atual"
        trend={[12, 12, 13, 13, 14, 14, 14]}
      />
      <MetricCard
        icon={UserCog}
        tone="cat5"
        value={funcionariosAtivos}
        label="Funcionários ativos"
        subtext="Quadro atual"
      />
      <MetricCard
        icon={FileSignature}
        tone={contratosPendentes > 0 ? "danger" : "success"}
        value={contratosPendentes}
        label="Contratos pendentes"
        subtext="Aguardando assinatura"
        href={contratosPendentes > 0 ? "/alunos?contrato=pendente" : undefined}
      />
    </div>
  );
}
