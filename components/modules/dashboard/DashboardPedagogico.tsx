import { Suspense } from "react";
import { Users, GraduationCap, Megaphone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { contarAlunosAtivos } from "@/lib/alunos";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { CensoAlerta } from "@/components/modules/dashboard/CensoAlerta";
import { FeedAtividade } from "@/components/modules/dashboard/FeedAtividade";
import { ProximosEventosWidget } from "@/components/modules/dashboard/ProximosEventosWidget";
import { MuralWidget } from "@/components/modules/dashboard/MuralWidget";
import { WidgetFallback } from "@/components/modules/dashboard/WidgetFallback";
import { podeVerModulo, type PermissoesPorModulo } from "@/lib/permissoes";
import { primeiroNome } from "@/lib/utils";

export async function DashboardPedagogico({
  nome,
  role,
  permissoes,
}: {
  nome: string;
  role: string;
  permissoes?: PermissoesPorModulo;
}) {
  // Mesmo achado do DashboardAdministrativo: Role "Pedagógico" não significa
  // mais acesso a Alunos/Acadêmico se a grade restringiu a pessoa a outro
  // setor (ex.: só Cardápio) — cada card/atalho confere a grade de verdade.
  const podeAlunos = podeVerModulo("/alunos", role, permissoes);
  const podeAcademico = podeVerModulo("/academico", role, permissoes);
  const anoLetivo = await getAnoLetivoAtivo();

  const [totalAlunos, turmasAtivas, censoIncompleto, avisosFixados, logs] = await Promise.all([
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
    prisma.muralAviso.count({ where: { fixado: true } }),
    podeAlunos
      ? prisma.logAtividade.findMany({ where: { entidade: "Aluno" }, orderBy: { createdAt: "desc" }, take: 8 })
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <PageHeader title={`Bem-vindo(a) de volta, ${primeiroNome(nome)}!`} subtitle="Alunos, turmas e censo escolar" />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {podeAlunos && (
          <MetricCard icon={Users} tone="cat1" value={totalAlunos} label="Total de alunos" subtext="Matrículas ativas" href="/alunos" />
        )}
        {podeAcademico && (
          <MetricCard icon={GraduationCap} tone="cat3" value={turmasAtivas} label="Turmas ativas" subtext="Ano letivo atual" href="/academico/turmas" />
        )}
        <MetricCard icon={Megaphone} tone="cat4" value={avisosFixados} label="Avisos fixados" subtext="No mural" href="/mural" />
      </div>

      {podeAlunos && (
        <div className="mb-5">
          <CensoAlerta quantidade={censoIncompleto} />
        </div>
      )}

      {podeAlunos && (
        <div className="mb-5">
          <FeedAtividade logs={logs} />
        </div>
      )}

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
