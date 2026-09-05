import { Users, GraduationCap, UserCog, FileSignature } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";

export function MetricasGerais({
  totalAlunos,
  turmasAtivas,
  funcionariosAtivos,
  contratosPendentes,
  podeAlunos = true,
  podeAcademico = true,
  podeFuncionarios = true,
}: {
  totalAlunos: number;
  turmasAtivas: number;
  funcionariosAtivos: number;
  contratosPendentes: number;
  // Default true: ADMIN (único que renderiza sem passar essas props hoje)
  // sempre vê tudo — a checagem de verdade é feita por quem chama esse
  // componente (DashboardAdmin), pra Role que a grade de permissões possa
  // ter restringido (achado real: nutricionista com Role "Administrativo"
  // via grade, mas isso vale pra qualquer Role no futuro).
  podeAlunos?: boolean;
  podeAcademico?: boolean;
  podeFuncionarios?: boolean;
}) {
  return (
    // NOVO: 4 cards em vez de 2 — sobrava espaço vazio do lado com só Total de
    // alunos/Turmas ativas. Funcionários ativos e Contratos pendentes de
    // assinatura são contagens baratas que já existiam em outros módulos.
    // Os 3 primeiros usam cor categórica (não é estado, é só personalidade de
    // volta) — só o de Contratos pendentes usa cor de status de verdade.
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {podeAlunos && (
        <MetricCard
          icon={Users}
          tone="cat1"
          value={totalAlunos}
          label="Total de alunos"
          subtext="Matrículas ativas"
          href="/alunos"
        />
      )}
      {podeAcademico && (
        <MetricCard
          icon={GraduationCap}
          tone="cat3"
          value={turmasAtivas}
          label="Turmas ativas"
          subtext="Ano letivo atual"
          href="/academico/turmas"
        />
      )}
      {podeFuncionarios && (
        <MetricCard
          icon={UserCog}
          tone="cat5"
          value={funcionariosAtivos}
          label="Funcionários ativos"
          subtext="Quadro atual"
          href="/funcionarios"
        />
      )}
      {podeAlunos && (
        <MetricCard
          icon={FileSignature}
          tone={contratosPendentes > 0 ? "danger" : "success"}
          value={contratosPendentes}
          label="Contratos pendentes"
          subtext="Aguardando assinatura"
          href={contratosPendentes > 0 ? "/alunos?contrato=pendente" : undefined}
        />
      )}
    </div>
  );
}
