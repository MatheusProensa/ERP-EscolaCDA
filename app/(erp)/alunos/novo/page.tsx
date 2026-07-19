import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { AlunoForm } from "@/components/modules/alunos/AlunoForm";
import { ordenarTurmas } from "@/lib/utils";

export default async function NovoAlunoPage() {
  const anoLetivo = await prisma.anoLetivo.findFirst({ where: { ativo: true } });
  const turmas = ordenarTurmas(await prisma.turma.findMany({ where: { anoLetivoId: anoLetivo?.id } }));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Novo aluno"
        subtitle="Cadastro completo, responsável e matrícula"
        breadcrumb={[{ label: "Alunos", href: "/alunos" }, { label: "Novo" }]}
      />
      <AlunoForm turmas={turmas} />
    </div>
  );
}
