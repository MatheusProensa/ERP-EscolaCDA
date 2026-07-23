import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { tipo, quantidade, motivo } = body;

  const qtd = Number(quantidade);
  if (!tipo || !qtd || qtd <= 0) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const item = await prisma.itemEstoque.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

  if (tipo === "SAIDA" && qtd > item.quantidade) {
    return NextResponse.json({ error: "Quantidade insuficiente em estoque" }, { status: 400 });
  }

  const novaQuantidade = tipo === "ENTRADA" ? item.quantidade + qtd : item.quantidade - qtd;

  const [, movimentacao] = await prisma.$transaction([
    prisma.itemEstoque.update({ where: { id }, data: { quantidade: novaQuantidade } }),
    prisma.movimentacaoEstoque.create({
      data: { itemId: id, tipo, quantidade: qtd, motivo: motivo || null },
    }),
  ]);

  return NextResponse.json(movimentacao, { status: 201 });
}
