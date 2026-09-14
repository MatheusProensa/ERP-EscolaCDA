import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GESTAO } from "@/lib/permissoes";

/** Quem já confirmou a leitura de um aviso e quem ainda falta — resolve o
 * pedido real da coordenadora pedagógica (achado no Drive dela, out/2026):
 * hoje ela pede "reajam esse e-mail" só pra saber quem ficou ciente, sem
 * conseguir ver quem especificamente ainda não viu. Só quem gerencia o mural
 * (Admin/Direção ou o próprio autor do aviso) vê essa lista — os nomes de
 * quem NÃO leu não são informação pra qualquer um. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const aviso = await prisma.muralAviso.findUnique({ where: { id }, select: { autorId: true } });
  if (!aviso) return NextResponse.json({ error: "Aviso não encontrado" }, { status: 404 });

  const ehGestao = GESTAO.includes(session.user.role as (typeof GESTAO)[number]);
  if (!ehGestao && aviso.autorId !== session.user.id) {
    return NextResponse.json({ error: "Só quem publicou o aviso (ou Admin/Direção) vê quem leu" }, { status: 403 });
  }

  const [todos, leituras] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.avisoLeitura.findMany({ where: { avisoId: id }, select: { userId: true } }),
  ]);
  const leramIds = new Set(leituras.map((l) => l.userId));

  return NextResponse.json({
    leram: todos.filter((u) => leramIds.has(u.id)),
    naoLeram: todos.filter((u) => !leramIds.has(u.id)),
  });
}
