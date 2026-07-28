import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { novaQuantidade, motivo, responsavel } = body;

  const nova = Number(novaQuantidade);
  if (Number.isNaN(nova) || nova < 0 || !responsavel) {
    return NextResponse.json({ error: "Quantidade e responsável são obrigatórios" }, { status: 400 });
  }

  try {
    const movimentacao = await prisma.$transaction(async (tx) => {
      const item = await tx.itemEstoque.findUnique({ where: { id } });
      if (!item) throw new Error("ITEM_NAO_ENCONTRADO");

      const diferenca = nova - item.quantidade;
      await tx.itemEstoque.update({ where: { id }, data: { quantidade: nova } });

      if (diferenca === 0) return null;

      return tx.movimentacaoEstoque.create({
        data: {
          itemId: id,
          tipo: "AJUSTE",
          quantidade: diferenca,
          motivo: motivo || "Ajuste de inventário",
          responsavel,
        },
      });
    });

    return NextResponse.json(movimentacao ?? { ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "ITEM_NAO_ENCONTRADO") {
      return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
    }
    return erroApi(err);
  }
}
