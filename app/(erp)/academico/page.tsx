import { GraduationCap, Users, School } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { contarAlunosAtivos } from "@/lib/alunos";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { TurmaCard } from "@/components/modules/academico/TurmaCard";
import { NovaTurmaModal } from "@/components/modules/academico/NovaTurmaModal";
import { AcademicoTabs } from "@/components/modules/academico/AcademicoTabs";
import { ordenarTurmas } from "@/lib/utils";

export default async function AcademicoPage() {
  const anoLetivo = await getAnoLetivoAtivo();

  const [turmasRaw, totalAlunos, totalListaEspera] = await Promise.all([
    prisma.turma.findMany({
      where: { anoLetivoId: anoLetivo?.id },
      include: { _count: { select: { matriculas: { where: { situacao: "ATIVA" } } } } },
    }),
    contarAlunosAtivos(anoLetivo?.id),
    prisma.listaEspera.count(),
  ]);
  const regulares = ordenarTurmas(turmasRaw.filter((t) => t.turno === "TARDE"));
  const contraturno = ordenarTurmas(turmasRaw.filter((t) => t.turno === "MANHA"));

  return (
    <div>
      <PageHeader
        title="Acadêmico"
        subtitle={`Ano letivo ${anoLetivo?.ano ?? "—"}`}
        breadcrumb={[{ label: "Acadêmico" }]}
        action={<NovaTurmaModal />}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <MetricCard icon={School} iconColor="#1A6FD8" value={turmasRaw.length} label="Turmas ativas" />
        <MetricCard icon={Users} iconColor="#16A34A" value={totalAlunos} label="Alunos matriculados" />
        <MetricCard
          icon={GraduationCap}
          iconColor="#7C3AED"
          value={turmasRaw.length > 0 ? Math.round(totalAlunos / turmasRaw.length) : 0}
          label="Média de alunos/turma"
        />
      </div>

      <AcademicoTabs
        active="turmas"
        totalTurmas={turmasRaw.length}
        totalAlunos={totalAlunos}
        totalListaEspera={totalListaEspera}
      />

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-cda-text2">
          Tarde — Ensino regular
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {regulares.map((t) => (
            <TurmaCard
              key={t.id}
              id={t.id}
              nome={t.nome}
              turno={t.turno}
              capacidade={t.capacidade}
              matriculados={t._count.matriculas}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-cda-text2">
          Manhã — Contraturno
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contraturno.map((t) => (
            <TurmaCard
              key={t.id}
              id={t.id}
              nome={t.nome}
              turno={t.turno}
              capacidade={t.capacidade}
              matriculados={t._count.matriculas}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
