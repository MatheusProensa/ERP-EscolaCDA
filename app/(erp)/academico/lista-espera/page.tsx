import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { ListaEsperaTable } from "@/components/modules/academico/ListaEsperaTable";
import { NovaListaEsperaModal } from "@/components/modules/academico/NovaListaEsperaModal";
import { ordenarTurmas } from "@/lib/utils";

export default async function ListaEsperaPage() {
  const anoLetivo = await prisma.anoLetivo.findFirst({ where: { ativo: true } });
  const [itens, turmas] = await Promise.all([
    prisma.listaEspera.findMany({
      include: { turmaDesejada: { select: { nome: true } } },
      orderBy: { createdAt: "asc" },
    }),
    ordenarTurmas(await prisma.turma.findMany({ where: { anoLetivoId: anoLetivo?.id } })),
  ]);

  return (
    <div>
      <PageHeader
        title="Lista de espera"
        subtitle="Crianças aguardando vaga"
        breadcrumb={[{ label: "Acadêmico", href: "/academico" }, { label: "Lista de espera" }]}
        action={<NovaListaEsperaModal turmas={turmas} />}
      />

      <Card>
        <ListaEsperaTable itens={itens} />
      </Card>
    </div>
  );
}
