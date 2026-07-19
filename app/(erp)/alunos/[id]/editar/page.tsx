import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { EditarAlunoForm } from "@/components/modules/alunos/EditarAlunoForm";

export default async function EditarAlunoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const aluno = await prisma.aluno.findUnique({ where: { id } });

  if (!aluno) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`Editar ${aluno.nome}`}
        breadcrumb={[
          { label: "Alunos", href: "/alunos" },
          { label: aluno.nome, href: `/alunos/${aluno.id}` },
          { label: "Editar" },
        ]}
      />
      <EditarAlunoForm aluno={aluno} />
    </div>
  );
}
