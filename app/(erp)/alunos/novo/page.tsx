import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { AlunoForm } from "@/components/modules/alunos/AlunoForm";
import { ordenarTurmas } from "@/lib/utils";

export default async function NovoAlunoPage() {
  const anoLetivo = await prisma.anoLetivo.findFirst({ where: { ativo: true } });
  const turmasBrutas = ordenarTurmas(await prisma.turma.findMany({ where: { anoLetivoId: anoLetivo?.id } }));
  const turmas = await Promise.all(
    turmasBrutas.map(async (t) => ({
      ...t,
      matriculados: await prisma.matricula.count({ where: { turmaId: t.id, situacao: "ATIVA" } }),
    }))
  );

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
