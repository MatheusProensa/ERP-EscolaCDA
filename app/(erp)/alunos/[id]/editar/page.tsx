import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { EditarAlunoForm } from "@/components/modules/alunos/EditarAlunoForm";
import { podeEditarModulo } from "@/lib/permissoes";

export default async function EditarAlunoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!podeEditarModulo("/alunos", session?.user.role ?? "", session?.user.permissoes)) redirect(`/alunos/${id}`);

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
