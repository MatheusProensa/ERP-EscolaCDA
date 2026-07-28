import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const [notificacoes, naoLidas] = await Promise.all([
    prisma.notificacao.findMany({
      where: { usuarioId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notificacao.count({ where: { usuarioId: session.user.id, lida: false } }),
  ]);

  return NextResponse.json({ notificacoes, naoLidas });
}

export async function PATCH() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  await prisma.notificacao.updateMany({
    where: { usuarioId: session.user.id, lida: false },
    data: { lida: true },
  });

  return NextResponse.json({ ok: true });
}
