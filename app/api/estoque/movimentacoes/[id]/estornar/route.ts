import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const responsavel = body.responsavel || session.user.name || "Usuário";

  try {
    const estorno = await prisma.$transaction(async (tx) => {
      const mov = await tx.movimentacaoEstoque.findUnique({ where: { id } });
      if (!mov) throw new Error("MOVIMENTACAO_NAO_ENCONTRADA");
      if (mov.anulada) throw new Error("JA_ANULADA");
      if (mov.tipo === "ESTORNO") throw new Error("NAO_PODE_ANULAR_ESTORNO");

      // O efeito no saldo é o inverso do original: entrada devolve (saída negativa),
      // saída devolve (entrada), ajuste desfaz a diferença aplicada.
      const efeitoInverso = -mov.quantidade;

      const resultado = await tx.itemEstoque.updateMany({
        where: { id: mov.itemId, quantidade: { gte: Math.max(0, -efeitoInverso) } },
        data: { quantidade: { increment: efeitoInverso } },
      });
      if (resultado.count === 0) {
        throw new Error("ESTOQUE_INSUFICIENTE_PARA_ESTORNO");
      }

      await tx.movimentacaoEstoque.update({ where: { id }, data: { anulada: true } });

      return tx.movimentacaoEstoque.create({
        data: {
          itemId: mov.itemId,
          tipo: "ESTORNO",
          quantidade: efeitoInverso,
          motivo: `Estorno da movimentação #${mov.id.slice(-6)}`,
          responsavel,
          refId: mov.id,
        },
      });
    });

    return NextResponse.json(estorno, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "MOVIMENTACAO_NAO_ENCONTRADA") {
      return NextResponse.json({ error: "Movimentação não encontrada" }, { status: 404 });
    }
    if (err instanceof Error && err.message === "JA_ANULADA") {
      return NextResponse.json({ error: "Esta movimentação já foi estornada" }, { status: 400 });
    }
    if (err instanceof Error && err.message === "NAO_PODE_ANULAR_ESTORNO") {
      return NextResponse.json({ error: "Não é possível estornar um estorno" }, { status: 400 });
    }
    if (err instanceof Error && err.message === "ESTOQUE_INSUFICIENTE_PARA_ESTORNO") {
      return NextResponse.json(
        { error: "Estoque atual insuficiente para desfazer esta movimentação" },
        { status: 400 }
      );
    }
    return erroApi(err);
  }
}
