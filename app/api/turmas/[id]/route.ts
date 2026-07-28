import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const turma = await prisma.turma.findUnique({
    where: { id },
    include: {
      anoLetivo: true,
      matriculas: {
        where: { situacao: "ATIVA" },
        include: { aluno: true },
        orderBy: { aluno: { nome: "asc" } },
      },
    },
  });

  if (!turma) return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });

  const vagas = Math.max(0, turma.capacidade - turma.matriculas.length);
  return NextResponse.json({ ...turma, vagas, temVaga: vagas > 0 });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { nome, turno, capacidade } = body;

  try {
    const turma = await prisma.turma.update({
      where: { id },
      data: {
        nome: nome || undefined,
        turno: turno || undefined,
        capacidade: capacidade ? Number(capacidade) : undefined,
      },
    });

    return NextResponse.json(turma);
  } catch (err) {
    return erroApi(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  // Bloqueia se existir QUALQUER matrícula (inclusive histórica) — apagar a turma
  // apagaria esse histórico junto, já que Matricula não tem soft-delete próprio.
  const matriculas = await prisma.matricula.count({ where: { turmaId: id } });
  if (matriculas > 0) {
    return NextResponse.json(
      { error: "Turma tem matrículas (ativas ou não) vinculadas — não é possível excluir" },
      { status: 400 }
    );
  }

  try {
    await prisma.turma.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
