import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { sala } = body;

  if (!sala) return NextResponse.json({ error: "Sala é obrigatória" }, { status: 400 });

  try {
    const chave = await prisma.chave.update({ where: { id }, data: { sala } });
    return NextResponse.json(chave);
  } catch (err) {
    return erroApi(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  const emprestada = await prisma.emprestimoChave.findFirst({
    where: { chaveId: id, devolucao: null },
  });
  if (emprestada) {
    return NextResponse.json(
      { error: "Chave está emprestada — registre a devolução antes de excluir" },
      { status: 400 }
    );
  }

  try {
    // Soft delete (mesmo padrão do Funcionario.ativo): mantém o histórico de
    // empréstimos ligado, só some da listagem.
    await prisma.chave.update({ where: { id }, data: { ativa: false } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
