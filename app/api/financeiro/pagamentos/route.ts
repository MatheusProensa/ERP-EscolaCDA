import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { mensalidadeId, valor, dataPagamento, formaPagamento, observacao } = body;

  const valorNumerico = Number(valor);
  if (!mensalidadeId || !valor || Number.isNaN(valorNumerico) || valorNumerico <= 0 || !dataPagamento || !formaPagamento) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes ou valor inválido" }, { status: 400 });
  }

  const mensalidade = await prisma.mensalidade.findUnique({
    where: { id: mensalidadeId },
    include: { matricula: { include: { aluno: true } }, pagamentos: true },
  });
  if (!mensalidade) return NextResponse.json({ error: "Mensalidade não encontrada" }, { status: 404 });

  // Só marca como PAGA quando a soma dos pagamentos (incluindo este) cobre o valor devido —
  // um pagamento parcial mantém a mensalidade em aberto com o saldo restante.
  const jaPago = mensalidade.pagamentos.reduce((acc, p) => acc + p.valor, 0);
  const totalPago = jaPago + valorNumerico;
  const novaSituacao = totalPago >= mensalidade.valor ? "PAGA" : "PENDENTE";

  try {
    const pagamento = await prisma.$transaction(async (tx) => {
      const novoPagamento = await tx.pagamento.create({
        data: {
          mensalidadeId,
          valor: valorNumerico,
          dataPagamento: new Date(dataPagamento),
          formaPagamento,
          observacao: observacao || null,
        },
      });

      await tx.mensalidade.update({
        where: { id: mensalidadeId },
        data: { situacao: novaSituacao },
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
  } catch (err) {
    return erroApi(err);
  }
}
