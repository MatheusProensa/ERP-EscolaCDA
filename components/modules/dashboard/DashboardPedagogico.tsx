import { Suspense } from "react";
import { Users, GraduationCap, Megaphone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { CensoAlerta } from "@/components/modules/dashboard/CensoAlerta";
import { FeedAtividade } from "@/components/modules/dashboard/FeedAtividade";
import { CalendarioWidget } from "@/components/modules/dashboard/CalendarioWidget";
import { MuralWidget } from "@/components/modules/dashboard/MuralWidget";
import { WidgetFallback } from "@/components/modules/dashboard/WidgetFallback";
import { AvisoFixadoBanner } from "@/components/modules/dashboard/AvisoFixadoBanner";

export async function DashboardPedagogico() {
  const anoLetivo = await prisma.anoLetivo.findFirst({ where: { ativo: true } });

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
      <PageHeader title="Dashboard Pedagógico" subtitle="Alunos, turmas e censo escolar" />

      <div className="mb-5">
        <Suspense fallback={null}>
          <AvisoFixadoBanner />
        </Suspense>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard icon={Users} iconColor="#1A6FD8" value={totalAlunos} label="Total de alunos" subtext="Matrículas ativas" />
        <MetricCard icon={GraduationCap} iconColor="#D97706" value={turmasAtivas} label="Turmas ativas" subtext="Ano letivo atual" />
        <MetricCard icon={Megaphone} iconColor="#16A34A" value={avisosFixados} label="Avisos fixados" subtext="No mural" />
      </div>

      <div className="mb-5">
        <CensoAlerta quantidade={censoIncompleto} />
      </div>

      <FeedAtividade logs={logs} />

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<WidgetFallback className="h-80" />}>
            <CalendarioWidget />
          </Suspense>
        </div>
        <Suspense fallback={<WidgetFallback />}>
          <MuralWidget />
        </Suspense>
      </div>
    </div>
  );
}
