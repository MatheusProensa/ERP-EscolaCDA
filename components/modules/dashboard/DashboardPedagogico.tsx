import { Suspense } from "react";
import { Users, GraduationCap, Megaphone, MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { CensoAlerta } from "@/components/modules/dashboard/CensoAlerta";
import { AtalhosRapidos } from "@/components/modules/dashboard/AtalhosRapidos";
import { FeedAtividade } from "@/components/modules/dashboard/FeedAtividade";
import { ProximosEventosWidget } from "@/components/modules/dashboard/ProximosEventosWidget";
import { MuralWidget } from "@/components/modules/dashboard/MuralWidget";
import { WidgetFallback } from "@/components/modules/dashboard/WidgetFallback";
import { primeiroNome } from "@/lib/utils";

export async function DashboardPedagogico({ nome }: { nome: string }) {
  const anoLetivo = await getAnoLetivoAtivo();

  const [totalAlunos, turmasAtivas, censoIncompleto, avisosFixados, logs] = await Promise.all([
    prisma.matricula.count({ where: { situacao: "ATIVA", anoLetivoId: anoLetivo?.id } }),
    prisma.turma.count({ where: { anoLetivoId: anoLetivo?.id } }),
    prisma.aluno.count({
      where: {
        matriculas: { some: { situacao: "ATIVA" } },
        OR: [{ racaCor: null }, { filiacao1: null }, { sexo: null }],
      },
    }),
    prisma.muralAviso.count({ where: { fixado: true } }),
    prisma.logAtividade.findMany({ where: { entidade: "Aluno" }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  return (
    <div>
      <PageHeader title={`Bem-vindo(a) de volta, ${primeiroNome(nome)}!`} subtitle="Alunos, turmas e censo escolar" />

      <AtalhosRapidos
        itens={[
          { label: "Chat", href: "/chat", icon: MessageCircle, color: "#1A6FD8" },
          { label: "Mural", href: "/mural", icon: Megaphone, color: "#16A34A" },
          { label: "Acadêmico", href: "/academico", icon: GraduationCap, color: "#D97706" },
          { label: "Alunos", href: "/alunos", icon: Users, color: "#7C3AED" },
        ]}
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard icon={Users} iconColor="#1A6FD8" value={totalAlunos} label="Total de alunos" subtext="Matrículas ativas" />
        <MetricCard icon={GraduationCap} iconColor="#D97706" value={turmasAtivas} label="Turmas ativas" subtext="Ano letivo atual" />
        <MetricCard icon={Megaphone} iconColor="#16A34A" value={avisosFixados} label="Avisos fixados" subtext="No mural" />
      </div>

      <div className="mb-5">
        <CensoAlerta quantidade={censoIncompleto} />
      </div>

      <div className="mb-5">
        <FeedAtividade logs={logs} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<WidgetFallback className="h-40" />}>
            <MuralWidget />
          </Suspense>
        </div>
        <Suspense fallback={<WidgetFallback className="h-60" />}>
          <ProximosEventosWidget />
        </Suspense>
      </div>
    </div>
  );
}
