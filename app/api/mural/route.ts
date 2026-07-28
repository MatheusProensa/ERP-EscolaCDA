import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const avisos = await prisma.muralAviso.findMany({
    orderBy: [{ fixado: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(avisos);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { titulo, conteudo, fixado } = body;

  if (!titulo || !conteudo) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const aviso = await prisma.muralAviso.create({
    data: {
      titulo,
      conteudo,
      fixado: !!fixado,
      autor: session.user.name ?? "Usuário",
      autorId: session.user.id,
    },
  });

  return NextResponse.json(aviso, { status: 201 });
}
