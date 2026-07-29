import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { data, fruta, almoco, lancheInfantil, lancheFundamental } = body;

  if (!data) {
    return NextResponse.json({ error: "Data obrigatória" }, { status: 400 });
  }

  const campos = {
    fruta: fruta || null,
    almoco: almoco || null,
    lancheInfantil: lancheInfantil || null,
    lancheFundamental: lancheFundamental || null,
  };

  const cardapio = await prisma.cardapio.upsert({
    where: { data: new Date(data) },
    create: { data: new Date(data), ...campos },
    update: campos,
  });

  return NextResponse.json(cardapio, { status: 201 });
}
