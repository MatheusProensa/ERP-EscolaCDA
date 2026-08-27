import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { funcionarioId } = body;

  if (!funcionarioId) return NextResponse.json({ error: "Selecione o responsável pela retirada" }, { status: 400 });

  // Vincula a um Funcionario cadastrado em vez de aceitar nome digitado à mão —
  // evita duplicidade/erro de digitação ("matheus" vs "Matheus Proensa").
  const funcionario = await prisma.funcionario.findUnique({ where: { id: funcionarioId } });
  if (!funcionario || !funcionario.ativo) {
    return NextResponse.json({ error: "Funcionário não encontrado ou inativo" }, { status: 400 });
  }

  const emprestimoAberto = await prisma.emprestimoChave.findFirst({
    where: { chaveId: id, devolucao: null },
  });
  if (emprestimoAberto) {
    return NextResponse.json({ error: "Esta chave já está emprestada" }, { status: 400 });
  }

  const emprestimo = await prisma.emprestimoChave.create({
    data: { chaveId: id, responsavel: funcionario.nome, responsavelFuncionarioId: funcionario.id },
  });

  return NextResponse.json(emprestimo, { status: 201 });
}
