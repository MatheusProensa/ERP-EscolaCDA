import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { nome, categoria, unidade, minimo, localizacao, fornecedor } = body;

  try {
    const item = await prisma.itemEstoque.update({
      where: { id },
      data: {
        nome: nome || undefined,
        categoria: categoria || undefined,
        unidade: unidade || undefined,
        minimo: minimo !== undefined ? Number(minimo) : undefined,
        localizacao: localizacao !== undefined ? localizacao || null : undefined,
        fornecedor: fornecedor !== undefined ? fornecedor || null : undefined,
      },
    });

    return NextResponse.json(item);
  } catch (err) {
    return erroApi(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.$transaction([
      prisma.movimentacaoEstoque.deleteMany({ where: { itemId: id } }),
      prisma.itemEstoque.delete({ where: { id } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
