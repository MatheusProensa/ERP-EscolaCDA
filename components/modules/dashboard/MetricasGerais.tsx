import { Users, GraduationCap, UserCog, FileSignature, BookOpen } from "lucide-react";
import { DashboardMetricCard } from "@/components/modules/dashboard/DashboardMetricCard";

export function MetricasGerais({
  totalAlunos,
  turmasAtivas,
  totalFuncionarios,
  contratosPendentes,
  pedagogicoEntregues,
  pedagogicoTotal,
  podeAlunos = true,
  podeAcademico = true,
  podeFuncionarios = true,
  podePedagogico = true,
}: {
  totalAlunos: number;
  turmasAtivas: number;
  totalFuncionarios: number;
  contratosPendentes: number;
  pedagogicoEntregues: number;
  pedagogicoTotal: number;
  // Default true: ADMIN (único que renderiza sem passar essas props hoje)
  // sempre vê tudo — a checagem de verdade é feita por quem chama esse
  // componente (DashboardAdmin), pra Role que a grade de permissões possa
  // ter restringido (achado real: nutricionista com Role "Administrativo"
  // via grade, mas isso vale pra qualquer Role no futuro).
  podeAlunos?: boolean;
  podeAcademico?: boolean;
  podeFuncionarios?: boolean;
  podePedagogico?: boolean;
}) {
  return (
    // 5 cards — redesign do Dashboard (pedido do dono, mockup de referência):
    // borda superior colorida em vez do círculo de ícone (ver
    // DashboardMetricCard). Pedagógico é novo: soma de Planejamento/Roteiro/
    // Atividade Gráfica/Tema Literário aprovados esse mês, em TODAS as
    // turmas — mesma regra já usada na Fila de Impressão.
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {podeAlunos && (
        <DashboardMetricCard
          icon={Users}
          cor="var(--cda-blue)"
          value={totalAlunos}
          label="Total de alunos"
          subtext="Matrículas ativas"
          href="/alunos"
        />
      )}
      {podeAcademico && (
        <DashboardMetricCard
          icon={GraduationCap}
          cor="var(--cda-green)"
          value={turmasAtivas}
          label="Turmas ativas"
          subtext="Ano letivo atual"
          href="/academico/turmas"
        />
      )}
      {podeFuncionarios && (
        <DashboardMetricCard
          icon={UserCog}
          cor="var(--cda-amber)"
          value={totalFuncionarios}
          label="Funcionários"
          subtext="Quadro atual"
          href="/funcionarios"
        />
      )}
      {podePedagogico && (
        <DashboardMetricCard
          icon={BookOpen}
          cor="var(--cat-5-dot)"
          value={`${pedagogicoEntregues}/${pedagogicoTotal}`}
          label="Pedagógico"
          subtext="Docs entregues (mês)"
          href="/pedagogico"
        />
      )}
      {podeAlunos && (
        <DashboardMetricCard
          icon={FileSignature}
          cor={contratosPendentes > 0 ? "var(--status-danger)" : "var(--cda-green)"}
          value={contratosPendentes}
          label="Contratos pendentes"
          subtext="Em dia"
          href={contratosPendentes > 0 ? "/alunos?contrato=pendente" : undefined}
        />
      )}
    </div>
  );
}
