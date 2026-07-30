import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  const mensalidade = await prisma.mensalidade.findUnique({
    where: { id },
    include: { pagamentos: true, matricula: { include: { aluno: true } } },
  });
  if (!mensalidade) return NextResponse.json({ error: "Mensalidade não encontrada" }, { status: 404 });

  if (mensalidade.pagamentos.length > 0) {
    return NextResponse.json(
      { error: "Não é possível excluir uma mensalidade que já recebeu pagamento — estorne o pagamento primeiro" },
      { status: 400 }
    );
  }

  try {
    await prisma.mensalidade.delete({ where: { id } });

    await prisma.logAtividade.create({
      data: {
        acao: `Mensalidade excluída - ${mensalidade.matricula.aluno.nome}`,
        entidade: "Mensalidade",
        entidadeId: id,
        usuario: session.user.name ?? "Usuário",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { valor, vencimento, descricao } = body;

  const mensalidade = await prisma.mensalidade.findUnique({ where: { id }, include: { pagamentos: true } });
  if (!mensalidade) return NextResponse.json({ error: "Mensalidade não encontrada" }, { status: 404 });

  if (valor !== undefined && mensalidade.pagamentos.length > 0) {
    return NextResponse.json(
      { error: "Não é possível alterar o valor de uma mensalidade que já recebeu pagamento" },
      { status: 400 }
    );
  }

  const valorNumerico = valor !== undefined ? Number(valor) : undefined;
  if (valorNumerico !== undefined && (Number.isNaN(valorNumerico) || valorNumerico <= 0)) {
    return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
  }

  try {
    const atualizada = await prisma.mensalidade.update({
      where: { id },
      data: {
        valor: valorNumerico,
        vencimento: vencimento ? new Date(vencimento) : undefined,
        descricao: descricao !== undefined ? descricao || null : undefined,
      },
    });

    return NextResponse.json(atualizada);
  } catch (err) {
    return erroApi(err);
  }
}
