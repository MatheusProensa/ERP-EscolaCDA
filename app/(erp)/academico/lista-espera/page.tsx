import { prisma } from "@/lib/prisma";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { ListaEsperaTable } from "@/components/modules/academico/ListaEsperaTable";
import { NovaListaEsperaModal } from "@/components/modules/academico/NovaListaEsperaModal";
import { AcademicoTabs } from "@/components/modules/academico/AcademicoTabs";
import { ordenarTurmas } from "@/lib/utils";

export default async function ListaEsperaPage() {
  const anoLetivo = await getAnoLetivoAtivo();
  const [itens, turmasRaw] = await Promise.all([
    prisma.listaEspera.findMany({
      include: { turmaDesejada: { select: { nome: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.turma.findMany({ where: { anoLetivoId: anoLetivo?.id } }),
  ]);
  const turmas = ordenarTurmas(turmasRaw);

  return (
    <div>
      <PageHeader
        title="Lista de espera"
        subtitle="Crianças aguardando vaga"
        breadcrumb={[{ label: "Acadêmico", href: "/academico" }, { label: "Lista de espera" }]}
        action={<NovaListaEsperaModal turmas={turmas} />}
      />

      <AcademicoTabs active="lista-espera" totalListaEspera={itens.length} />

      <Card>
        <ListaEsperaTable itens={itens} />
      </Card>
    </div>
  );
}
