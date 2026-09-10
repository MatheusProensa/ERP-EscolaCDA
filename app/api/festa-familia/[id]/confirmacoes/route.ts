import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buscarTurmasComConfirmacoes } from "@/lib/festaFamilia";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const evento = await prisma.eventoFamilia.findUnique({ where: { id } });
  if (!evento) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });

  const turmas = await buscarTurmasComConfirmacoes(evento.anoLetivoId, id);
  return NextResponse.json({ evento, turmas });
}
