import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { tipo, quantidade, motivo, responsavel } = body;

  const qtd = Number(quantidade);
  if (!tipo || (tipo !== "ENTRADA" && tipo !== "SAIDA") || !qtd || qtd <= 0) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  try {
    const movimentacao = await prisma.$transaction(async (tx) => {
      if (tipo === "SAIDA") {
        // Atualização condicional atômica: só decrementa se ainda houver saldo suficiente
        // no momento da escrita, evitando que duas saídas concorrentes leiam a mesma
        // quantidade "antiga" e ambas passem na checagem antes de gravar.
        const resultado = await tx.itemEstoque.updateMany({
          where: { id, quantidade: { gte: qtd } },
          data: { quantidade: { decrement: qtd } },
        });
        if (resultado.count === 0) {
          throw new Error("ESTOQUE_INSUFICIENTE");
        }
      } else {
        const resultado = await tx.itemEstoque.updateMany({
          where: { id },
          data: { quantidade: { increment: qtd } },
        });
        if (resultado.count === 0) {
          throw new Error("ITEM_NAO_ENCONTRADO");
        }
      }

      return tx.movimentacaoEstoque.create({
        data: { itemId: id, tipo, quantidade: qtd, motivo: motivo || null, responsavel: responsavel || null },
      });
    });

    return NextResponse.json(movimentacao, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "ESTOQUE_INSUFICIENTE") {
      return NextResponse.json({ error: "Quantidade insuficiente em estoque" }, { status: 400 });
    }
    if (err instanceof Error && err.message === "ITEM_NAO_ENCONTRADO") {
      return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
    }
    throw err;
  }
}
