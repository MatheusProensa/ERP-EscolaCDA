import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { PontoMesForm } from "@/components/modules/ponto/PontoMesForm";
import { ImportarPontoModal } from "@/components/modules/ponto/ImportarPontoModal";

export default async function PontoFuncionarioPage({
  params,
}: {
  params: Promise<{ funcionarioId: string }>;
}) {
  const { funcionarioId } = await params;
  const funcionario = await prisma.funcionario.findUnique({ where: { id: funcionarioId } });
  if (!funcionario) notFound();

  return (
    <div>
      <PageHeader
        title={`Ponto — ${funcionario.nome}`}
        subtitle={`${funcionario.cargo} · ${funcionario.setor}`}
        action={<ImportarPontoModal funcionarioId={funcionario.id} funcionarioNome={funcionario.nome} />}
      />
      <PontoMesForm
        funcionarioId={funcionario.id}
        jornadaPrevistaMinutos={funcionario.jornadaPrevistaMinutos}
      />
    </div>
  );
}
