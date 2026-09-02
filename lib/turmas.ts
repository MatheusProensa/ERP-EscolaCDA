import { prisma } from "@/lib/prisma";
import type { Turma } from "@prisma/client";

/** Turma com a contagem de matriculados ativos. Antes cada tela disparava um
 * `prisma.matricula.count` por turma em loop (N idas ao banco) — achado da
 * auditoria ago/2026, estava duplicado igualzinho em alunos/[id]/page.tsx e
 * alunos/novo/page.tsx. Um `groupBy` só resolve todas de uma vez. */
export async function turmasComMatriculados<T extends Turma>(turmas: T[]): Promise<(T & { matriculados: number })[]> {
  if (turmas.length === 0) return [];
  const contagens = await prisma.matricula.groupBy({
    by: ["turmaId"],
    where: { turmaId: { in: turmas.map((t) => t.id) }, situacao: "ATIVA" },
    _count: true,
  });
  const porTurma = new Map(contagens.map((c) => [c.turmaId, c._count]));
  return turmas.map((t) => ({ ...t, matriculados: porTurma.get(t.id) ?? 0 }));
}
