import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { AvisoCard } from "@/components/modules/mural/AvisoCard";
import { NovoAvisoModal } from "@/components/modules/mural/NovoAvisoModal";
import { GESTAO } from "@/lib/permissoes";

export default async function MuralPage() {
  const session = await auth();
  const avisos = await prisma.muralAviso.findMany({
    orderBy: [{ fixado: "desc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { leituras: true } },
      leituras: { where: { userId: session!.user.id }, select: { id: true } },
    },
  });
  const ehGestao = GESTAO.includes(session!.user.role as (typeof GESTAO)[number]);

  return (
    <div>
      <PageHeader
        title="Mural de avisos"
        subtitle="Comunicados internos da equipe"
        action={<NovoAvisoModal />}
      />

      {avisos.length === 0 ? (
        <Card className="p-0">
          <EmptyState title="Nenhum aviso publicado ainda." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {avisos.map((aviso) => (
            <AvisoCard
              key={aviso.id}
              aviso={aviso}
              podeGerenciar={ehGestao || aviso.autorId === session!.user.id}
              totalLeituras={aviso._count.leituras}
              confirmadoInicial={aviso.leituras.length > 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
