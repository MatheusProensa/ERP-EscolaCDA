import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { FuncionarioForm } from "@/components/modules/funcionarios/FuncionarioForm";

export default async function EditarFuncionarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const funcionario = await prisma.funcionario.findUnique({ where: { id } });

  if (!funcionario) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={`Editar ${funcionario.nome}`}
        breadcrumb={[
          { label: "Funcionários", href: "/funcionarios" },
          { label: funcionario.nome, href: `/funcionarios/${funcionario.id}` },
          { label: "Editar" },
        ]}
      />
      <FuncionarioForm funcionario={funcionario} />
    </div>
  );
}
