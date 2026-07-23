import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { responsavel } = body;

  if (!responsavel) return NextResponse.json({ error: "Responsável é obrigatório" }, { status: 400 });

  const emprestimoAberto = await prisma.emprestimoChave.findFirst({
    where: { chaveId: id, devolucao: null },
  });
  if (emprestimoAberto) {
    return NextResponse.json({ error: "Esta chave já está emprestada" }, { status: 400 });
  }

  const emprestimo = await prisma.emprestimoChave.create({
    data: { chaveId: id, responsavel },
  });

  return NextResponse.json(emprestimo, { status: 201 });
}
