import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChaveCard } from "@/components/modules/chaves/ChaveCard";
import { NovaChaveModal } from "@/components/modules/chaves/NovaChaveModal";
import { ChavesExportButton } from "@/components/modules/chaves/ChavesExportButton";

export default async function ChavesPage() {
  const [chaves, funcionarios] = await Promise.all([
    prisma.chave.findMany({
      where: { ativa: true },
      include: { emprestimos: { where: { devolucao: null } } },
      orderBy: { sala: "asc" },
    }),
    prisma.funcionario.findMany({ where: { ativo: true }, select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Chaves"
        subtitle="Controle de retirada e devolução de salas"
        action={
          <>
            {chaves.length > 0 && <ChavesExportButton />}
            <NovaChaveModal />
          </>
        }
      />

      {chaves.length === 0 ? (
        <Card className="p-0">
          <EmptyState title="Nenhuma chave cadastrada ainda." />
        </Card>
      ) : (
        // NOVO: 3 colunas em telas médias (notebook) em vez de 4 — o nome da sala
        // (ex.: "Contraturno V") ficava espremido e cortado ao lado do badge/botões.
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {chaves.map((chave) => (
            <ChaveCard key={chave.id} chave={chave} funcionarios={funcionarios} />
          ))}
        </div>
      )}
    </div>
  );
}
