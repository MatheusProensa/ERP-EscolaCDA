import { prisma } from "@/lib/prisma";

/** Conta ALUNOS distintos com matrícula ativa — não "matrículas ativas".
 * Um aluno pode ter mais de uma matrícula ativa ao mesmo tempo (ex.: turma
 * principal + contraturno), então `prisma.matricula.count()` conta esse
 * aluno 2x. Isso já causou o "Total de alunos" do dashboard mostrar um
 * número maior que a quantidade real de crianças matriculadas. */
export async function contarAlunosAtivos(anoLetivoId: string | undefined): Promise<number> {
  const matriculas = await prisma.matricula.findMany({
    where: { situacao: "ATIVA", anoLetivoId },
    distinct: ["alunoId"],
    select: { alunoId: true },
  });
  return matriculas.length;
}
