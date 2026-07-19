import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { mensalidadeId, valor, dataPagamento, formaPagamento, observacao } = body;

  if (!mensalidadeId || !valor || !dataPagamento || !formaPagamento) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const mensalidade = await prisma.mensalidade.findUnique({
    where: { id: mensalidadeId },
    include: { matricula: { include: { aluno: true } } },
  });
  if (!mensalidade) return NextResponse.json({ error: "Mensalidade não encontrada" }, { status: 404 });

  const pagamento = await prisma.$transaction(async (tx) => {
    const novoPagamento = await tx.pagamento.create({
      data: {
        mensalidadeId,
        valor: Number(valor),
        dataPagamento: new Date(dataPagamento),
        formaPagamento,
        observacao: observacao || null,
      },
    });

    await tx.mensalidade.update({
      where: { id: mensalidadeId },
      data: { situacao: "PAGA" },
    });

    await tx.logAtividade.create({
      data: {
        acao: `Pagamento registrado - ${mensalidade.matricula.aluno.nome}`,
        entidade: "Mensalidade",
        entidadeId: mensalidadeId,
        usuario: session.user.name ?? "Usuário",
      },
    });

    return novoPagamento;
  });

  return NextResponse.json(pagamento, { status: 201 });
}
