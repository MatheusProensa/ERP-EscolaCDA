import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { TurmaCard } from "@/components/modules/academico/TurmaCard";
import { NovaTurmaModal } from "@/components/modules/academico/NovaTurmaModal";
import { ordenarTurmas } from "@/lib/utils";

export default async function TurmasPage() {
  const anoLetivo = await prisma.anoLetivo.findFirst({ where: { ativo: true } });
  const turmas = await prisma.turma.findMany({
    where: { anoLetivoId: anoLetivo?.id },
    include: { _count: { select: { matriculas: { where: { situacao: "ATIVA" } } } } },
  });

  const regulares = ordenarTurmas(turmas.filter((t) => t.turno === "TARDE"));
  const contraturno = ordenarTurmas(turmas.filter((t) => t.turno === "MANHA"));

  return (
    <div>
      <PageHeader
        title="Turmas"
        subtitle={`Ano letivo ${anoLetivo?.ano ?? "—"}`}
        breadcrumb={[{ label: "Acadêmico", href: "/academico" }, { label: "Turmas" }]}
        action={<NovaTurmaModal />}
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
