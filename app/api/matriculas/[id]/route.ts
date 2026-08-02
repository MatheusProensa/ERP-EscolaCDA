import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";

const SITUACOES = ["ATIVA", "TRANCADA", "CANCELADA", "TRANSFERIDA", "CONCLUIDA"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { situacao, turmaId } = body;

  if (situacao !== undefined && !SITUACOES.includes(situacao)) {
    return NextResponse.json({ error: "Situação inválida" }, { status: 400 });
  }

  // Transferência de turma de verdade: move a mesma matrícula (mantém histórico de
  // mensalidades) pra outra turma do mesmo ano letivo, checando vaga antes.
  if (turmaId) {
    const [matriculaAtual, turmaDestino] = await Promise.all([
      prisma.matricula.findUnique({ where: { id }, include: { turma: true } }),
      prisma.turma.findUnique({ where: { id: turmaId } }),
    ]);
    if (!matriculaAtual) return NextResponse.json({ error: "Matrícula não encontrada" }, { status: 404 });
    if (!turmaDestino) return NextResponse.json({ error: "Turma de destino não encontrada" }, { status: 400 });
    if (turmaDestino.anoLetivoId !== matriculaAtual.anoLetivoId) {
      return NextResponse.json({ error: "A turma de destino precisa ser do mesmo ano letivo" }, { status: 400 });
    }

    const matriculados = await prisma.matricula.count({
      where: { turmaId, situacao: "ATIVA" },
    });
    if (matriculados >= turmaDestino.capacidade) {
      return NextResponse.json(
        { error: `A turma ${turmaDestino.nome} já está com a capacidade cheia (${matriculados}/${turmaDestino.capacidade}).` },
        { status: 400 }
      );
    }

    try {
      const matricula = await prisma.matricula.update({ where: { id }, data: { turmaId } });

      await prisma.logAtividade.create({
        data: {
          acao: `Transferido(a) de ${matriculaAtual.turma.nome} para ${turmaDestino.nome}`,
          entidade: "Matricula",
          entidadeId: id,
          usuario: session.user.name ?? "Usuário",
        },
      });

      return NextResponse.json(matricula);
    } catch (err) {
      return erroApi(err);
    }
  }

  try {
    const matricula = await prisma.matricula.update({
      where: { id },
      data: { situacao },
    });

    await prisma.logAtividade.create({
      data: {
        acao: `Situação da matrícula alterada para ${situacao}`,
        entidade: "Matricula",
        entidadeId: id,
        usuario: session.user.name ?? "Usuário",
      },
    });

    return NextResponse.json(matricula);
  } catch (err) {
    return erroApi(err);
  }
}
