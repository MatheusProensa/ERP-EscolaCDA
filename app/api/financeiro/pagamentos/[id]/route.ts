import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  const pagamento = await prisma.pagamento.findUnique({
    where: { id },
    include: { mensalidade: { include: { pagamentos: true, matricula: { include: { aluno: true } } } } },
  });
  if (!pagamento) return NextResponse.json({ error: "Pagamento não encontrado" }, { status: 404 });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.pagamento.delete({ where: { id } });

      const restante = pagamento.mensalidade.pagamentos
        .filter((p) => p.id !== id)
        .reduce((acc, p) => acc + p.valor, 0);
      const novaSituacao = restante >= pagamento.mensalidade.valor ? "PAGA" : "PENDENTE";

      await tx.mensalidade.update({
        where: { id: pagamento.mensalidadeId },
        data: { situacao: novaSituacao },
      });

      await tx.logAtividade.create({
        data: {
          acao: `Pagamento estornado - ${pagamento.mensalidade.matricula.aluno.nome}`,
          entidade: "Mensalidade",
          entidadeId: pagamento.mensalidadeId,
          usuario: session.user.name ?? "Usuário",
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
