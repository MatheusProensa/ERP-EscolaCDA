import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { contarAlunosAtivos } from "@/lib/alunos";
import { PageHeader } from "@/components/layout/PageHeader";
import { WidgetFallback } from "@/components/modules/dashboard/WidgetFallback";
import { MetricasGerais } from "@/components/modules/dashboard/MetricasGerais";
import { CensoAlerta } from "@/components/modules/dashboard/CensoAlerta";
import { ProximosEventosWidget } from "@/components/modules/dashboard/ProximosEventosWidget";
import { AtividadeRecenteWidget } from "@/components/modules/dashboard/AtividadeRecenteWidget";
import { MuralWidget } from "@/components/modules/dashboard/MuralWidget";
import { podeVerModulo, type PermissoesPorModulo } from "@/lib/permissoes";
import { primeiroNome } from "@/lib/utils";

export async function DashboardAdmin({
  nome,
  role,
  permissoes,
}: {
  nome: string;
  role: string;
  permissoes?: PermissoesPorModulo;
}) {
  // ADMIN sempre passa (acessoPermitido libera tudo pra ele) — mas DIRECAO e
  // FINANCEIRO também caem nesse dashboard, e a grade de permissões pode
  // restringir qualquer um deles do mesmo jeito que já aconteceu com
  // "Administrativo" (nutricionista só com Cardápio). Confere de verdade.
  const podeAlunos = podeVerModulo("/alunos", role, permissoes);
  const podeAcademico = podeVerModulo("/academico", role, permissoes);
  const podeFuncionarios = podeVerModulo("/funcionarios", role, permissoes);
  const anoLetivo = await getAnoLetivoAtivo();

  const [totalAlunos, turmasAtivas, censoIncompleto, funcionariosAtivos, contratosPendentes] = await Promise.all([
    podeAlunos ? contarAlunosAtivos(anoLetivo?.id) : Promise.resolve(0),
    podeAcademico ? prisma.turma.count({ where: { anoLetivoId: anoLetivo?.id } }) : Promise.resolve(0),
    podeAlunos
      ? prisma.aluno.count({
          where: {
            matriculas: { some: { situacao: "ATIVA" } },
            OR: [{ racaCor: null }, { filiacao1: null }, { sexo: null }],
          },
        })
      : Promise.resolve(0),
    podeFuncionarios ? prisma.funcionario.count({ where: { ativo: true } }) : Promise.resolve(0),
    podeAlunos ? prisma.contrato.count({ where: { assinado: false } }) : Promise.resolve(0),
  ]);

  return (
    <div>
      <PageHeader title={`Bem-vindo(a) de volta, ${primeiroNome(nome)}!`} subtitle="Visão geral da Escola CDA — todos os setores" />

      {/* Atalhos (Chat/Novo aluno/Novo funcionário) removidos — duplicavam a
          navegação (Chat já tem ícone na topbar) e misturavam ações raras
          (matricular aluno) com o que se usa toda hora. "Novo aviso" migrou pro
          action do card do Mural, ali embaixo. */}
      <div className="mb-5">
        <MetricasGerais
          totalAlunos={totalAlunos}
          turmasAtivas={turmasAtivas}
          funcionariosAtivos={funcionariosAtivos}
          contratosPendentes={contratosPendentes}
          podeAlunos={podeAlunos}
          podeAcademico={podeAcademico}
          podeFuncionarios={podeFuncionarios}
        />
      </div>

      {podeAlunos && (
        <div className="mb-5">
          <CensoAlerta quantidade={censoIncompleto} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<WidgetFallback className="h-40" />}>
            <MuralWidget />
          </Suspense>
        </div>
        <div className="flex flex-col gap-5">
          <Suspense fallback={<WidgetFallback className="h-60" />}>
            <ProximosEventosWidget />
          </Suspense>
          {/* NOVO: só aparece pro Admin — mesma restrição de /log-atividades. */}
          <Suspense fallback={null}>
            <AtividadeRecenteWidget />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
