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
  const { situacao } = body;

  if (!situacao || !SITUACOES.includes(situacao)) {
    return NextResponse.json({ error: "Situação inválida" }, { status: 400 });
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
