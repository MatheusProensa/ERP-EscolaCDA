import type { Responsavel } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Mãe e pai primeiro (é o que a secretaria quer pra ligar rápido), o resto dos
// responsáveis (avó, tio etc.) preenche as duas posições na ordem que sobrar.
// Usado tanto na tabela de Alunos quanto no relatório de contatos telefônicos.
export function separarResponsaveis(responsaveis: Responsavel[]) {
  const restante = [...responsaveis];
  function tirar(parentesco: string) {
    const i = restante.findIndex((r) => r.parentesco.trim().toLowerCase() === parentesco);
    if (i === -1) return null;
    return restante.splice(i, 1)[0];
  }
  const mae = tirar("mãe") ?? tirar("mae");
  const pai = tirar("pai");
  return { resp1: mae ?? restante.shift() ?? null, resp2: pai ?? restante.shift() ?? null };
}

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
