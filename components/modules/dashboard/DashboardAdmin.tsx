import { Suspense } from "react";
import { Users, UserCog, Megaphone, MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { contarAlunosAtivos } from "@/lib/alunos";
import { PageHeader } from "@/components/layout/PageHeader";
import { WidgetFallback } from "@/components/modules/dashboard/WidgetFallback";
import { MetricasGerais } from "@/components/modules/dashboard/MetricasGerais";
import { CensoAlerta } from "@/components/modules/dashboard/CensoAlerta";
import { AtalhosRapidos } from "@/components/modules/dashboard/AtalhosRapidos";
import { ProximosEventosWidget } from "@/components/modules/dashboard/ProximosEventosWidget";
import { AtividadeRecenteWidget } from "@/components/modules/dashboard/AtividadeRecenteWidget";
import { MuralWidget } from "@/components/modules/dashboard/MuralWidget";
import { primeiroNome } from "@/lib/utils";

export async function DashboardAdmin({ nome }: { nome: string }) {
  const anoLetivo = await getAnoLetivoAtivo();

  const [totalAlunos, turmasAtivas, censoIncompleto, funcionariosAtivos, contratosPendentes] = await Promise.all([
    contarAlunosAtivos(anoLetivo?.id),
    prisma.turma.count({ where: { anoLetivoId: anoLetivo?.id } }),
    prisma.aluno.count({
      where: {
        matriculas: { some: { situacao: "ATIVA" } },
        OR: [{ racaCor: null }, { filiacao1: null }, { sexo: null }],
      },
    }),
    prisma.funcionario.count({ where: { ativo: true } }),
    prisma.contrato.count({ where: { assinado: false } }),
  ]);

  return (
    <div>
      <PageHeader title={`Bem-vindo(a) de volta, ${primeiroNome(nome)}!`} subtitle="Visão geral da Escola CDA — todos os setores" />

      <AtalhosRapidos
        itens={[
          { label: "Chat", href: "/chat", icon: MessageCircle, color: "#1A6FD8" },
          { label: "Mural", href: "/mural", icon: Megaphone, color: "#16A34A" },
          { label: "Alunos", href: "/alunos", icon: Users, color: "#D97706" },
          { label: "Funcionários", href: "/funcionarios", icon: UserCog, color: "#7C3AED" },
        ]}
      />

      <div className="mb-5">
        <MetricasGerais
          totalAlunos={totalAlunos}
          turmasAtivas={turmasAtivas}
          funcionariosAtivos={funcionariosAtivos}
          contratosPendentes={contratosPendentes}
        />
      </div>

      <div className="mb-5">
        <CensoAlerta quantidade={censoIncompleto} />
      </div>

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
