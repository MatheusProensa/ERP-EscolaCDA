import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { nome, categoria, unidade, minimo } = body;

  const item = await prisma.itemEstoque.update({
    where: { id },
    data: {
      nome: nome || undefined,
      categoria: categoria || undefined,
      unidade: unidade || undefined,
      minimo: minimo !== undefined ? Number(minimo) : undefined,
    },
  });

  return NextResponse.json(item);
}
