import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const GESTAO = ["ADMIN", "DIRECAO"];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!GESTAO.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { titulo, data, categoria, descricao } = body;

  const evento = await prisma.eventoCalendario.update({
    where: { id },
    data: {
      titulo: titulo || undefined,
      data: data ? new Date(data) : undefined,
      categoria: categoria || undefined,
      descricao: descricao !== undefined ? descricao || null : undefined,
    },
  });
  return NextResponse.json(evento);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!GESTAO.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.eventoCalendario.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
