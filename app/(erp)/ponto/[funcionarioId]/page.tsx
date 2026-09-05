import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { PontoMesForm } from "@/components/modules/ponto/PontoMesForm";
import { ImportarPontoModal } from "@/components/modules/ponto/ImportarPontoModal";
import { podeEditarModulo } from "@/lib/permissoes";

export default async function PontoFuncionarioPage({
  params,
}: {
  params: Promise<{ funcionarioId: string }>;
}) {
  const { funcionarioId } = await params;
  const session = await auth();
  // Essa tela inteira é lançamento dia a dia (grade 100% editável, sem modo
  // só-leitura) — quem tem "Só visualizar" em Ponto fica só com o resumo da
  // listagem (/ponto), não com o formulário de lançar.
  if (!podeEditarModulo("/ponto", session?.user.role ?? "", session?.user.permissoes)) redirect("/ponto");

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
