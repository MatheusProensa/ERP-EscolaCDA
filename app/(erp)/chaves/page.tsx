import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChaveCard } from "@/components/modules/chaves/ChaveCard";
import { NovaChaveModal } from "@/components/modules/chaves/NovaChaveModal";

export default async function ChavesPage() {
  const chaves = await prisma.chave.findMany({
    where: { ativa: true },
    include: { emprestimos: { where: { devolucao: null } } },
    orderBy: { sala: "asc" },
  });

  return (
    <div>
      <PageHeader title="Chaves" subtitle="Controle de retirada e devolução de salas" action={<NovaChaveModal />} />

      {chaves.length === 0 ? (
        <p className="py-10 text-center text-sm text-cda-text3">Nenhuma chave cadastrada ainda.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {chaves.map((chave) => (
            <ChaveCard key={chave.id} chave={chave} />
          ))}
        </div>
      )}
    </div>
  );
}
