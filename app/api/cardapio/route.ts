import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { data, almoco, lanche } = body;

  if (!data || !almoco) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const cardapio = await prisma.cardapio.upsert({
    where: { data: new Date(data) },
    create: { data: new Date(data), almoco, lanche: lanche || null },
    update: { almoco, lanche: lanche || null },
  });

  return NextResponse.json(cardapio, { status: 201 });
}
