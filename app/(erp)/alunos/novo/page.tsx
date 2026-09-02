import { prisma } from "@/lib/prisma";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { PageHeader } from "@/components/layout/PageHeader";
import { AlunoForm } from "@/components/modules/alunos/AlunoForm";
import { ordenarTurmas } from "@/lib/utils";
import { turmasComMatriculados } from "@/lib/turmas";

export default async function NovoAlunoPage() {
  const anoLetivo = await getAnoLetivoAtivo();
  const turmasBrutas = ordenarTurmas(await prisma.turma.findMany({ where: { anoLetivoId: anoLetivo?.id } }));
  const turmas = await turmasComMatriculados(turmasBrutas);

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
