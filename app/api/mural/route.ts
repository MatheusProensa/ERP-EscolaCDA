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

  // Aviso fixado é coisa importante — avisa todo mundo, não só quem entrar no mural.
  // Um createMany só (achado da auditoria ago/2026: antes era um insert por
  // usuário, N idas ao banco em vez de 1).
  if (aviso.fixado) {
    const outrosUsuarios = await prisma.user.findMany({
      where: { id: { not: session.user.id } },
      select: { id: true },
    });
    if (outrosUsuarios.length > 0) {
      await prisma.notificacao.createMany({
        data: outrosUsuarios.map((u) => ({
          usuarioId: u.id,
          tipo: "MURAL_FIXADO",
          titulo: `Aviso importante: ${aviso.titulo}`,
          corpo: aviso.conteudo.slice(0, 120),
          link: "/mural",
        })),
      });
    }
  }

  return NextResponse.json(aviso, { status: 201 });
}
