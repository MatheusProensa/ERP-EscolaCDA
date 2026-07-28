import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const itens = await prisma.itemEstoque.findMany({ orderBy: { nome: "asc" } });
  return NextResponse.json(itens);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { nome, categoria, unidade, quantidade, minimo, localizacao, fornecedor } = body;

  if (!nome || !categoria || !unidade) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const item = await prisma.$transaction(async (tx) => {
    const novoItem = await tx.itemEstoque.create({
      data: {
        nome,
        categoria,
        unidade,
        quantidade: Number(quantidade) || 0,
        minimo: Number(minimo) || 5,
        localizacao: localizacao || null,
        fornecedor: fornecedor || null,
      },
    });

    if (novoItem.quantidade > 0) {
      await tx.movimentacaoEstoque.create({
        data: {
          itemId: novoItem.id,
          tipo: "ENTRADA",
          quantidade: novoItem.quantidade,
          motivo: "Cadastro inicial do item",
        },
      });
    }

    return novoItem;
  });

  return NextResponse.json(item, { status: 201 });
}
