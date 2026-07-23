import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { AvisoCard } from "@/components/modules/mural/AvisoCard";
import { NovoAvisoModal } from "@/components/modules/mural/NovoAvisoModal";

export default async function MuralPage() {
  const avisos = await prisma.muralAviso.findMany({
    orderBy: [{ fixado: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <PageHeader
        title="Mural de avisos"
        subtitle="Comunicados internos da equipe"
        action={<NovoAvisoModal />}
      />

      {avisos.length === 0 ? (
        <p className="py-10 text-center text-sm text-cda-text3">Nenhum aviso publicado ainda.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {avisos.map((aviso) => (
            <AvisoCard key={aviso.id} aviso={aviso} />
          ))}
        </div>
      )}
    </div>
  );
}
