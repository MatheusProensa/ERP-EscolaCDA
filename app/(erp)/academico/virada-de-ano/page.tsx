import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { ViradaAnoLetivoForm } from "@/components/modules/academico/ViradaAnoLetivoForm";
import { AcademicoTabs } from "@/components/modules/academico/AcademicoTabs";
import { ordenarTurmas } from "@/lib/utils";

export default async function ViradaDeAnoPage() {
  const anoLetivo = await prisma.anoLetivo.findFirst({ where: { ativo: true } });
  const turmasBrutas = anoLetivo
    ? ordenarTurmas(await prisma.turma.findMany({ where: { anoLetivoId: anoLetivo.id } }))
    : [];
  const turmas = await Promise.all(
    turmasBrutas.map(async (t) => ({
      id: t.id,
      nome: t.nome,
      turno: t.turno,
      capacidade: t.capacidade,
      matriculados: await prisma.matricula.count({ where: { turmaId: t.id, situacao: "ATIVA" } }),
    }))
  );

  return (
    <div>
      <PageHeader
        title="Virada de ano letivo"
        subtitle="Promove os alunos de todas as turmas de uma vez, pro próximo ano"
        breadcrumb={[
          { label: "Acadêmico", href: "/academico" },
          { label: "Virada de ano letivo" },
        ]}
      />

      <AcademicoTabs active="virada-de-ano" souGestao />

      {!anoLetivo ? (
        <p className="text-sm text-cda-text3">Nenhum ano letivo ativo encontrado.</p>
      ) : (
        <ViradaAnoLetivoForm anoAtual={anoLetivo.ano} turmas={turmas} />
      )}
    </div>
  );
}
