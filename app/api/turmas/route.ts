import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const turmas = await prisma.turma.findMany({
    include: { _count: { select: { matriculas: { where: { situacao: "ATIVA" } } } } },
    orderBy: { nome: "asc" },
  });

  const resultado = turmas.map((t) => {
    const matriculados = t._count.matriculas;
    const vagas = Math.max(0, t.capacidade - matriculados);
    return { ...t, vagas, temVaga: vagas > 0 };
  });

  return NextResponse.json(resultado);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { nome, turno, capacidade } = body;

  if (!nome || !turno) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const anoLetivo = await getAnoLetivoAtivo();
  if (!anoLetivo) return NextResponse.json({ error: "Nenhum ano letivo ativo" }, { status: 400 });

  const turma = await prisma.turma.create({
    data: {
      nome,
      turno,
      capacidade: Number(capacidade) || 25,
      anoLetivoId: anoLetivo.id,
    },
  });

  return NextResponse.json(turma, { status: 201 });
}
